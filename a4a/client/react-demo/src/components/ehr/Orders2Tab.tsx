import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Remove ShadCN imports
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Textarea } from "@/components/ui/textarea";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Content, GoogleGenAI } from "@google/genai"; // Use @google/genai and added Content type
import { useEhrContext } from "../../context/EhrContext"; // Adjust path if needed
import { grepRecordLogic } from '../../tools'; // Adjust path as needed
// import { createFhirRenderer } from '../../fhirToPlaintext'; // Added import
// import { FullEHR } from '../../EhrApp'; // Adjust path as needed

// ---------- 1. DATA MODELS (from prompt) ----------
export interface Evidence { fhirSource?: string; text: string; }
export interface ConditionNode { label: string; operator?: "AND" | "OR"; conditions?: ConditionNode[]; evidence?: Evidence[]; }
export interface ProposedSnippet { title: string; content: string; locationSuggestion?: string; }
export interface QuestionOption { label: string; proposedSnippet?: ProposedSnippet; }
// Add NumericRange type
export interface NumericRange { min?: number; max?: number; units?: string; proposedSnippetIfWithinRange?: ProposedSnippet; }
export interface ClinicianQuestion {
  id: string;
  label: string;
  explanation: string;
  // Updated questionType to include numeric and freeText
  questionType: "boolean" | "multipleChoice" | "numeric" | "freeText"; 
  text: string;
  options?: QuestionOption[]; // For boolean/multipleChoice
  numericRange?: NumericRange; // For numeric
}
export interface Attachment { fhirSource?: string; text: string; }

export interface ActionRequest {
    action: "searchEHR" | "evaluateJS" | "clinicianCommunication" | "concludeSuccess" | "concludeFailure";
    timestamp: string;
    searchEHR?: { keywords: string[]; maxSnippets?: number; };
    evaluateJS?: { code: string; description?: string; };
    clinicianCommunication?: ClinicianQuestion[];
    concludeSuccess?: { payer: string; policyId: string; treatment: string; indication: string; criteriaMetTree: ConditionNode; attachments?: Attachment[]; };
    concludeFailure?: { reason: string; unmetCriteriaTree: ConditionNode; attachments?: Attachment[]; };
}

