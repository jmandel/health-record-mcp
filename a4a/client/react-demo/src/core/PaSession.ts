import mitt from "mitt";
import { A2AClient } from "@jmandel/a2a-client/src/A2AClientV2";
import type { Message, Task, Artifact } from "@jmandel/a2a-client/src/types";
import type { Answer, ClinicianQuestion, ProposedSnippet, ScratchpadBlock } from "../types/priorAuthTypes";
import { MiniEngine } from "../engine/MiniEngine";
import type { PackageBundle } from "../engine/engineTypes";
import type { EhrSearchFn } from "../hooks/useEhrSearch";
import { buildEvidence } from "../utils/buildEvidence";
import type { FullEHR } from "../EhrApp";

/** visible to React or other callers */
export type PaPhase = 
    "idle" | 
    "waitingUser" | 
    "running" | 
    "submittingAnswers" | 
    "awaitingAgentResponse" | // Renamed from done
    "finalized" |             // New terminal state on task completion
    "error";

/** lightweight emitter just for store subscribers */
type PaEvt = { update: void };

// --- NEW: Type for search history entry ---
export interface SearchHistoryEntry {
    keywords: string[];
    timestamp: number;
}

// --- NEW: Define a potential structure for Approval Data ---
// Based on the sample provided
export interface ApprovalData {
    status?: string;
    reason?: string;
    approvalReferenceNumber?: string;
    timestamp?: string;
    digitalSignature?: string;
    // Add other potential fields
}

export class PaSession {
  /* ── public readonly handles ─────────────────────────────── */
  readonly id: string;
  readonly client: A2AClient;

  /* ── observable state ────────────────────────────────────── */
  phase: PaPhase = "idle";
  openQs: ClinicianQuestion[] = [];
  bundle: PackageBundle | null = null;
  lastError: string | null = null; // Store last error message
  endorsedSnippets: Record<string, { title: string; content: string }> = {};
  searchHistory: SearchHistoryEntry[] = [];
  updateCounter: number = 0;
  // --- NEW: Store the final task object for inspection --- 
  finalTaskState: Task | null = null; 
  // --- NEW: Store A2A Task History --- 
  taskHistory: Message[] = []; 
  // --- NEW: Store Scratchpad Blocks --- 
  scratchpad: ScratchpadBlock[] = [];
  // --- NEW: Store Artifacts and Approval Data --- 
  artifacts: Artifact[] = [];
  approvalData: ApprovalData | null = null;
  // --- NEW: Store Full EHR Data --- 
  private fullEhrData: FullEHR | null = null;

  /* ── tiny emitter for React subscriptions ────────────────── */
  private em = mitt<PaEvt>();
  subscribe = (cb: () => void): (() => void) => { 
    this.em.on("update", cb);
    return () => this.em.off("update", cb);
  }
  // Increment counter on bump
  private bump = () => {
      this.updateCounter++;
      this.em.emit("update");
  }

  /* ── mini engine instance ────────────────────────────────── */
  private eng: MiniEngine;

