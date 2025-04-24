import type { Message } from "@a2a/client/src/types";
import type { Content } from "@google/genai";
import type { Answer, ClinicianQuestion, ProposedSnippet as Snippet, ScratchpadBlock } from "../types/priorAuthTypes";
import type { PackageBundle } from "./engineTypes";
import * as llmPipeline from "../utils/llmPipeline";
import { SYSTEM_PROMPT, type LlmTurn } from "../utils/llmPipeline";
import type { EhrSearchFn } from "../hooks/useEhrSearch";

// Define internal engine phases (distinct from PaSession phases)
type EnginePhase = "idle" | "waitingUser" | "running" | "done" | "error";

// --- Define the System Prompt directly in MiniEngine ---
const MINI_ENGINE_SYSTEM_PROMPT = `...`; // Keep prompt definition (shortened for brevity)

/** THREE-PHASE async engine — revised to manage history */
export class MiniEngine {
  // Use internal phase for engine logic
  private phase: EnginePhase = "idle";
  private history: Content[] = [];
  private apiKey: string;
  private ehrSearch: EhrSearchFn;

  // Initial context needed for the first LLM call
  private patientDetails: string = "";
  private treatment: string = "";
  private indication: string = "";

  /* external observers plug these in during construction */
  constructor(
    private onAsk: (qs: ClinicianQuestion[]) => void,
    private onPack: (pkg: PackageBundle) => void,
    private onErr: (msg: string, fatal?: boolean) => void,
    private onSearch: (keywords: string[]) => void,
    private onScratchpadUpdate: (blocks: ScratchpadBlock[]) => void,
    apiKey: string,
    ehrSearch: EhrSearchFn
  ) {
    this.apiKey = apiKey;
    this.ehrSearch = ehrSearch;
  }

  /** Sets initial context before the first agent message arrives */
  setContext(patientDetails: string, treatment: string, indication: string): void {
    this.patientDetails = patientDetails;
    this.treatment = treatment;
    this.indication = indication;
  }

  /** feed every NEW agent message here */
  async onAgent(msg: Message): Promise<void> {
    console.log(`[MiniEngine] Received agent message. Current engine phase: ${this.phase}`);

    // Check if the message has parts we can process (text or file)
    const agentText = msg.parts?.filter(p => p.type === "text").map(p => p.text).join("\n");
    const policyPart = msg.parts?.find(
      p => p.type === "file" && p.file?.mimeType === "text/markdown"
    );
    const policyBytes = (policyPart?.type === 'file') ? policyPart.file?.bytes : null;

    // --- Construct the content to add to history ---
    let agentContentParts: Content['parts'] = [];
    if (agentText) {
      agentContentParts.push({ text: `Response from PA Agent: <response>${agentText}</response>` });
    }
    if (policyBytes) {
      // Include policy only if it's the *first* time (history is empty)
      // Or adjust this logic if policy can be re-sent meaningfully
      if (this.history.length === 0) {
        agentContentParts.push({ inlineData: { data: policyBytes, mimeType: 'text/markdown' } });
      } else {
        console.warn("[MiniEngine] Ignoring policy file in subsequent agent message.");
      }
    }

    // If no processable content, do nothing
    if (agentContentParts.length === 0) {
      console.log("[MiniEngine] Agent message had no processable text or initial policy file.");
      return;
    }

    try {
      this.phase = "running";
      if (this.history.length === 0) {
        const initialUserContent: Content = {
          role: 'user',
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n## Patient & Request\n${this.patientDetails}\n\nTreatment: ${this.treatment}\nIndication: ${this.indication}` },
            ...(policyBytes ? [{ inlineData: { data: policyBytes, mimeType: 'text/markdown' } }] : [])
          ]
        };
        // --- Push agent text part directly ---
        this.history = [initialUserContent];
      } else {
        this.history.push({ role: 'user', parts: agentContentParts });
      }

      const turnResult = await llmPipeline.next(this.history, this.apiKey);
      this.history = turnResult.history;
      await this.handleTurn(turnResult.turn);

    } catch (e) { this.fail(e); }
  }

  /** feed clinician answers here */
  async onUser(answers: Record<string, Answer>): Promise<void> {
    // Allow answering only when waitingUser or potentially after engine done?
    // Let's stick to waitingUser for now.
    if (this.phase !== "waitingUser") {
      this.onErr(`Answers received while engine in phase '${this.phase}', ignored`, false);
      return;
    }
    try {
      this.phase = "running"; // Indicate processing
      // Append user answers to history
      this.history.push({ role: 'user', parts: [{ text: JSON.stringify({ answers }) }] });

      // Call next pipeline step
      const nextTurnResult = await llmPipeline.next(this.history, this.apiKey);

      // Update history with the LLM's response
      this.history = nextTurnResult.history;

      // Process the result
      await this.handleTurn(nextTurnResult.turn);

    } catch (e) { this.fail(e); }
  }

  /* ───── internal helpers ─────────────────────────────────── */

  /** Processes an LlmTurn, handles actions, and updates state */
  private async handleTurn(turn: LlmTurn): Promise<void> {
    console.log(`[MiniEngine] Handling turn. Current engine phase: ${this.phase}`, turn);

    // --- NEW: Update scratchpad via callback FIRST ---
    if (turn.scratchpad) {
      this.onScratchpadUpdate(turn.scratchpad);
    }
    // --------------------------------------------------

    // --- Handle EHR Search Action --- (Recursive step)
    if (turn.nextAction?.action === 'searchEHR') {
      const keywords = turn.nextAction.searchEHR!.keywords;
      this.onSearch(keywords);
      console.log('[MiniEngine] Performing EHR search for:', keywords);
      const searchResult = await this.ehrSearch(keywords);
      this.history.push({ role: 'user', parts: [{ text: searchResult.md }] });
      const nextTurnResult = await llmPipeline.next(this.history, this.apiKey);
      this.history = nextTurnResult.history;
      await this.handleTurn(nextTurnResult.turn);
      return;
    }

    // --- Handle Ask Clinician ---
    if (turn.clinicianCommunication?.length) {
      this.phase = "waitingUser"; // Set engine phase
      this.onAsk(turn.clinicianCommunication);
      return;
    }

    // --- Handle Conclude Success ---
    if (turn.nextAction?.action === 'concludeSuccess' && turn.nextAction.concludeSuccess) {
      const snippets: Snippet[] = turn.endorsedSnippets ?
        Object.values(turn.endorsedSnippets)
          .filter((s: { title: string; content: string; endorsed: boolean }) => s.endorsed)
          .map((s: { title: string; content: string; endorsed: boolean }) => ({ title: s.title, content: s.content }))
        : [];

      const bundle: PackageBundle = {
        criteriaTree: turn.nextAction.concludeSuccess.criteriaMetTree,
        snippets: snippets
      };
      this.phase = "done"; // Set engine phase
      this.onPack(bundle);
      return;
    }

    // --- Handle Implicit Fail / Error ---
    console.warn("[MiniEngine] Workflow ended without explicit success or further questions.")
    // Don't necessarily fail PaSession, maybe engine just has nothing more to do?
    // Let PaSession decide based on A2A task status. We'll just stop the engine flow.
    this.phase = "done"; // Or maybe "idle"? Let's use "done" to indicate it finished processing THIS turn.
    // Do NOT call onErr here unless the LLM itself indicated failure.
    // this.fail("Workflow ended without explicit success or further questions.");
  }

  private fail(err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[MiniEngine] Failing due to error:", error);
    this.phase = "error"; // Set engine phase
    this.onErr(error.message, true); // Call PaSession's error handler
  }
}