const SYSTEM_PROMPT = `
<policy>
$POLICY_MARKDOWN
</policy>

interface ActionRequest {
  action: "searchEHR" | "evaluateJS" | "clinicianCommunication" | "concludeSuccess" | "concludeFailure";
  timestamp: string; // ISO date-time
  searchEHR?: {
    keywords: string[];
    maxSnippets?: number;
  };
  evaluateJS?: {
    code: string;
    description?: string;
  };
  clinicianCommunication?: ClinicianQuestion[];
  concludeSuccess?: {
    payer: string;
    policyId: string;
    treatment: string;
    indication: string;
    criteriaMetTree: ConditionNode;
    attachments?: Attachment[];
  };
  concludeFailure?: {
    reason: string;
    unmetCriteriaTree: ConditionNode;
    attachments?: Attachment[];
  };
}

interface ConditionNode {
  label: string;
  operator?: "AND" | "OR"; // Required if conditions are present
  conditions?: ConditionNode[]; // Sub-conditions
  evidence?: Evidence[]; // Optional evidence supporting this node
}

interface Evidence {
  fhirSource?: string; // Format "ResourceType/ID", e.g., "Observation/12345"
  text: string; // Explanation or snippet supporting this condition
}

interface Attachment {
  fhirSource?: string; // Format "ResourceType/ID"
  text: string;
}

interface ClinicianQuestion {
  id: string;
  label: string;
  explanation: string;
  questionType: "boolean" | "multipleChoice" | "numeric" | "freeText";
  text: string;
  options?: QuestionOption[]; // Required for multipleChoice
  numericRange?: NumericRange; // Required for numeric
}

interface QuestionOption {
  label: string;
  proposedSnippet?: ProposedSnippet; // Optional documentation triggered by answer
}

interface NumericRange {
  min?: number;
  max?: number;
  units?: string;
  proposedSnippetIfWithinRange?: ProposedSnippet;
}

interface ProposedSnippet {
  title: string;
  content: string;
  locationSuggestion?: string;
}

---

📝 **Detailed System Prompt (Enhanced with Inline JSON Examples)**

Your role is to support medical decision-making by meticulously assessing a patient's EHR data, ensuring clinical requirements, documentation criteria, and contraindications are thoroughly evaluated. Your goal is to proactively reach a definitive conclusion, while minimizing clinician workload and reducing the risk of accidental documentation pitfalls.

### ✅ **Core Responsibilities:**

1. **Analyze Patient EHR Data**
   - Extract relevant evidence directly from the patient's EHR, referencing precise FHIR resources whenever possible.

2. **Assess Clinical Criteria**
   - Construct clearly nested, logical decision trees of medical necessity criteria (\`ConditionNode\`), explicitly supported by documented evidence (\`Evidence\`).

3. **Identify Documentation Gaps**
   - Recognize when explicit documentation required by clinical policy or payer criteria is missing or incomplete.

4. **Communicate Strategically with Clinicians**
   - Ask structured, strategically phrased questions to clinicians (\`clinicianCommunication\`) when there's uncertainty, guiding them to provide clear and compliant documentation without inadvertently causing denials.
   - Always propose documentation snippets explicitly linked to clinician responses, ensuring truthful and beneficial documentation is suggested.

### 🚨 **Avoiding Documentation Pitfalls:**
- **DO NOT** ask questions that, if answered incorrectly or ambiguously, could inadvertently lead to documentation supporting denial, without clearly explaining this risk.
- **DO** explicitly mention risks and rationales when necessary, ensuring clinicians are fully informed before documentation is committed.

---

### ✅ **Good Inline JSON Examples:**

**🔸 Clinician Communication Question with Proposed Snippets:**
\`\`\`json
{
  "action": "clinicianCommunication",
  "timestamp": "2025-04-15T13:45:00Z",
  "clinicianCommunication": [
    {
      "id": "q1",
      "label": "NSAID Failure Documentation",
      "explanation": "Documenting NSAID failure clearly supports medical necessity for biologic therapy. Answering 'Yes' will help demonstrate necessity explicitly.",
      "questionType": "boolean",
      "text": "Has the patient failed treatment with NSAIDs?",
      "options": [
        {
          "label": "Yes",
          "proposedSnippet": {
            "title": "NSAID Treatment Failure",
            "content": "Patient has experienced inadequate symptom relief with a documented trial of NSAIDs lasting over 3 months.",
            "locationSuggestion": "Assessment & Plan"
          }
        },
        {
          "label": "No"
        }
      ]
    }
  ]
}
\`\`\`

**🔸 Nested Decision Tree with Evidence for \`concludeSuccess\`:**
\`\`\`json
{
  "action": "concludeSuccess",
  "timestamp": "2025-04-15T14:30:00Z",
  "concludeSuccess": {
    "payer": "ExampleHealth Plan",
    "policyId": "BIO-12345",
    "treatment": "Adalimumab",
    "indication": "Rheumatoid Arthritis",
    "criteriaMetTree": {
      "label": "Medical Necessity Criteria for Adalimumab",
      "operator": "AND",
      "conditions": [
        {
          "label": "Diagnosis of Rheumatoid Arthritis",
          "evidence": [
            {
              "fhirSource": "Condition/5678",
              "text": "Diagnosis of Rheumatoid Arthritis confirmed on 2023-09-12."
            }
          ]
        },
        {
          "label": "Inadequate Response to NSAIDs",
          "operator": "OR",
          "conditions": [
            {
              "label": "NSAID Failure Documented",
              "evidence": [
                {
                  "fhirSource": "Observation/9988",
                  "text": "NSAIDs tried for 3 months without symptom improvement."
                }
              ]
            },
            {
              "label": "NSAIDs Contraindicated",
              "evidence": [
                {
                  "fhirSource": "AllergyIntolerance/3333",
                  "text": "Patient has documented severe allergy to NSAIDs."
                }
              ]
            }
          ]
        }
      ]
    },
    "attachments": [
      {
        "fhirSource": "DocumentReference/1244",
        "text": "Clinical note dated 2025-04-10 documenting NSAID failure."
      }
    ]
  }
}
\`\`\`

**🔸 Clearly Explained \`concludeFailure\` Example:**
\`\`\`json
{
  "action": "concludeFailure",
  "timestamp": "2025-04-15T15:10:00Z",
  "concludeFailure": {
    "reason": "Patient does not meet the medical necessity criteria due to insufficient documentation of NSAID failure.",
    "unmetCriteriaTree": {
      "label": "Medical Necessity Criteria for Adalimumab",
      "operator": "AND",
      "conditions": [
        {
          "label": "Diagnosis of Rheumatoid Arthritis",
          "evidence": [
            {
              "fhirSource": "Condition/5678",
              "text": "Confirmed diagnosis present."
            }
          ]
        },
        {
          "label": "Inadequate Response or Contraindication to NSAIDs",
          "operator": "OR",
          "conditions": [
            {
              "label": "NSAID Failure Documented",
              "evidence": [
                {
                  "text": "No explicit documentation of NSAID failure found."
                }
              ]
            },
            {
              "label": "NSAIDs Contraindicated",
              "evidence": [
                {
                  "text": "No documented contraindications for NSAIDs."
                }
              ]
            }
          ]
        }
      ]
    },
    "attachments": []
  }
}
\`\`\`

---

### 📌 **Summary of Expectations:**
- Clearly represent clinical logic through nested criteria and supporting evidence.
- Strategically guide clinicians toward beneficial documentation through structured communication.
- Proactively avoid creating documentation traps.
- Provide structured and thorough explanations for both success and failure conclusions.

Your outputs **must be plain JSON that adhere strictly to the provided schema** to ensure seamless integration into clinical workflows and user interfaces.
---

`;

// Dummy Order Data (Replace with actual data source/prop later)
const DUMMY_ORDER = {
    treatment: "Standard rTMS",
    indication: "Bipolar I Depression"
};