  constructor(
    id: string,
    agentUrl: string,
    apiKey: string, // Add apiKey
    ehrSearch: EhrSearchFn, // Add ehrSearch
    patientDetails: string, // Add initial context
    treatment: string,      // Add initial context
    indication: string,     // Add initial context
    fullEhrData: FullEHR | null, // <-- Add FullEHR data parameter
    firstMsg: Message | undefined // firstMsg is now optional
  ) {
    this.id = id;
    this.fullEhrData = fullEhrData; // <-- Store EHR data
    this.client = firstMsg
      ? A2AClient.start(agentUrl, { id, message: firstMsg }, { getAuthHeaders: async () => ({}) }) // Make auth async
      : A2AClient.resume(agentUrl, id, { getAuthHeaders: async () => ({}) }); // Make auth async

    /* create engine with live callbacks */
    this.eng = new MiniEngine(
      // onAsk
      qs => {
        console.log(`[PaSession ${this.id}] Engine onAsk:`, qs);
        this.phase = "waitingUser";
        this.openQs = qs;
        this.lastError = null; // Clear error on new questions
        this.bump();
      },
      // onPack: Uses buildEvidence before sending
      async (pkg) => { 
        console.log(`[PaSession ${this.id}] Engine onPack:`, pkg);
        this.bundle = pkg; // Store the engine's bundle output
        this.openQs = []; 
        this.lastError = null;

        // --- Call buildEvidence --- 
        let evidencePayload;
        try {
            // --- Create the expected input for buildEvidence --- 
            const snippetsForBuildEvidence: Record<string, { title: string; content: string; endorsed: boolean; }> = {};
            Object.entries(this.endorsedSnippets).forEach(([key, data]) => {
                snippetsForBuildEvidence[key] = { ...data, endorsed: true };
            });
            // ------------------------------------------------
            evidencePayload = buildEvidence({
                criteriaTree: pkg.criteriaTree, 
                endorsedSnippets: snippetsForBuildEvidence, // Pass correctly typed snippets
                fullEhrData: this.fullEhrData, 
                treatment: "", // TODO: Pass actual treatment/indication if needed 
                indication: ""
            });
            console.log(`[PaSession ${this.id}] Called buildEvidence successfully.`);
        } catch (buildErr) {
            console.error(`[PaSession ${this.id}] Error calling buildEvidence:`, buildErr);
            this.phase = 'error';
            this.lastError = `Error preparing evidence package: ${buildErr instanceof Error ? buildErr.message : String(buildErr)}`;
            this.bump();
            return; // Stop if evidence building fails
        }
        
        // --- Automatically send the BUILD EVIDENCE result --- 
        try {
            const message: Message = {
                role: "user",
                parts: [
                    // Part 1: criteriaMetTree from buildEvidence output
                    { type: "data", data: evidencePayload.criteriaMetTree }, 
                    // Part 2: filteredEhr from buildEvidence output
                    { type: "data", data: evidencePayload.filteredEhr } 
                ]
            };
            console.log(`[PaSession ${this.id}] Automatically sending final evidence package message...`);
            await this.client.send(message);
            console.log(`[PaSession ${this.id}] Final evidence package message sent automatically.`);
            this.phase = 'awaitingAgentResponse'; // Transition after successful send
        } catch (sendErr) {
            console.error(`[PaSession ${this.id}] Error automatically sending final evidence package:`, sendErr);
            this.phase = 'error'; 
            this.lastError = `Error sending final package: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}`;
        }
        this.bump(); // Update UI after sending attempt
        // ------------------------------------
      },
      // onErr
      (msg, fatal) => {
        console.warn(`[PaSession ${this.id}] Engine Error: ${msg}`);
        this.lastError = msg;
        if (fatal) {
          this.phase = "error"; // Engine error, transition to error
          this.openQs = []; // Clear questions on fatal error
          this.bump();
        }
        // Non-fatal errors are just logged via console.warn
      },
      // --- NEW: onSearch callback implementation --- 
      (keywords: string[]) => {
          console.log(`[PaSession ${this.id}] Engine initiated search:`, keywords);
          this.searchHistory = [...this.searchHistory, { keywords, timestamp: Date.now() }];
          this.bump(); // Notify UI about the search history update
      },
      // --- NEW: onScratchpadUpdate implementation --- 
      (blocks: ScratchpadBlock[]) => {
           console.log(`[PaSession ${this.id}] Engine updated scratchpad:`, blocks.length, 'blocks');
           // Basic check if content changed to avoid unnecessary bumps 
           // (could be improved with deep comparison if needed)
           if (JSON.stringify(blocks) !== JSON.stringify(this.scratchpad)) {
               this.scratchpad = blocks;
               this.bump(); 
           }
       },
      // -----------------------------------------
      apiKey,    // Pass apiKey to engine
      ehrSearch  // Pass ehrSearch to engine
    );

    // Set initial context in the engine
    this.eng.setContext(patientDetails, treatment, indication);

    // Set initial phase based on whether we are starting or resuming
    this.phase = firstMsg ? "running" : "idle"; // Start in 'running', resume starts 'idle' until first task update
    this.bump(); // Initial state update

    /* wire task-update stream into engine */
    this.client.on("task-update", (t: Task) => {
      console.log(`[PaSession ${this.id}] Task Update Received. Status: ${t.status.state}, Current Phase: ${this.phase}`);
      
      let stateChanged = false;
      let historyChanged = false;
      let artifactsChanged = false;
      let approvalFound = false;

      // --- Update Task History --- 
      const newHistory = t.history || [];
      if (JSON.stringify(newHistory) !== JSON.stringify(this.taskHistory)) { // More robust check
          this.taskHistory = newHistory;
          historyChanged = true;
          console.log(`[PaSession ${this.id}] Updated task history.`);
      }
      
      // --- Update Artifacts & Check for Approval --- 
      const newArtifacts = t.artifacts || [];
      if (JSON.stringify(newArtifacts) !== JSON.stringify(this.artifacts)) { // More robust check
          console.log(`[PaSession ${this.id}] Updating artifacts.`);
          this.artifacts = newArtifacts;
          artifactsChanged = true;
          // Check *new* artifact list for approval
          for (const artifact of newArtifacts) {
              if (artifact.name?.toLowerCase().includes('approval')) {
                  console.log(`[PaSession ${this.id}] Found potential approval artifact:`, artifact.name);
                  const dataPart = artifact.parts?.find(p => p.type === 'data');
                  if (dataPart?.type === 'data') { // Type guard
                      this.approvalData = dataPart.data as ApprovalData; // Store approval data
                      approvalFound = true;
                      console.log(`[PaSession ${this.id}] Stored approval data:`, this.approvalData);
                      break; // Assume only one approval artifact needed
                  }
              }
          }
      }
      // ------------------------------------

      // Check for terminal task states FIRST
      const isTerminalState = ['completed', 'failed', 'canceled'].includes(t.status.state);
      if (isTerminalState) {
          // Only update if not already in a final state
          if (this.phase !== 'finalized' && this.phase !== 'error') { 
              console.log(`[PaSession ${this.id}] Task reached terminal state: ${t.status.state}.`);
              this.finalTaskState = t; // Store the final task object
              if (this.approvalData && t.status.state === 'completed') {
                  this.phase = 'finalized';
              } else if (t.status.state === 'completed') {
                  this.phase = 'finalized'; // Finalized even without specific approval artifact
              } else { // failed or canceled
                  this.phase = 'error';
                  this.lastError = `Task ${t.status.state}. Check agent artifacts/history.`;
              }
              this.openQs = []; // Clear any open questions
              stateChanged = true;
          }
          // Bump if anything changed
          if (historyChanged || artifactsChanged || stateChanged || approvalFound) this.bump();
          return; // Don't process agent messages if task is finished
      }

      // Process agent messages if the task is NOT in a terminal state
      const lastAgentMsg = t.history?.filter(m => m.role === 'agent').at(-1);
      if (lastAgentMsg && t.status.state === "input-required") {
          console.log(`[PaSession ${this.id}] Processing agent message while in phase: ${this.phase}`);
          this.eng.onAgent(lastAgentMsg);
      }
      this.bump();
    });
    
    this.client.on("error", (err: any) => {
        let stateChanged = false;
        if (this.phase !== 'finalized' && this.phase !== 'error') {
          console.error(`[PaSession ${this.id}] A2AClient Error:`, err);
          this.phase = 'error';
          this.lastError = err instanceof Error ? err.message : String(err);
          this.openQs = [];
          stateChanged = true;
        }
        if (stateChanged) this.bump();
    });

    this.client.on("close", () => {
        let stateChanged = false;
        if (this.phase !== 'finalized' && this.phase !== 'error') {
             console.warn(`[PaSession ${this.id}] Connection closed unexpectedly. Setting phase to error.`);
             this.phase = 'error';
             this.lastError = 'A2A connection closed unexpectedly.';
             this.openQs = [];
             stateChanged = true;
        }
        if (stateChanged) this.bump();
    });

  }