// ---------- UI COMPONENTS (Enhance QuestionCard) ----------
// Update props type for new answer structure if needed (using string for now)
interface QuestionCardProps { 
    question: ClinicianQuestion; 
    currentAnswer: { value: string; snippet: string } | undefined; 
    onAnswer: (id: string, value: string, snippet: string, type: ClinicianQuestion['questionType']) => void; 
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, currentAnswer, onAnswer }) => {
  // State to hold the direct input value for numeric/freeText
  const [inputValue, setInputValue] = useState<string>(currentAnswer?.value || "");
  // State to hold the selected option label for boolean/multipleChoice
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(currentAnswer?.value); // Initialize with value if type matches
  const [snippetContent, setSnippetContent] = useState<string>(currentAnswer?.snippet || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to initialize state based on currentAnswer prop
  useEffect(() => {
    const answerValue = currentAnswer?.value;
    const answerSnippet = currentAnswer?.snippet || "";
    setSnippetContent(answerSnippet); // Always set snippet

    if (question.questionType === 'numeric' || question.questionType === 'freeText') {
        setInputValue(answerValue || "");
        // For numeric, check range and set initial snippet if applicable
        if (question.questionType === 'numeric' && question.numericRange?.proposedSnippetIfWithinRange && answerValue) {
            const numValue = parseFloat(answerValue);
            const { min, max } = question.numericRange;
            if (!isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
                setSnippetContent(answerSnippet || question.numericRange.proposedSnippetIfWithinRange.content);
            } else {
                 // If out of range or not a number, don't use the range snippet initially unless it was already saved
                 // setSnippetContent(""); // Or keep existing if loading saved state
            }
        }
    } else { // boolean or multipleChoice
        setSelectedLabel(answerValue);
        // Set snippet based on selected option if needed
        if (answerValue) {
            const opt = question.options?.find(o => o.label === answerValue);
            setSnippetContent(answerSnippet || opt?.proposedSnippet?.content || "");
        } else {
            // Clear snippet if no answer is selected (e.g., initially) for radio/multi
             setSnippetContent("");
        }
    }
  }, [currentAnswer, question]); // Rerun if answer or question changes

  // Effect to focus textarea when a snippet is available
  useEffect(() => {
    if (snippetContent && textareaRef.current) {
        // Only focus/select if it wasn't the initial load (or make smarter)
        // textareaRef.current.focus();
        // textareaRef.current.select();
    }
  }, [snippetContent]); 

  // --- Update Handlers --- 

  // Handler for Radio button selection (boolean/multipleChoice)
  const handleRadioSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const label = event.target.value;
    setSelectedLabel(label);
    setInputValue(""); // Clear numeric/text input if radio selected
    const opt = question.options?.find(o => o.label === label);
    const proposedSnippet = opt?.proposedSnippet?.content || "";
    setSnippetContent(proposedSnippet);
    onAnswer(question.id, label, proposedSnippet, question.questionType);
  };

  // Handler for Numeric/FreeText input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setSelectedLabel(undefined); // Clear radio selection if text input used

    let currentSnippet = ""; // Default to empty snippet for text/numeric unless in range
    // Handle numeric range snippet logic
    if (question.questionType === 'numeric' && question.numericRange?.proposedSnippetIfWithinRange) {
        const numValue = parseFloat(value);
        const { min, max, proposedSnippetIfWithinRange } = question.numericRange;
        if (!isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
            // Value is within range, use the proposed snippet
            currentSnippet = proposedSnippetIfWithinRange.content;
        }
        // Always update snippet state, even if it's empty now
            setSnippetContent(currentSnippet);
    } else {
        // For free text, there's no automatic snippet proposal based on input
        // Keep existing manually edited snippet if any, otherwise it stays empty
        // setSnippetContent(""); // Don't automatically clear manual edits
    }
    
    // Pass back the input value and the *potentially* updated snippet
    onAnswer(question.id, value, snippetContent, question.questionType); // Send existing snippetContent here
  };

  // Handler for manually editing ANY proposed snippet
  const handleSnippetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newSnippetContent = e.target.value;
      setSnippetContent(newSnippetContent);
      // Determine the primary value (selectedLabel or inputValue) to send back
      const primaryValue = selectedLabel || inputValue || ""; // Ensure primaryValue is a string
      onAnswer(question.id, primaryValue, newSnippetContent, question.questionType); 
  };

  // --- Render Logic based on questionType --- 
  return (
    <div className="question-card">
      <div className="card-content">
        <h3 className="question-label">{question.label}</h3>
        <p className="question-explanation">{question.explanation}</p>
        <p className="question-text">{question.text}</p>
        
        {/* Boolean / Multiple Choice */} 
        {(question.questionType === 'boolean' || question.questionType === 'multipleChoice') && (
            <div>
              {question.options?.map((o, i) => {
                 const inputId = `${question.id}-${i}`;
                 const showSnippet = selectedLabel === o.label && (o.proposedSnippet || snippetContent); // Show if selected and snippet exists (either proposed or edited)
                 return (
                    <div key={i} className="form-group form-group-radio">
                      <label htmlFor={inputId} className="radio-label">
                        <input
                            type="radio"
                            value={o.label}
                            id={inputId}
                            name={question.id} 
                            checked={selectedLabel === o.label}
                            onChange={handleRadioSelection}
                            className="form-radio"
                        />
                        <span className="radio-option-label">{o.label}</span>
                      </label>
                      {/* Snippet for selected radio option */} 
                      {showSnippet && (
                        <div className="snippet-container">
                          <p className="snippet-title">
                              Proposed Snippet: 
                              {o.proposedSnippet && <span className="snippet-title-detail"> ({o.proposedSnippet.title})</span>}
                          </p>
                          <textarea
                            ref={textareaRef}
                            className="snippet-textarea"
                            value={snippetContent} // Use unified snippet state
                            onChange={handleSnippetChange}
                          />
                          {o.proposedSnippet?.locationSuggestion && (
                            <p className="snippet-suggestion">Suggestion: {o.proposedSnippet.locationSuggestion}</p>
                          )}
                        </div>
                      )}
                    </div>
                 )
              })}
            </div>
        )}

        {/* Numeric Input */} 
        {question.questionType === 'numeric' && (
            <div className="form-group">
                 <input 
                    type="number" 
                    value={inputValue}
                    onChange={handleInputChange}
                    min={question.numericRange?.min}
                    max={question.numericRange?.max}
                    placeholder={`Enter number${question.numericRange?.units ? ` (${question.numericRange.units})` : ''}`}
                    className="form-input form-input-number"
                 />
                 {/* Snippet for numeric range (Show if a snippet is available, either default or edited) */} 
                 {question.numericRange?.proposedSnippetIfWithinRange && snippetContent && (
                     <div className="snippet-container"> {/* Removed ml-6 */}
                       <p className="snippet-title">
                           Proposed Snippet (if in range): 
                           <span className="snippet-title-detail"> ({question.numericRange.proposedSnippetIfWithinRange.title})</span>
                       </p>
                       <textarea
                         ref={textareaRef}
                         className="snippet-textarea"
                         value={snippetContent} // Use unified snippet state
                         onChange={handleSnippetChange}
                       />
                       {question.numericRange.proposedSnippetIfWithinRange.locationSuggestion && (
                         <p className="snippet-suggestion">Suggestion: {question.numericRange.proposedSnippetIfWithinRange.locationSuggestion}</p>
                       )}
                     </div>
                 )}
            </div>
        )}

        {/* Free Text Input */} 
        {question.questionType === 'freeText' && (
            <div className="form-group">
                <textarea 
                    value={inputValue}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Enter response..."
                    className="form-textarea"
                 />
                  {/* No automatic snippet for free text, but allow manual entry */}
                   <div className="snippet-container">
                     <p className="snippet-title">Optional Note/Snippet:</p>
                     <textarea
                         className="snippet-textarea snippet-textarea-optional"
                         value={snippetContent} // Use unified snippet state
                         onChange={handleSnippetChange} // Allow editing
                         placeholder="Add any relevant note here..."
                     />
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

// Refactored ResultCard
const ResultCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children })=> (
  <div className="result-card"> {/* Replaced Card */}
    <div className="card-content"> {/* Replaced CardContent */}
      <h2 className="result-title">{title}</h2>
      {children}
    </div>
  </div>
);

// CriteriaTree remains the same (uses standard ul/li)
const CriteriaTree: React.FC<{ node: ConditionNode }> = ({ node })=> (
  <ul className="criteria-tree-list">
    <li>
      <span className="criteria-label">{node.label}</span>
      {node.operator && <span className="criteria-operator">({node.operator})</span>} {/* Show operator */}
      {node.evidence && (
          <ul className="evidence-list">
              {node.evidence.map((e, i) => <li key={i} title={e.fhirSource || 'No FHIR Source'}>{e.text}</li>)} {/* Added title default */}
          </ul>
      )}
      {node.conditions?.map((c, i) => <CriteriaTree key={i} node={c} />)}
    </li>
  </ul>
);

// Helper function for simple keyword matching (can be improved)
const findBestPolicyMatch = (indexContent: string, treatment: string, indication: string): string | null => {
    const query = `${treatment} ${indication}`.toLowerCase().split(/\s+/);
    const policies = indexContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('|'))
        .map(line => {
            const parts = line.split('|', 2);
            return { number: parts[0].trim(), title: parts[1]?.trim() || '' };
        })
        .filter(p => p.number && p.title);

    if (policies.length === 0) return null;

    let bestMatch = null;
    let highestScore = -1;

    policies.forEach(policy => {
        const titleWords = policy.title.toLowerCase().split(/\s+/);
        let currentScore = 0;
        query.forEach(qWord => {
            if (titleWords.includes(qWord)) {
                currentScore++;
            }
        });

        // Simple boost for matching treatment words directly in title
        treatment.toLowerCase().split(/\s+/).forEach(tWord => {
             if (titleWords.includes(tWord)) {
                 currentScore += 1; // Add extra weight
             }
        });

        if (currentScore > highestScore) {
            highestScore = currentScore;
            bestMatch = policy.number;
        }
    });

    // Return null if no keywords matched at all
    return highestScore > 0 ? bestMatch : null; 
};

// ---------- MAIN APP LOGIC ----------
const Orders2Tab: React.FC = () => {
    const [paState, setPaState] = useState<"idle" | "processing" | "asking" | "concluded">("idle");
    const [history, setHistory] = useState<ActionRequest[]>([]);
    const [currentAction, setCurrentAction] = useState<ActionRequest | null>(null);
    // Update userAnswers state structure to store value + snippet
    const [userAnswers, setUserAnswers] = useState<Record<string, { value: string; snippet: string }>>({}); 
    // Store snippets with a unique key (e.g., questionId_optionLabel or questionId_numericRange)
    const [signedSnippets, setSignedSnippets] = useState<Record<string, { title: string; content: string; signed: boolean }>>({});
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // Add state for the order form
    const [treatment, setTreatment] = useState<string>("Standard rTMS");
    const [indication, setIndication] = useState<string>("Bipolar I Depression");
    // Add state for history visibility
    const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);
    // State to store the conversation contents for the *next* API call
    const [nextApiContents, setNextApiContents] = useState<Content[]>([]);

    const { ehrData } = useEhrContext(); 
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const GEMINI_MODEL_NAME = 'gemini-2.5-pro-exp-03-25';
    const genAI = useMemo(() => new GoogleGenAI({ apiKey: GEMINI_API_KEY }), [GEMINI_API_KEY]);


    // --- Core LLM Interaction ---
    const processTurnInternal = useCallback(async (contentsToProcess: Content[]) => {
        setIsLoading(true);
        setError(null);
        // Store the contents that will be used for this API call
        // setNextApiContents(contentsToProcess); // Store *before* loop starts? No, better inside before breaking.
        console.log("Processing turn with contents:", JSON.stringify(contentsToProcess, null, 2));

        try {
            let currentContents = [...contentsToProcess]; // Use the passed-in contents for this cycle

            // Loop to handle LLM call -> Action -> (Optional Grep -> LLM Call)
            while (true) {
                console.log("Making LLM call with contents:", JSON.stringify(currentContents, null, 2));
                // Store contents *before* this specific API call might be needed if user interaction breaks loop
                // This ensures if we break, the next user response is added AFTER the model's question/action
                setNextApiContents(currentContents);

                // --- Use generateContent API Call ---
            const result = await genAI.models.generateContent({
                model: GEMINI_MODEL_NAME,
                    contents: currentContents, // Send the accumulated history
                    config: { temperature: 0.8 },
                    // TODO: Consider adding safety settings if needed
                    // safetySettings: [
                    //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    // ],
                });

                 // --- Response Handling ---
                // Check if response candidate exists and has content
                const candidate = result.candidates?.[0];
                if (!candidate || !candidate.content?.parts?.length) {
                     // Handle finishReason if available
                     const finishReason = candidate?.finishReason || 'Unknown';
                     const safetyRatings = JSON.stringify(candidate?.safetyRatings || [], null, 2);
                     console.error(`LLM response generation failed or was empty. Finish Reason: ${finishReason}`, safetyRatings);
                     throw new Error(`LLM response generation failed or was empty. Finish Reason: ${finishReason}. Check safety ratings if applicable.`);
                }
                
                const responseText = candidate.content.parts[0].text || '';
                if (!responseText) {
                    console.warn("LLM response text part was empty.");
                    throw new Error("LLM response text part was empty.");
                }
            console.log("LLM Response Text:", responseText);


                // --- Parse & Validate Response ---
            let parsedAction: ActionRequest;
            try {
                    // Look for JSON within ```json ... ``` blocks first
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    parsedAction = JSON.parse(jsonMatch[1]);
                } else {
                        // Fallback: try parsing the whole response directly
                        console.warn("LLM response did not contain ```json block, trying direct parse.");
                    parsedAction = JSON.parse(responseText);
                }
                    // Basic validation
                    if (!parsedAction || typeof parsedAction !== 'object' || !parsedAction.action) {
                        throw new Error("Parsed response is not a valid ActionRequest object.");
                    }
            } catch (parseError) {
                 console.error("Failed to parse LLM JSON response:", parseError);
                    // Try to extract a snippet for the error message
                    const snippet = responseText.length > 200 ? `${responseText.substring(0, 200)}...` : responseText;
                    throw new Error(`LLM response was not valid JSON: ${snippet}`);
            }
            console.log("Parsed LLM Action:", parsedAction);

                // --- Add Model's Action to Current Conversation History ---
                // This ensures the model's own action is part of the context for the *next* call (if loop continues)
                const modelResponseContent: Content = { role: 'model', parts: [{ text: JSON.stringify(parsedAction) }] };
                currentContents.push(modelResponseContent); 

            // --- Handle Actions ---
                if (parsedAction.action === "searchEHR") {
                    console.log("Performing EHR search...");
                    setHistory(prev => [...prev, parsedAction]); // Add search request to display history
                    setPaState("processing"); // Indicate processing

                    if (!ehrData) {
                        throw new Error("EHR data is not available for searching.");
                    }

                    const keywords = parsedAction.searchEHR?.keywords;
                    if (!keywords || keywords.length === 0) {
                        throw new Error("searchEHR action received without keywords.");
                    }
                    // Escape regex special chars in keywords and join with | for OR logic
                    const regexQuery = keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
                    console.log(`Constructed grep query: /${regexQuery}/gi`);

                    // --- Call grepRecordLogic ---
                    let grepResultMarkdown: string;
                    try {
                        // Ensure ehrData is not null before passing
                        grepResultMarkdown = await grepRecordLogic(
                            ehrData, // Checked above
                            regexQuery, // Pass the constructed regex
                            undefined, // Default: search all resource types
                            'plaintext', // Default format for resource hits
                            50, // Default page size
                            1 // Default page number (page 1)
                        );
                    } catch (grepError: any) {
                         console.error("Error calling grepRecordLogic:", grepError);
                         // Provide error feedback *to the LLM*
                         grepResultMarkdown = `**Error during EHR search:** ${grepError.message || 'Unknown error'}`;
                    }
                    console.log("Grep Result Markdown length:", grepResultMarkdown?.length || 0); // Use optional chaining

                    // --- Prepare Grep Results as Next User Input ---
                    // We frame this as a 'user' message containing the tool's output
                    const userGrepResponse: Content = { role: "user", parts: [{ text: grepResultMarkdown || "**No results found.**" }] };
                    currentContents.push(userGrepResponse); // Add grep results for the *next* LLM call in the loop

                    // Loop continues: immediately send history + grep results back to LLM
                    continue;

                } else if (parsedAction.action === "clinicianCommunication") {
                    setHistory(prev => [...prev, parsedAction]); // Add question request to display history
                    setCurrentAction(parsedAction);
                setPaState("asking");
                    
                    // Initialize/reset answers and snippets for the new set of questions
                    setUserAnswers({}); // Clear previous answers 
                const initialSnippets: Record<string, { title: string; content: string; signed: boolean }> = {};
                parsedAction.clinicianCommunication?.forEach(q => {
                   if (q.options) {
                       q.options.forEach(o => {
                                if (o.proposedSnippet) { 
                                    const key = `${q.id}_${o.label}`; // Key based on question and option
                                    initialSnippets[key] = { ...o.proposedSnippet, signed: false }; 
                                }
                       });
                   } else if (q.numericRange?.proposedSnippetIfWithinRange) {
                            const key = `${q.id}_numericRange`; // Key for numeric range snippet
                            initialSnippets[key] = { ...q.numericRange.proposedSnippetIfWithinRange, signed: false };
                   }
                        // No initial snippet needed for freeText unless specifically designed
                });
                setSignedSnippets(initialSnippets); 

                    // setNextApiContents is already updated before the API call inside the loop.
                    // We just break here to wait for user input.
                    break; // Exit loop, wait for user input via handleSubmitAnswers

            } else if (parsedAction.action === "concludeSuccess" || parsedAction.action === "concludeFailure") {
                    setHistory(prev => [...prev, parsedAction]); // Add conclusion to display history
                    setCurrentAction(parsedAction);
                setPaState("concluded");

                    // Generate final *signable* snippets based on *actual* answers provided that triggered a snippet
                const finalSnippets: Record<string, { title: string; content: string; signed: boolean }> = {};
                 Object.entries(userAnswers).forEach(([qId, answer]) => {
                        // Find the question definition from history (could be optimized)
                     const question = history
                             .slice().reverse() // Search backwards for efficiency
                            .find(h => h.clinicianCommunication?.some(q => q.id === qId))
                            ?.clinicianCommunication?.find(q => q.id === qId);
                     
                        if (!question || !answer.snippet) return; // No question found or no snippet content provided

                        let keySuffix = answer.value; // Default for boolean/multi-choice
                     let proposed: ProposedSnippet | undefined;

                        if (question.questionType === 'boolean' || question.questionType === 'multipleChoice') {
                         proposed = question.options?.find(o => o.label === answer.value)?.proposedSnippet;
                        } else if (question.questionType === 'numeric' && question.numericRange?.proposedSnippetIfWithinRange) {
                            // Check if the numeric value was in range to justify the snippet
                         const numValue = parseFloat(answer.value);
                         const { min, max } = question.numericRange;
                         if (!isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
                             proposed = question.numericRange.proposedSnippetIfWithinRange;
                                keySuffix = 'numericRange'; // Use specific key for numeric range
                         }
                        } else if (question.questionType === 'freeText') {
                            // Allow signing manually entered snippets for freeText
                            keySuffix = 'freeText'; // Specific key for free text
                            // Assume a generic title if none is provided by the structure
                            proposed = { title: `Note for '${question.label}'`, content: answer.snippet };
                     }

                        // Only add if a snippet was proposed/relevant *and* has content (edited or original)
                         if (proposed && answer.snippet) {
                            const key = `${qId}_${keySuffix}`;
                            finalSnippets[key] = { ...proposed, content: answer.snippet, signed: false }; // Use the final edited content
                     }
                 });
                 setSignedSnippets(finalSnippets);

                    // setNextApiContents is already updated before the API call.
                     break; // Exit loop, conclusion reached

                } else if (parsedAction.action === "evaluateJS") {
                    // Placeholder for JS evaluation logic
                    setHistory(prev => [...prev, parsedAction]); // Add action to display history
                    console.warn("evaluateJS action received but not implemented yet.");
                    // Provide feedback to the LLM that the action wasn't performed
                    const evalFeedback: Content = { role: "user", parts: [{ text: "**Action 'evaluateJS' is not implemented.**" }] };
                    currentContents.push(evalFeedback);
                    // Optionally, decide whether to stop or let the LLM try something else
                    // For now, let's stop and report error to user UI
                    setError("Received 'evaluateJS' action, which is not yet supported.");
                    setPaState("idle"); // Revert state
                    setNextApiContents(currentContents); // Save state including the feedback
                    break; // Exit loop

            } else {
                    // Handle unknown or unsupported actions
                    setHistory(prev => [...prev, parsedAction]); // Add unknown action to display history
                    console.error(`Unknown or unsupported action type received: ${parsedAction.action}`);
                    // Provide feedback to the LLM
                    const unknownActionFeedback: Content = { role: "user", parts: [{ text: `**Error: Unknown action type '${parsedAction.action}'.**` }] };
                    currentContents.push(unknownActionFeedback);
                    // Report error and stop
                    setError(`Received unknown action type: ${parsedAction.action}`);
                    setPaState("idle"); // Revert state
                    setNextApiContents(currentContents); // Save state including error feedback
                    break; // Exit loop
                }
            } // End while loop

        } catch (err) {
            console.error("Error processing turn:", err);
            setError(err instanceof Error ? err.message : String(err));
            setPaState("idle"); // Revert to idle on error
            // Optionally save the state that led to the error
            // setNextApiContents(currentContents); // Uncomment if needed for debugging
        } finally {
            setIsLoading(false);
        }
    }, [genAI, GEMINI_MODEL_NAME, ehrData, history /* userAnswers removed, handled inside */]);


    // --- Function to Handle User Input (e.g., Answers) ---
    const processUserResponse = useCallback(async (userText: string) => {
        console.log("Processing user response:", userText);
        // Prepare the contents for the next LLM call:
        // Take the conversation history *up to the point we paused* (`nextApiContents`)
        // and append the new user message.
        const contentsForNextCall = [...nextApiContents, { role: 'user', parts: [{ text: userText }] }];
        await processTurnInternal(contentsForNextCall); // Call the core logic with updated contents
    }, [nextApiContents, processTurnInternal]);


    // --- Event Handlers ---
    const handleStartPA = useCallback(async () => { 
        // Reset state
        setHistory([]);
        setCurrentAction(null);
        setUserAnswers({}); 
        setSignedSnippets({});
        setError(null);
        setIsHistoryExpanded(false);
        setPaState("processing");
        setIsLoading(true); 

        // --- Prepare initial contents for the first call ---
        if (!ehrData) {
            setError("Cannot start: EHR data is not loaded.");
            setPaState("idle");
            setIsLoading(false); 
            return;
        }

        let policyNumber: string | null = null;
        let pdfBase64 = '';
        let processError = null;
        const indexFilePath = '/premera_policies/index.txt'; // Path to index file

        try {
            // 1. Fetch the policy index file
            console.log(`Fetching policy index from: ${indexFilePath}`);
            const indexResponse = await fetch(indexFilePath);
            if (!indexResponse.ok) {
                throw new Error(`Failed to fetch policy index: ${indexResponse.status} ${indexResponse.statusText}.`);
            }
            const indexContent = await indexResponse.text();

            // 2. Find the best matching policy number
            policyNumber = findBestPolicyMatch(indexContent, treatment, indication);
            if (!policyNumber) {
                throw new Error(`Could not find a suitable policy in the index for treatment="${treatment}" and indication="${indication}".`);
            }
            console.log(`Best matching policy number found: ${policyNumber}`);

            // 3. Construct PDF path and fetch the specific policy PDF
            const relativePdfPath = `/premera_policies/${policyNumber}.pdf`;
            console.log(`Attempting to fetch specific policy PDF: ${relativePdfPath}`);
            const pdfResponse = await fetch(relativePdfPath);
            if (!pdfResponse.ok) {
                throw new Error(`Failed to fetch policy PDF (${policyNumber}.pdf): ${pdfResponse.status} ${pdfResponse.statusText}.`);
            }

            // 4. Encode the PDF to base64
            const pdfArrayBuffer = await pdfResponse.arrayBuffer();
            let binaryString = '';
            const bytes = new Uint8Array(pdfArrayBuffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }
            pdfBase64 = btoa(binaryString);
            console.log(`Successfully fetched and encoded policy PDF ${policyNumber}.pdf (${(bytes.length / 1024).toFixed(1)} KB).`);

        } catch (err: any) {
            console.error("Error during policy lookup or PDF processing:", err);
            processError = `Failed to prepare policy data: ${err.message}`;
            setError(processError);
            setPaState("idle");
            setIsLoading(false);
            return;
        }

        const initialUserMessageText = `${SYSTEM_PROMPT}\n\n## Current Request\nTreatment: ${treatment}\nIndication: ${indication}\nPolicyNumber: ${policyNumber}\n\nYour Goal: Determine Medical Necessiy`; // Added policy number to prompt

        // Construct initial contents with text and inline base64 PDF data
        const initialContents: Content[] = [
            {
                role: "user",
                parts: [
                    { text: initialUserMessageText },
                    {
                        inlineData: { 
                            mimeType: 'application/pdf',
                            data: pdfBase64 
                        }
                    }
                ]
            }
        ];

        console.log("Initial Prompt Payload (Text includes Policy Number):", initialUserMessageText);
        console.log("Initial Prompt Payload (Inline PDF Base64 Length):", pdfBase64.length);
        
        // Start the first turn processing
        await processTurnInternal(initialContents); 

    }, [processTurnInternal, ehrData, treatment, indication, SYSTEM_PROMPT]);


    // handleAnswer: Updates the answer state including value and potentially edited snippet
    const handleAnswer = useCallback((questionId: string, value: string, snippetContent: string, type: ClinicianQuestion['questionType']) => {
        console.log(`Answered Q:${questionId} (Type:${type}) Value: ${value} Snippet: ${snippetContent.substring(0,50)}...`);
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: { value: value, snippet: snippetContent } // Store both value and current snippet state
        }));
    }, []);

    // handleSubmitAnswers: Packages answers and sends them to the LLM
    const handleSubmitAnswers = useCallback(() => {
        if (paState !== "asking" || !currentAction) return;

        // Prepare the user's answer content string, including the *final* snippet content for each answer
        const answersToSend: Record<string, { answer: string; snippet?: string }> = {};
        Object.entries(userAnswers).forEach(([qId, answer]) => {
             // Only include snippet if it's non-empty
            answersToSend[qId] = { 
                answer: answer.value, 
                ...(answer.snippet && { snippet: answer.snippet }) // Conditionally add snippet
            };
        });
        const userResponseText = JSON.stringify({ answers: answersToSend });

        // Set processing state while waiting for LLM
        setPaState("processing"); 
        processUserResponse(userResponseText); // Pass the answers JSON string to the handler

    }, [paState, currentAction, userAnswers, processUserResponse]); 

    // handleSignSnippet: Marks a specific snippet as 'signed'
    const handleSignSnippet = useCallback((snippetKey: string) => {
        setSignedSnippets(prev => {
            if (!prev[snippetKey]) return prev; // Should not happen if keys are correct
            const updatedSnippet = { ...prev[snippetKey], signed: true };
            // Log signing action
            console.log(`Signed snippet: ${snippetKey}`, updatedSnippet);
            alert(`Snippet "${updatedSnippet.title}" signed! (Simulated - Check console)`);
            return {
            ...prev,
                [snippetKey]: updatedSnippet
            };
        });
    }, []); // No dependency on signedSnippets needed here

    // isReadyToSubmit: Check if all *currently displayed* questions have a value (basic check)
    const isReadyToSubmit = useMemo(() => {
        if (paState !== 'asking' || !currentAction?.clinicianCommunication) return false;
        // Check if every question currently displayed has an entry in userAnswers with a non-empty value
        return currentAction.clinicianCommunication.every(q => 
            userAnswers[q.id]?.value !== undefined && userAnswers[q.id]?.value.trim() !== ''
        );
    }, [paState, currentAction, userAnswers]);

    // relevantSnippets: Filters the signedSnippets state for display in conclusion
    const relevantSnippets = useMemo(() => {
        if (paState !== 'concluded') return [];
        // Filter snippets that actually have content to display
        return Object.entries(signedSnippets)
               .filter(([key, snippet]) => snippet.content) 
               .map(([key, snippet]) => ({ key, ...snippet })); // Map to include the key for the UI
    }, [paState, signedSnippets]); 


    // --- Render Logic ---
    return (
        <div className="orders2-tab">
            <h2>Medical Necessity Determination Workflow (v2.1)</h2>

            {/* Order Form - Only shown in idle state */} 
            {paState === "idle" && (
                <div className="order-form-section">
                     <h3 className="section-title">Order Details</h3>
                     <div className="form-group">
                        <label htmlFor="treatment" className="form-label">Treatment:</label>
                        <input 
                           type="text" 
                           id="treatment" 
                           value={treatment}
                           onChange={(e) => setTreatment(e.target.value)} 
                           className="form-input"
                           disabled={isLoading} // Disable when loading
                        />
                     </div>
                     <div className="form-group">
                        <label htmlFor="indication" className="form-label">Indication:</label>
                         <input 
                           type="text" 
                           id="indication" 
                           value={indication}
                           onChange={(e) => setIndication(e.target.value)} 
                           className="form-input"
                           disabled={isLoading} // Disable when loading
                        />
                     </div>
                 </div>
            )}

             {/* Start Button - Shows in idle, disabled during loading */} 
            {paState === "idle" && (
                <button 
                    onClick={handleStartPA} 
                    className="btn btn-primary btn-start-pa" 
                    disabled={!treatment || !indication || isLoading || !ehrData} // Also disable if no EHR data
                >
                    {isLoading ? "Starting..." : `Determine Medical Necessity for ${treatment} (${indication})`}
                </button>
            )}
             {!ehrData && paState === 'idle' && (
                <p className="status-message status-warning">Waiting for EHR data to load...</p>
            )}


            {/* Loading Indicator - More prominent */} 
            {isLoading && (
                 <div className="loading-indicator">
                     <svg className="spinner-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                     Processing... (State: {paState})
                 </div>
             )}


            {/* Error Display */} 
            {error && <div className="error-message">{error}</div>}

            {/* History Display (Collapsible) */} 
            {history.length > 0 && (
                 <div className="history-section">
                     <button 
                         onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                         className="history-toggle-button"
                     >
                         <span>Workflow History ({history.length} steps)</span>
                         {isHistoryExpanded ? <span className="toggle-icon">−</span> : <span className="toggle-icon">+</span>}
                     </button>
                     {isHistoryExpanded && (
                         <div className="history-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              {history.map((action, index) => (
                                 <div key={index} className="history-item">
                                     <p className="history-item-header">Step {index + 1}: Model Action <code className="action-code">{action.action}</code></p>
                                     {/* Display details based on action type */}
                                     {action.action === 'searchEHR' && action.searchEHR && (
                                        <p className="history-item-detail">Keywords: <code className="keyword-code">{action.searchEHR.keywords.join(', ')}</code></p>
                                     )}
                                      {action.action === 'clinicianCommunication' && action.clinicianCommunication && (
                                        <ul className="history-item-detail history-list">
                                             {action.clinicianCommunication.map(q => <li key={q.id}>{q.label}: <i>"{q.text}"</i></li>)}
                                        </ul>
                                     )}
                                      {action.action === 'concludeSuccess' && action.concludeSuccess && (
                                        <p className="history-item-detail success-detail">Success: {action.concludeSuccess.treatment} for {action.concludeSuccess.indication}</p>
                                     )}
                                     {action.action === 'concludeFailure' && action.concludeFailure && (
                                        <p className="history-item-detail failure-detail">Failure: {action.concludeFailure.reason}</p>
                                     )}
                                      
                                 </div>
                              ))}
                         </div>
                     )}
                 </div>
            )}

            {/* Asking State: Display Questions */} 
            {paState === "asking" && currentAction?.clinicianCommunication && (
                <div className="questions-section">
                    <h3 className="section-title">Clinician Input Needed</h3>
                    {currentAction.clinicianCommunication.map(q => (
                        <QuestionCard
                             key={q.id}
                             question={q}
                             currentAnswer={userAnswers[q.id]} // Pass the {value, snippet} object
                             onAnswer={handleAnswer} 
                        />
                    ))}
                     <button 
                        onClick={handleSubmitAnswers} 
                        disabled={!isReadyToSubmit || isLoading} 
                        className="btn btn-success btn-submit-answers"
                    >
                        {isLoading ? "Submitting..." : "Submit Answers"}
                     </button>
                </div>
            )}

            {/* Concluded State: Display Results and Signable Snippets */} 
            {paState === "concluded" && currentAction && (
                <div className="conclusion-section">
                    {currentAction.action === "concludeSuccess" && currentAction.concludeSuccess && (
                        <ResultCard title="PA Approved (Success)">
                            <p>Met criteria for <strong>{currentAction.concludeSuccess.treatment}</strong> ({currentAction.concludeSuccess.indication}) based on policy <strong>{currentAction.concludeSuccess.policyId}</strong>.</p>
                            <h4 className="subsection-title">Criteria Met Tree:</h4>
                            <div className="criteria-tree-container">
                            <CriteriaTree node={currentAction.concludeSuccess.criteriaMetTree} />
                            </div>
                            {/* Display Signable Snippets */} 
                            {relevantSnippets.length > 0 && (
                                <div className="signable-snippets">
                                     <h4 className="subsection-title">Proposed Documentation Snippets ({relevantSnippets.length}):</h4>
                                     {relevantSnippets.map(snippet => (
                                        <div key={snippet.key} className="snippet-item snippet-signable">
                                             <p className="snippet-item-title">{snippet.title}</p>
                                             <p className="snippet-item-content">{snippet.content}</p>
                                             <button
                                                 onClick={() => handleSignSnippet(snippet.key)} // Use the unique key
                                                 disabled={snippet.signed || isLoading}
                                                 className={`btn btn-sign-snippet ${snippet.signed ? 'signed' : ''}`}
                                             >
                                                 {snippet.signed ? '✓ Signed' : 'Sign & Add to Note'}
                                             </button>
                                        </div>
                                     ))}
                                </div>
                            )}
                        </ResultCard>
                    )}
                     {currentAction.action === "concludeFailure" && currentAction.concludeFailure && (
                        <ResultCard title="PA Denied (Failure)">
                            <p><strong>Reason:</strong> {currentAction.concludeFailure.reason}</p>
                            <h4 className="subsection-title">Unmet Criteria Tree:</h4>
                             <div className="criteria-tree-container criteria-tree-failure">
                            <CriteriaTree node={currentAction.concludeFailure.unmetCriteriaTree} />
                            </div>
                             {/* Optionally show any generated (but maybe unsigned) snippets even on failure? */}
                             {relevantSnippets.length > 0 && (
                                <div className="signable-snippets snippets-for-reference">
                                     <h4 className="subsection-title">Generated Snippets (for reference):</h4>
                                     {relevantSnippets.map(snippet => (
                                        <div key={snippet.key} className="snippet-item snippet-reference">
                                             <p className="snippet-item-title">{snippet.title}</p>
                                             <p className="snippet-item-content">{snippet.content}</p>
                                             {/* No sign button shown here */}
                                        </div>
                                     ))}
                                </div>
                            )}
                        </ResultCard>
                    )}
                    <button 
                        onClick={() => { setPaState('idle'); setError(null); setIsLoading(false); }} // Reset state completely
                        disabled={isLoading}
                        className="btn btn-secondary btn-start-new"
                    >
                        Start New PA
                    </button>
                </div>
            )}
        </div>
    );
};

export default Orders2Tab; 