  /** called by UI when all questions are answered */
  async answer(a: Record<string, Answer>): Promise<void> {
    if (this.phase !== 'waitingUser') {
        console.warn(`[PaSession ${this.id}] 'answer' called in incorrect phase: ${this.phase}`);
        return;
    }

    let snippetsUpdated = false;
    const nextSnippets = { ...this.endorsedSnippets }; 
    Object.entries(a).forEach(([questionId, answerData]) => {
        const snippetText = answerData.snippet?.trim();
        // --- Find corresponding question to get snippet title --- 
        // This assumes openQs still holds the questions being answered.
        // A more robust approach might involve passing questions along with answers.
        const question = this.openQs.find(q => q.id === questionId);
        let snippetTitle = `Snippet QID: ${questionId}`; // Default title
        if (question) {
            // Try to find a more descriptive title from options or question label
            if (answerData.value && (question.questionType === 'boolean' || question.questionType === 'multipleChoice')) {
                snippetTitle = question.options?.find(o => o.label === answerData.value)?.proposedSnippet?.title || question.label;
            } else {
                snippetTitle = question.label; // Fallback to question label
            }
        }
        // ----------------------------------------------------

        if (snippetText) { 
            // --- Store title with content --- 
            const currentSnippet = nextSnippets[questionId];
            if (!currentSnippet || currentSnippet.content !== snippetText || currentSnippet.title !== snippetTitle) {
                 nextSnippets[questionId] = { title: snippetTitle, content: snippetText };
                 snippetsUpdated = true;
                 console.log(`[PaSession ${this.id}] Endorsed snippet for QID: ${questionId}`);
            }
        } else {
             if (nextSnippets[questionId]) {
                 delete nextSnippets[questionId];
                 snippetsUpdated = true;
                 console.log(`[PaSession ${this.id}] Removed endorsed snippet for QID: ${questionId}`);
             }
        }
    });
    if (snippetsUpdated) {
        this.endorsedSnippets = nextSnippets;
    }
    this.phase = 'submittingAnswers'; 
    this.openQs = []; // Clear open questions *after* extracting titles      
    this.bump(); 
    try {
        await this.eng.onUser(a); 
    } catch (e) {
        console.error(`[PaSession ${this.id}] Error during engine.onUser:`, e);
        this.phase = 'error'; 
        this.lastError = e instanceof Error ? e.message : String(e);
        this.bump(); 
    }
  }

  cancel() { 
      console.log(`[PaSession ${this.id}] Cancelling task via client.`);
      this.client.cancel().catch(e => {
           console.error(`[PaSession ${this.id}] Error cancelling task via client:`, e);
           // Transition to error immediately if cancel call fails
           if (this.phase !== 'finalized' && this.phase !== 'error') {
               this.phase = 'error';
               this.lastError = `Error cancelling task: ${e instanceof Error ? e.message : String(e)}`;
               this.bump();
           }
      }); 
  }  
}
