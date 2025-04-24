import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEhrContext } from "../../context/EhrContext";
// A2A Imports
import type { Artifact, FilePart, Message, Part } from '@a2a/client/src/types'; // Keep Message, Part, TaskStatus
import { useTaskLiaison } from "../../hooks/useTaskLiaison";
// Import types from the new shared location
import type {
  ClinicianQuestion,
  ConditionNode,
  ProposedSnippet,
  ScratchpadBlock
} from "../../types/priorAuthTypes"; // <-- Updated path

// --- NEW: Import Hooks and Store ---
import { useEhrSearch } from "../../hooks/useEhrSearch";
import { ClinicianIntent, useMedicalNecessityLlm } from "../../hooks/useMedicalNecessityLlm";
import { useBridgeStore } from "../../store/bridgeStore";
import { buildEvidence } from "../../utils/buildEvidence"; // <-- NEW IMPORT
import { extractPatientAdminDetails } from "../../utils/extractPatientAdminDetails";

// ─────────────────────────────────────────────────────────────────────────────
// 1. INTERFACES ─ complete definitions used by the LLM and the UI
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 2. UPDATED SYSTEM PROMPT – exhaustive, example‑rich (triple back‑tick json
//    blocks maintained so the LLM can copy/paste).
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: $POLICY_MARKDOWN placeholder needs actual policy text injected
//       if we are not sending the PDF separately. For now, assume PDF is sent.
// ─────────────────────────────────────────────────────────────────────────────
// 3. REACT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// 🍱 Scratchpad renderer – shows model reasoning blocks
const Scratchpad: React.FC<{ blocks: ScratchpadBlock[] }> = ({ blocks }) => (
  <div className="scratchpad">
    {blocks.map((b, i) => {
      switch (b.type) {
        case "outline":
          return (
            <div key={i} className="pad-block pad-outline">
              <h4 className="pad-heading">{b.heading}</h4>
              <ul className="pad-list">{b.bullets.map((t, j) => <li key={j}>{t}</li>)}</ul>
            </div>
          );
        case "policyQuote":
          return (
            <blockquote key={i} className="pad-block pad-quote">
              <cite className="pad-cite">{b.from}</cite>
              <p>{b.text}</p>
            </blockquote>
          );
        case "criteriaTree":
          return (
            <div key={i} className="pad-block pad-tree">
                {/* Optionally add a heading */}
                {/* <h4 className="pad-heading">Criteria Tree</h4> */}
                <CriteriaTree node={b.tree} />
            </div>
          );
        case "note": // Updated to handle 'note' type
            return (
                <div key={i} className="pad-block pad-note">
                  <p>{b.text}</p>
                </div>
            );
        default:
            // Fallback for unknown types or if 'text' is expected but missing
             // Check if the block has a 'text' property for the default case
            const blockWithText = b as { text?: string };
            if (blockWithText.text) {
                return <p key={i} className="pad-block pad-unknown">{blockWithText.text}</p>;
            }
            console.warn("Unknown or invalid scratchpad block type:", b);
            return <div key={i} className="pad-block pad-unknown">[Unknown Scratchpad Content]</div>;
      }
    })}
  </div>
);

// CriteriaTree unchanged from original (can be reused as is)
const CriteriaTree: React.FC<{ node: ConditionNode }> = ({ node }) => (
  <ul className="criteria-tree-list">
    <li>
      <span className="criteria-label">{node.label}</span>
      {node.operator && (
        <span className="criteria-operator">({node.operator})</span>
      )}
      {node.evidence && (
        <ul className="evidence-list">
          {node.evidence.map((e, i) => (
            <li key={i} title={e.fhirSource || "No FHIR Source"}>{e.text}</li>
          ))}
        </ul>
      )}
      {node.conditions?.map((c, i) => (
        <CriteriaTree key={i} node={c} />
      ))}
    </li>
  </ul>
);


// QuestionCard – only change: guard snippet editor visibility
interface QuestionCardProps { 
    question: ClinicianQuestion; 
    currentAnswer: { value: string; snippet: string } | undefined; 
  onAnswer: (
    id: string,
    value: string,
    snippet: string,
    type: ClinicianQuestion["questionType"]
  ) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentAnswer,
  onAnswer,
}) => {
  const [inputValue, setInputValue] = useState<string>(currentAnswer?.value || "");
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(
    // Initialize based on question type and current answer
    (question.questionType === 'boolean' || question.questionType === 'multipleChoice') ? currentAnswer?.value : undefined
  );
  // --- NEW State for multiple selections ---
  // Store selected checkbox labels in a Set for easy add/remove
  const [selectedMultiValues, setSelectedMultiValues] = useState<Set<string>>(new Set());
  // Store the generated snippet for multi-select separately
  const [multiSelectSnippetContent, setMultiSelectSnippetContent] = useState<string>("");
  // --- END NEW State ---
  const [snippetContent, setSnippetContent] = useState<string>(
    currentAnswer?.snippet || ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to initialize state based on currentAnswer prop and question type
  useEffect(() => {
    const answerValue = currentAnswer?.value;
    const answerSnippet = currentAnswer?.snippet || "";
    setSnippetContent(answerSnippet);

    if (question.questionType === 'numeric') { // Updated numeric logic
        setInputValue(answerValue || "");
      setSelectedLabel(undefined);
      setSelectedMultiValues(new Set()); // Clear multi-select
      
      // --- Initialize numeric snippet based on sub-ranges --- 
      let initialSnippet = answerSnippet; // Start with saved snippet
      // Check if no snippet saved AND there's a value AND sub-range snippets exist
      if (!initialSnippet && answerValue && question.proposedSnippetsBySubRange) { 
            const numValue = parseFloat(answerValue);
          if (!isNaN(numValue)) {
              // Find the first matching sub-range
              const matchingSubRange = question.proposedSnippetsBySubRange.find(sub => {
                  const minOk = sub.min === undefined || numValue >= sub.min;
                  const maxOk = sub.max === undefined || numValue <= sub.max;
                  return minOk && maxOk;
              });
              // If a match is found, use its proposed snippet content
              if (matchingSubRange) {
                  initialSnippet = matchingSubRange.proposedSnippet.content.replace('{{value}}', answerValue);
              }
          }
      }
      setSnippetContent(initialSnippet); // Set final initial snippet
      // --- End numeric snippet initialization ---
        
      } else if (question.questionType === 'freeText') {
        setInputValue(answerValue || "");
      setSelectedLabel(undefined);
      setSelectedMultiValues(new Set()); // Clear multi-select
          // Free text: keep saved snippet, otherwise empty
           if (!answerSnippet) setSnippetContent("");
    } else if (question.questionType === 'multipleSelect') {
        setInputValue("");
        setSelectedLabel(undefined);
        // Initialize selectedMultiValues from comma-separated string in answerValue
        const initialMulti = new Set(answerValue ? answerValue.split(',').map(s => s.trim()).filter(Boolean) : []);
        setSelectedMultiValues(initialMulti);
        // Initialize snippet (or generate if needed)
        if (!answerSnippet && question.multiSelectSnippet && initialMulti.size > 0) {
            const choicesString = Array.from(initialMulti).join(', ');
            setSnippetContent(question.multiSelectSnippet.content.replace('$CHOICES', choicesString));
        }
    } else { // boolean or multipleChoice
        setSelectedLabel(answerValue);
      setInputValue("");
      setSelectedMultiValues(new Set()); // Clear multi-select
      // Handle boolean/multi-choice snippet logic on load
        if (answerValue) {
            const opt = question.options?.find(o => o.label === answerValue);
          // If no snippet was saved, use the proposed one from the selected option
          if (!answerSnippet) {
              setSnippetContent(opt?.proposedSnippet?.content || "");
          }
        } else {
          // If no answer selected, clear snippet unless one was saved
           if (!answerSnippet) setSnippetContent("");
      }
    }
  }, [currentAnswer, question]);

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

  // --- NEW Handler for Checkbox changes (multipleSelect) ---
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value: label, checked } = event.target;
      const isNoneOfTheAbove = label === "None of the above";
      let currentSelected = new Set(selectedMultiValues);

      if (isNoneOfTheAbove) {
          if (checked) {
              // If "None" is checked, clear others and select only "None"
              currentSelected = new Set([label]);
          } else {
              // If "None" is unchecked, just remove it (leaving others if any)
              currentSelected.delete(label);
          }
      } else {
          // If any other item is changed
          if (checked) {
              // Add the item and remove "None" if present
              currentSelected.add(label);
              currentSelected.delete("None of the above");
          } else {
              // Just remove the item
              currentSelected.delete(label);
          }
      }

      setSelectedMultiValues(currentSelected);
      setSelectedLabel(undefined); // Clear single select
      setInputValue(""); // Clear text input

      // Generate value string (comma-separated labels)
      const valueString = Array.from(currentSelected).join(', ');

      // --- Snippet Generation Logic --- (Updated)
      let currentSnippet = "";
      const noneIsSelected = currentSelected.has("None of the above");

      if (noneIsSelected && currentSelected.size === 1) {
          // Only "None of the above" is selected
          const noneOption = question.options?.find(o => o.label === "None of the above");
          if (noneOption?.proposedSnippet) {
              currentSnippet = noneOption.proposedSnippet.content;
          }
      } else if (currentSelected.size > 0 && !noneIsSelected) {
          // Other items are selected (and "None" isn't)
          if (question.multiSelectSnippet) {
              // Filter out "None" just in case, though logic above should prevent it
              const choicesString = Array.from(currentSelected)
                  .filter(item => item !== "None of the above")
                  .join(', ');
              currentSnippet = question.multiSelectSnippet.content.replace('$CHOICES', choicesString);
          }
      } 
      // If nothing is selected, currentSnippet remains ""

      setSnippetContent(currentSnippet); // Update snippet state

      // Call onAnswer with the updated value string and snippet
      onAnswer(question.id, valueString, currentSnippet, question.questionType);
  };
  // --- END NEW Handler ---

  // Handler for Numeric/FreeText input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setSelectedLabel(undefined); // Clear radio selection
    setSelectedMultiValues(new Set()); // Clear multi-select
    
    let currentSnippet = ""; // Default to empty unless manually edited or proposal found
    let proposedSnippetFound = false;

    if (question.questionType === 'numeric' && question.proposedSnippetsBySubRange) { // Updated numeric logic
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
             // Find the first matching sub-range
             const matchingSubRange = question.proposedSnippetsBySubRange.find(sub => {
                 const minOk = sub.min === undefined || numValue >= sub.min;
                 const maxOk = sub.max === undefined || numValue <= sub.max;
                 return minOk && maxOk;
             });
             // If a match is found, use its proposed snippet content
             if (matchingSubRange) {
                  currentSnippet = matchingSubRange.proposedSnippet.content.replace('{{value}}', value);
                  proposedSnippetFound = true;
             }
        }
        // Update snippet state ONLY if a proposal was found OR if clearing previous proposal
        if(proposedSnippetFound) {
            setSnippetContent(currentSnippet);
        } else {
            // No matching proposal, clear the snippet state
             setSnippetContent(""); 
             currentSnippet = ""; // Also clear the value to be passed to onAnswer
        }
        
    } else if (question.questionType === 'freeText') {
         // For free text, keep manual edits. Snippet state updated only by handleSnippetChange
         currentSnippet = snippetContent; 
    } else {
         // Should not happen for input change, but clear state just in case
         setSnippetContent("");
         currentSnippet = "";
    }
    
    // Pass back the input value and the potentially updated snippet state
    onAnswer(question.id, value, currentSnippet, question.questionType);
  };

  // Handler for manually editing ANY proposed snippet
  const handleSnippetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newSnippetContent = e.target.value;
      setSnippetContent(newSnippetContent);
      // Determine the primary value (selectedLabel, multi-select string, or inputValue)
      let primaryValue = "";
      if (question.questionType === 'multipleSelect') {
           primaryValue = Array.from(selectedMultiValues).join(', ');
      } else {
          primaryValue = selectedLabel || inputValue || "";
      }
      onAnswer(question.id, primaryValue, newSnippetContent, question.questionType); 
  };

  // --- Update shouldShowSnippetEditor logic ---
  const shouldShowSnippetEditor = useMemo(() => {
      if (question.hideSnippetEditor) return false;

      const noneIsSelected = selectedMultiValues.has("None of the above");
      const noneOption = question.options?.find(o => o.label === "None of the above");

      if (selectedLabel) { // Boolean or MultiChoice
          const opt = question.options?.find(o => o.label === selectedLabel);
          return !!opt?.proposedSnippet || snippetContent.trim() !== '';
      } else if (question.questionType === 'multipleSelect') { 
          // Show if "None" is selected AND its option has a snippet
          if (noneIsSelected && selectedMultiValues.size === 1 && !!noneOption?.proposedSnippet) return true;
          // Show if *other* items are selected AND multiSelectSnippet exists
          if (selectedMultiValues.size > 0 && !noneIsSelected && !!question.multiSelectSnippet) return true;
           // Always show if there's manually entered content
           if (snippetContent.trim() !== '') return true;
           // Otherwise, hide
           return false;
      } else if (question.questionType === 'numeric') { // Updated numeric logic
          if (inputValue) { // Only check if there's an input value
          const numValue = parseFloat(inputValue);
               if (!isNaN(numValue) && question.proposedSnippetsBySubRange) {
                   // Show if ANY matching sub-range has a snippet defined
                   const hasMatchingSnippet = question.proposedSnippetsBySubRange.some(sub => {
                       const minOk = sub.min === undefined || numValue >= sub.min;
                       const maxOk = sub.max === undefined || numValue <= sub.max;
                       // Check if in range AND that sub-range actually *has* a proposed snippet defined
                       return minOk && maxOk && !!sub.proposedSnippet; 
                   });
                   if (hasMatchingSnippet) return true; 
               }
           }
           // Always show if there's manually entered content in the snippet box
           if (snippetContent.trim() !== '') return true;
           return false; // Otherwise hide
      } else if (question.questionType === 'freeText') { // FreeText
          // Always show the optional snippet editor for free text unless hidden by flag
          return true;
      }
      return false; // Default: don't show
  }, [question, selectedLabel, selectedMultiValues, inputValue, snippetContent]);


  // --- RENDER LOGIC ---
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
                      {/* Snippet only shown if selected and editor not hidden */}
                      {selectedLabel === o.label && shouldShowSnippetEditor && (
                         <div className="snippet-container">
                             <p className="snippet-title">
                              Proposed Snippet: 
                               {o.proposedSnippet && <span className="snippet-title-detail"> ({o.proposedSnippet.title})</span>}
                          </p>
                          <textarea
                            ref={textareaRef}
                             className="snippet-textarea"
                             value={snippetContent}
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

        {/* Multiple Select (Checkboxes) - Updated Snippet Rendering */}
        {question.questionType === 'multipleSelect' && (
            <div>
              {question.options?.map((o, i) => {
                  const inputId = `${question.id}-${i}`;
                  // Determine checked state based on the Set
                  const isChecked = selectedMultiValues.has(o.label);
                  return (
                      <div key={i} className="form-group form-group-checkbox">
                          <label htmlFor={inputId} className="checkbox-label">
                              <input
                                  type="checkbox"
                                  value={o.label}
                                  id={inputId}
                                  name={question.id} // Conceptual grouping
                                  checked={isChecked}
                                  onChange={handleCheckboxChange}
                                  className="form-checkbox"
                              />
                              <span className="checkbox-option-label">{o.label}</span>
                          </label>
                      </div>
                  )
              })}
              {/* Snippet editor visibility and content updated */}
              {shouldShowSnippetEditor && (
                 <div className="snippet-container">
                     <p className="snippet-title">
                       {/* Conditional Title based on selection state */} 
                       {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1)
                           ? (question.options?.find(o=>o.label==="None of the above")?.proposedSnippet ? `Proposed Snippet (None Selected):` : 'Optional Note:')
                           : (selectedMultiValues.size > 0 && question.multiSelectSnippet) 
                               ? `Proposed Snippet (Selection: ${Array.from(selectedMultiValues).filter(l=>l!=="None of the above").join(', ')}):` 
                               : 'Optional Note:' // Fallback if nothing relevant is selected but editor shown due to manual edits
                       }
                       {/* Show specific snippet title if available */} 
                       {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1) && question.options?.find(o=>o.label==="None of the above")?.proposedSnippet &&
                           <span className="snippet-title-detail"> ({question.options.find(o=>o.label==="None of the above")?.proposedSnippet?.title})</span>}
                       {(selectedMultiValues.size > 0 && !selectedMultiValues.has("None of the above")) && question.multiSelectSnippet && 
                           <span className="snippet-title-detail"> ({question.multiSelectSnippet.title})</span>}
                   </p>
                   <textarea
                     ref={textareaRef}
                     className="snippet-textarea"
                     value={snippetContent}
                     onChange={handleSnippetChange}
                     placeholder={
                         (selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1) 
                         ? "Edit snippet for \"None of the above\"..." 
                         : (selectedMultiValues.size > 0 ? "Edit snippet for selected items..." : "Add an optional note...")
                     }
                   />
                   {/* Conditional location suggestion */}
                    {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1) && question.options?.find(o=>o.label==="None of the above")?.proposedSnippet?.locationSuggestion && (
                        <p className="snippet-suggestion">Suggestion: {question.options.find(o=>o.label==="None of the above")?.proposedSnippet?.locationSuggestion}</p>
                    )}
                    {(selectedMultiValues.size > 0 && !selectedMultiValues.has("None of the above")) && question.multiSelectSnippet?.locationSuggestion && (
                        <p className="snippet-suggestion">Suggestion: {question.multiSelectSnippet.locationSuggestion}</p>
                    )}
                 </div>
              )}
            </div>
        )}

        {/* Numeric Input */} 
        {question.questionType === 'numeric' && (
            <div className="form-group">
                 <input 
                    type="number" 
                    value={inputValue}
                    onChange={handleInputChange}
                    min={question.numericRange?.min} // Still use top-level range for input constraints
                    max={question.numericRange?.max}
                    placeholder={`Enter number${question.numericRange?.units ? ` (${question.numericRange.units})` : ''}`}
                    className="form-input form-input-number"
                 />
                 {/* Snippet editor visibility based on updated shouldShowSnippetEditor */} 
                 {shouldShowSnippetEditor && (
                      <div className="snippet-container">
                        {/* Find the title/suggestion of the *currently matching* sub-range */} 
                        {(() => {
                            const numValue = parseFloat(inputValue);
                            let matchingSnippet: ProposedSnippet | undefined;
                            let locationSuggestion: string | undefined;
                            // Find the matching sub-range based on the current numeric input value
                            if (!isNaN(numValue) && question.proposedSnippetsBySubRange) {
                                const matchingSubRange = question.proposedSnippetsBySubRange.find(sub => {
                                     const minOk = sub.min === undefined || numValue >= sub.min;
                                     const maxOk = sub.max === undefined || numValue <= sub.max;
                                     return minOk && maxOk;
                                });
                                // If a match is found, get its snippet details
                                if (matchingSubRange) {
                                    matchingSnippet = matchingSubRange.proposedSnippet;
                                    locationSuggestion = matchingSnippet?.locationSuggestion;
                                }
                            }
                            // Render the snippet editor using the found details (or defaults)
                            return (
                                <> 
                        <p className="snippet-title">
                                     {/* Title depends on whether a matching snippet was found */} 
                                    {matchingSnippet ? 'Proposed Snippet:' : 'Optional Note/Snippet:'}
                                    {matchingSnippet && <span className="snippet-title-detail"> ({matchingSnippet.title})</span>}
                       </p>
                       <textarea
                         ref={textareaRef}
                          className="snippet-textarea"
                                    value={snippetContent} // Value is managed by state
                                   onChange={handleSnippetChange} // Manual edits handled here
                                   placeholder={matchingSnippet ? 'Edit proposed snippet...' : 'Add an optional note...'} // Placeholder depends on match
                       />
                                 {/* Show location suggestion only if a matching snippet has one */} 
                                 {locationSuggestion && (
                                   <p className="snippet-suggestion">Suggestion: {locationSuggestion}</p>
                       )}
                                </> 
                            );
                        })()}
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
                 {/* Optional snippet editor for free text, only shown if not hidden by flag */}
                 {shouldShowSnippetEditor && (
                   <div className="snippet-container">
                     <p className="snippet-title">Optional Note/Snippet:</p>
                     <textarea
                         ref={textareaRef}
                         className="snippet-textarea snippet-textarea-optional"
                         value={snippetContent}
                         onChange={handleSnippetChange}
                         placeholder="Add any relevant note here..."
                     />
                 </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};


// ResultCard simple wrapper (unchanged)
const ResultCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="result-card">
    <div className="card-content">
      <h2 className="result-title">{title}</h2>
      {children}
    </div>
  </div>
);

// 🩺 Component to display EHR Search status/results
const EhrSearchCard: React.FC<{ keywords: string[] | null; resultSummary: string | null }> = ({ keywords, resultSummary }) => {
  if (!keywords && !resultSummary) {
    return null; // Don't render if neither keywords nor summary are present
  }

  return (
    <div className="ehr-search-card pad-block"> {/* Use pad-block for similar styling */} 
      <h4 className="ehr-search-heading pad-heading">EHR Search</h4>
      {keywords && (
        <p className="ehr-search-status">⏳ Searching for: <i>{keywords.join(', ')}</i>...</p>
      )}
      {resultSummary && (
        <div className="ehr-search-result">
          <p className="ehr-search-status">✓ Search Complete. Summary:</p>
          <p className="ehr-search-summary">{resultSummary}</p>
        </div>
      )}
    </div>
  );
};

// 📦 Component to display A2A Task Artifacts
const ArtifactsDisplay: React.FC<{ artifacts: Artifact[] | undefined }> = ({ artifacts }) => {
  if (!artifacts || artifacts.length === 0) {
    return null; // Don't render if no artifacts
  }

  return (
    <div className="artifacts-section">
      <h3 className="section-title">Task Artifacts ({artifacts.length})</h3>
      <div className="artifacts-list">
        {artifacts.map((artifact, index) => (
          <div key={artifact.id || index} className="artifact-item">
            <p className="artifact-details">
              <span className="artifact-name">{artifact.name || 'Untitled Artifact'}</span>
              {/* Check if timestamp exists before creating Date */} 
              {artifact.timestamp && (
                <span className="artifact-timestamp">({new Date(artifact.timestamp).toLocaleString()})</span>
              )}
            </p>
            {artifact.parts?.map((part, partIndex) => {
              if (!part) return null; // Add null check for part itself
              if (part.type === 'data') {
                return (
                  <pre key={partIndex} className="artifact-data">
                    {JSON.stringify(part.data, null, 2)}
                  </pre>
                );
              } else if (part.type === 'text') {
                 return <p key={partIndex} className="artifact-text">{part.text}</p>;
              } else if (part.type === 'file') {
                 // Added nullish coalescing for safety
                 return <p key={partIndex} className="artifact-file-info"><i>File: {part.file?.name ?? 'untitled'} ({part.file?.mimeType ?? 'unknown type'})</i></p>;
              }
              // Fallback for any other potential part types (or invalid parts)
              // Removed explicit access to part.type as TS infers it cannot be the handled types
              return <p key={partIndex}><i>[Unsupported or invalid artifact part content]</i></p>; 
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Debug Info Components ---
const ScratchpadDebugInfo: React.FC<{
    scratchpad: ScratchpadBlock[] | null | undefined;
    keywords: string[] | null;
    resultSummary: string | null;
}> = ({ scratchpad, keywords, resultSummary }) => (
    <div className="debug-info-card" style={{ border: '1px dashed #ccc', padding: '8px', marginBottom: '10px', fontSize: '0.9em', background: '#f9f9f9' }}>
        <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Scratchpad State:</h4>
        <p style={{ margin: '2px 0' }}>Blocks: {scratchpad?.length ?? 0}</p>
        <p style={{ margin: '2px 0' }}>Keywords: {keywords ? `"${keywords.join(', ')}"` : 'None'}</p>
        <p style={{ margin: '2px 0' }}>Result: {resultSummary ? `"${resultSummary.substring(0, 50)}${resultSummary.length > 50 ? '...' : ''}"` : 'None'}</p>
    </div>
);

// --- Snippet Debug Info ---
const SnippetDebugInfo: React.FC<{ endorsed: Record<string, { title: string; content: string; endorsed: boolean }> }> = ({ endorsed }) => {
  const total = Object.keys(endorsed).length;
  const signed = Object.values(endorsed).filter(s => s.endorsed).length;
  return (
    <div className="debug-info-card" style={{ border: '1px dashed #66c', padding: '8px', marginBottom: '10px', fontSize: '0.9em', background: '#eef' }}>
      <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Snippet State:</h4>
      <p style={{ margin: '2px 0' }}>Total endorsed snippets: {total}</p>
      <p style={{ margin: '2px 0' }}>Endorsed snippets: {signed}</p>
    </div>
  );
};

// --- UPDATED: Detailed Liaison State Info ---
const LiaisonStateInfo: React.FC<{
    state: ReturnType<typeof useTaskLiaison>['state'];
    liaisonActions: ReturnType<typeof useTaskLiaison>['actions'];
}> = ({ state, liaisonActions }) => {

    const handleDebugSend = () => {
        const messageText = window.prompt("Enter message text to send to agent:");
        if (messageText && messageText.trim()) {
            const debugMessage: Message = {
                role: 'user',
                parts: [{ type: 'text', text: messageText }]
            };
            console.log("[Debug] Sending message:", debugMessage);
            liaisonActions.sendInput(debugMessage);
        } else {
             console.log("[Debug] Message prompt cancelled or empty.");
        }
    };

    return (
        <div className="debug-info-card" style={{ border: '1px dashed #aaa', padding: '8px', marginBottom: '10px', fontSize: '0.9em', background: '#f0f0f0' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Liaison/Task State:</h4>
            <p style={{ margin: '2px 0' }}>Liaison Status: <strong>{state.status}</strong></p>
            {state.error && <p style={{ margin: '2px 0', color: 'red' }}>Error: {state.error.message}</p>}
            <p style={{ margin: '2px 0' }}>Task ID: {state.task?.id ?? 'N/A'}</p>
            <p style={{ margin: '2px 0' }}>Task Status: {state.task?.status ? String(state.task.status) : 'N/A'}</p>
            <p style={{ margin: '2px 0' }}>History Items: {state.task?.history?.length ?? 0}</p>
            <p style={{ margin: '2px 0' }}>Artifacts: {state.task?.artifacts?.length ?? 0}</p>
            <button
                onClick={handleDebugSend}
                style={{ marginTop: '8px', padding: '3px 6px', fontSize: '0.9em' }}
                 // Disable only if liaison isn't initialized to avoid errors sending
                 disabled={state.status === 'idle' || state.status === 'connecting'}
            >
                Debug: Send Message to Agent
            </button>
        </div>
    );
}
// --- END Debug Info Components ---

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN WORKFLOW COMPONENT – adapted to use new hooks and store
// ─────────────────────────────────────────────────────────────────────────────
const Orders2Tab: React.FC = () => {
  
  // --- Zustand Store Integration ---
  const setUiMode = useBridgeStore(state => state.setUiMode);
  const setCriteriaTree = useBridgeStore(state => state.setCriteriaTree);
  const criteriaTree =    useBridgeStore(state => state.criteriaTree);
  const setRemoteDecision = useBridgeStore(state => state.setRemoteDecision);
  const resetBridgeStore = useBridgeStore(state => state.reset);
  // --- NEW: Read criteriaTree from store ---

  // --- Core Hooks Instantiation --- ( EHR Search First )
    const { ehrData, effectiveApiKey } = useEhrContext(); 
  const { ehrSearch, isEhrDataAvailable } = useEhrSearch();

  // --- A2A Liaison Hook (Moved Up Slightly) ---
  const A2A_AGENT_URL = 'http://localhost:3001/a2a'; 
  const {
    state: liaisonState,
    actions: liaisonActions
  } = useTaskLiaison({ agentUrl: A2A_AGENT_URL });

  // --- State Variables ---
  const [currentQuestions, setCurrentQuestions] = useState<ClinicianQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, { value: string; snippet: string }>>({}); 
  const [treatment, setTreatment] = useState<string>("Standard rTMS");
  const [indication, setIndication] = useState<string>("Bipolar I Depression");
  const [policyDataProcessed, setPolicyDataProcessed] = useState<boolean>(false);
  const [finalEvalResultData, setFinalEvalResultData] = useState<any>(null);
  // Ref to hold latest endorsed snippets from LLM hook (updated via effect)

  // --- Callback Definition (FIXED SUCCESS CASE) ---
  const handleIntent = (intent: ClinicianIntent) => {
    console.log("[Orders2Tab] Received intent:", intent.type, intent);
    switch (intent.type) {
      case 'ASK':
        setCurrentQuestions(intent.questions || []);
            setUserAnswers({});
        setUiMode('collecting');
            break;
      case 'SUCCESS':
        console.log("[Orders2Tab] SUCCESS intent received. Building evidence...");

        // --- FIX: Build evidence BEFORE sending ---
        try {
            const evidencePayload = buildEvidence({
                criteriaTree: intent.criteriaTree,
                endorsedSnippets: endorsedSnippets,
                fullEhrData: ehrData,
                treatment,
                indication,
            });
            setCriteriaTree(intent.criteriaTree);
            console.log("[Orders2Tab] Built evidence payload:", evidencePayload);

            const finalMessage: Message = {
                    role: 'user',
              parts: [
                { type: 'data', data: evidencePayload.criteriaMetTree },
                { type: 'data', data: evidencePayload.filteredEhr }
              ]
            };

            liaisonActions.sendInput(finalMessage);
            console.log("[Orders2Tab] Submitted final message object to A2A agent.");
            setUiMode('submitting');

        } catch (err: any) {
            console.error("[Orders2Tab] Error building or submitting final message:", err);
            setUiMode('error');
            // TODO: Add a user-visible error message here
        }
             break;

      case 'FAIL':
        console.error("[Orders2Tab] FAIL intent received:", intent.reason);
        setUiMode('error');
        // TODO: Display intent.reason to the user
             break;
          }
  // Added dependencies needed for buildEvidence
  }
  // , [setUiMode, setCriteriaTree, ehrData, treatment, indication, liaisonActions, liaisonState.status]);


  // --- Instantiate LLM Hook ---
  const llm = useMedicalNecessityLlm({
    apiKey: effectiveApiKey,
    ehrSearch: ehrSearch,
    onIntent: handleIntent,
  });
  console.log("LLM sinppets", llm.endorsedSnippets);
  // --- Destructure LLM state/functions ---
  const {
    isLoading: isLlmLoading,
    error: llmError,
    scratchpad: llmScratchpad,
    lastEhrSearchKeywords,
    lastEhrSearchResultCount,
    endorsedSnippets,
    start: llmStart // Destructure start function for stable reference
  } = llm;


  const [readToLength, setReadToLength] = useState<number>(0);
  // --- useEffect to handle A2A Task Updates ---
  useEffect(() => {
    // Handle errors from hooks
    const currentError = liaisonState.error?.message || llmError?.message || null; // Use llmError
    if (currentError) {
        console.error("[Orders2Tab Effect] Error detected:", currentError);
        setUiMode('error'); 
        // TODO: Consider setting an error message in the store
        return; // Stop processing on error
    }

    if (liaisonState.status === 'awaiting-input' && policyDataProcessed) {
      if (readToLength >= liaisonState.task?.history?.length! || 0) {
        console.log("[Orders2Tab Effect] No new messages to read. Skipping followup.");
        return;
      }

      setReadToLength(liaisonState.task?.history?.length || 0);
      let followup =   `Payor Agent requested more info. Please read the followiing message and proceed to gather / evaluate / ask user.
        <payorSaid>
        ${JSON.stringify(liaisonState.task?.history?.slice().reverse()[0])}
        </payorSaid>`;
      llm.resumeEvaluation(followup);
      return;
    }
    // --- Process received policy files ---
    if (!policyDataProcessed && liaisonState.task?.history) {
        const lastAgentMessage = liaisonState.task.history.slice().reverse().find(m => m.role === 'agent');
        if (lastAgentMessage?.parts) {
            let pdfPart: FilePart | undefined;
            let mdPart: FilePart | undefined;
            for (const part of lastAgentMessage.parts) {
                 if (part.type === 'file' && part.file?.mimeType === 'application/pdf') pdfPart = part as FilePart;
                 else if (part.type === 'file' && part.file?.mimeType === 'text/markdown') mdPart = part as FilePart;
            }
            const policyFileData = mdPart?.file?.bytes || pdfPart?.file?.bytes;
            const policyMimeType = mdPart?.file?.bytes ? 'text/markdown' : pdfPart?.file?.bytes ? 'application/pdf' : undefined;

            if (policyFileData && policyMimeType) {
                console.log(`[Orders2Tab Effect] Found policy file (${policyMimeType}). Starting internal LLM workflow.`);
                setPolicyDataProcessed(true); 
                setUiMode('submitting');

                const adminDetails = extractPatientAdminDetails(ehrData);
                console.log("[Orders2Tab Effect] Calling llm.start...");
                // Use the destructured, stable function reference
                llmStart({ // <--- Use llmStart here
                    patientDetails: adminDetails,
                    treatment: treatment,
                    indication: indication,
                    policyFileBase64: policyFileData,
                    policyMimeType: policyMimeType
                });
            } else if (liaisonState.status !== 'running' && liaisonState.status !== 'connecting'){
                 console.warn("[Orders2Tab Effect] Agent message found, but no policy file part detected.");
            }
        }
        setReadToLength(liaisonState.task?.history?.length || 0);
    }

    // --- Handle final A2A task completion --- (Simplified Error Handling)
    if (liaisonState.status === 'completed' || liaisonState.status === 'error') { 
        if (liaisonState.status === 'completed') {
             const finalArtifact = liaisonState.task?.artifacts?.find(a => a.name === 'prior-auth-evaluation-final' || a.name === 'prior-auth-approval');
             const finalDataPart = finalArtifact?.parts?.find(p => p.type === 'data');
            let finalStatus: 'Approved' | 'Denied' | 'CannotApprove' | undefined = undefined;
             if (finalDataPart && finalDataPart.type === 'data') {
                setFinalEvalResultData(finalDataPart.data); // Keep temp state for now
                const status = (finalDataPart.data as any)?.status;
                if (status === 'Approved' || status === 'Denied' || status === 'CannotApprove') {
                    finalStatus = status;
                }
                console.log("[Orders2Tab Effect] Stored final A2A data. Status:", status);
            }
            setRemoteDecision(finalStatus);
            setUiMode('done');
        } else { // liaisonState.status === 'error' handled by top error check now
             // Error state is already set at the beginning of the effect
        }
    }

  // Removed SYSTEM_PROMPT from dependencies
  }, [readToLength, liaisonState, policyDataProcessed, treatment, indication, ehrData, llmStart, setUiMode, setCriteriaTree, setRemoteDecision, llm.resumeEvaluation]); // llmStart is now a dependency


  // --- Other Event Handlers (handleStartPA, handleViewFile, handleAnswer, handleSubmitAnswers, etc.) ---
  // handleStartPA: Only initiates A2A task now
  const handleStartPA = useCallback(async () => {
    console.log("[Orders2Tab] handleStartPA triggered");
    resetBridgeStore(); 
    setCurrentQuestions([]); 
    setUserAnswers({}); 
    setPolicyDataProcessed(false);
    setFinalEvalResultData(null);

    if (!isEhrDataAvailable) { 
        console.error("Cannot start: EHR data is not loaded.");
        setUiMode('error');
        return;
    }
    if (!treatment || !indication) {
         console.error("Cannot start: Treatment and Indication missing.");
         setUiMode('error');
        return;
    }

    setUiMode('fetching-policy'); 

    const adminDetails = extractPatientAdminDetails(ehrData);
    const initialUserMessageText = `Start prior auth check.\nTreatment: ${treatment}\nIndication: ${indication}\n\n${adminDetails}`;
    const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: initialUserMessageText }] };

    try {
        liaisonActions.startTask(initialMessage);
    } catch (err: any) {
        console.error("[Orders2Tab] Error starting A2A task:", err);
        setUiMode('error');
    }

  }, [ehrData, treatment, indication, liaisonActions, isEhrDataAvailable, resetBridgeStore, setUiMode]); 

  const handleViewFile = useCallback((part: Part) => {
       if (part.type !== 'file' || !part.file?.bytes || !part.file?.mimeType) return;
       try {
          const byteCharacters = atob(part.file.bytes);
          const byteNumbers = new Array(byteCharacters.length);
           for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: part.file.mimeType });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
       } catch (error) { console.error('Error opening file blob:', error); }
   }, []);

  const handleAnswer = useCallback((questionId: string, value: string, snippetContent: string) => {
      setUserAnswers(prev => ({ ...prev, [questionId]: { value, snippet: snippetContent } }));
    }, []);

    const handleSubmitAnswers = useCallback(() => {
      console.log("[Orders2Tab] Submitting answers via llm.submitAnswers");
      setUiMode("submitting");
      llm.submitAnswers(userAnswers);
    }, [userAnswers, llm, setUiMode, currentQuestions]); 

    const isReadyToSubmit = useMemo(() => {
      const currentUiMode = useBridgeStore.getState().uiMode;
      if (currentUiMode !== 'collecting' || !currentQuestions?.length) return false;
      return currentQuestions.every(q => userAnswers[q.id]?.value?.trim() !== '');
  }, [currentQuestions, userAnswers]); 


  // --- UI RENDER ---
  const uiMode = useBridgeStore(state => state.uiMode);
  // Combine loading states
  const isLoading = isLlmLoading || liaisonState.status === 'running' || liaisonState.status === 'connecting';
  // Combine error messages
  const displayError = llmError?.message || liaisonState.error?.message || null;

    return (
    <div className={`orders-tab ${useBridgeStore.getState().remoteDecision === 'Approved' ? 'is-approved' : ''}`}>
      <h2>Prior Auth Workflow</h2>

        {uiMode === "idle" && (
          <div className="order-form-section">
              <div className="form-group">
                  <label htmlFor="treatment" className="form-label">Treatment:</label>
                        <input 
                           type="text" id="treatment" value={treatment}
                           onChange={(e) => setTreatment(e.target.value)} className="form-input"
                      disabled={isLoading}
                        />
                     </div>
                     <div className="form-group">
                  <label htmlFor="indication" className="form-label">Indication:</label>
                         <input 
                           type="text" id="indication" value={indication}
                           onChange={(e) => setIndication(e.target.value)} className="form-input"
                      disabled={isLoading}
                        />
                     </div>
                <button 
                    onClick={handleStartPA} className="btn btn-primary btn-start-pa"
                    disabled={isLoading || !isEhrDataAvailable}
                >
                    {isLoading ? "Preparing..." : `Request Prior Auth`}
                </button>
                {!isEhrDataAvailable && <p>Waiting for EHR...</p>}
                {displayError && <div className="error-message">Error: {displayError}</div>} 
          </div>
      )}

         {uiMode !== 'idle' && (
             <>
                 {isLoading && <div className="loading-indicator">Processing... (Mode: {uiMode} / Liaison: {liaisonState.status} / LLM: {isLlmLoading?'Loading':'Idle'})</div>}
                 {displayError && <div className="error-message" style={{ marginBottom: '1rem' }}>Error: {displayError}</div>}

             <div className="active-workflow-layout">
                 <div className="workflow-column questions-column">
                         {uiMode === 'collecting' && currentQuestions.length > 0 && (
                        <>
                            <h3 className="column-title">Clinician Input</h3>
                            <div className="questions-section">
                                     {currentQuestions.map(q => (
                                        <QuestionCard key={q.id} question={q} currentAnswer={userAnswers[q.id]} onAnswer={handleAnswer} />
                                     ))}
                                     <button onClick={handleSubmitAnswers} disabled={!isReadyToSubmit || isLoading} className="btn btn-success btn-submit-answers">
                        {isLoading ? "Submitting..." : "Submit Answers"}
                     </button>
                </div>
                        </>
                    )}
                         {/* Basic placeholders for other states */} 
                         {uiMode === 'fetching-policy' && <p>Fetching policy...</p>}
                         {uiMode === 'submitting' && <p>Processing...</p>}
                         
                         {/* --- Render Tree when Done --- */}
                         {uiMode === 'done' && criteriaTree && (
                             <>
                                <h3 className="column-title">Final Criteria Evaluation</h3>
                                <div className="criteria-tree-container criteria-tree-success"> {/* Optional: Add styling class */}
                                     <CriteriaTree node={criteriaTree} />
                            </div>
                                    </> 
                                )}
                         {/* --- Fallback message when Done but no tree --- */}
                         {uiMode === 'done' && !criteriaTree && (
                              <p>Workflow Complete. No final criteria tree available.</p>
                         )}

                         {uiMode === 'error' && <p>An error occurred. Please check details.</p>}
                            </div>

                 <div className="workflow-column scratchpad-column">
                    <h3 className="column-title">AI Scratchpad</h3>

                       {/* --- End Debug Info --- */}

                        {/* Conditional EHR Search Card */}
                        {(() => {
                            const showSearch = lastEhrSearchKeywords || lastEhrSearchResultCount;
                            // Removed console log
                            return showSearch ? (
                    <EhrSearchCard 
                                    keywords={lastEhrSearchKeywords}
                                    resultSummary={
                                        "Results: " + lastEhrSearchResultCount
                                    }
                                />
                            ) : null;
                        })()}

                        {/* Conditional Scratchpad */}
                        {(() => {
                            const showScratchpad = llmScratchpad && llmScratchpad.length > 0;
                            // Removed console log
                            return showScratchpad ? (
                                <div className="scratchpad-section" style={{ marginTop: '1rem' }}>
                                    <Scratchpad blocks={llmScratchpad} />
                            </div>
                            ) : null;
                        })()}

                        {/* Placeholder Text */}
                        {(() => {
                            const showPlaceholder = !lastEhrSearchKeywords && !lastEhrSearchResultCount && (!llmScratchpad || llmScratchpad.length === 0);
                            // Removed console log
                            return showPlaceholder ? <p className="placeholder-text">Scratchpad is empty.</p> : null;
                        })()}
                 </div>

                 <div className="workflow-column a2a-history-column">
                    <h3 className="column-title">PA Agent Conversation</h3>
                       {/* Debug snippet info */}
                       <SnippetDebugInfo endorsed={endorsedSnippets} />
                       {/* Liaison info */}
                       <LiaisonStateInfo state={liaisonState} liaisonActions={liaisonActions} />

                       {/* Conversation History Rendering */}
                     {liaisonState.task?.history && liaisonState.task.history.length > 0 ? (
                          <div className="conversation-history a2a-history-display" style={{ marginTop: '1rem' }}>
                             {liaisonState.task.history.map((message: Message, index: number) => {
                                 const isUser = message.role === 'user';
                                 return (
                                      <div key={`a2a-hist-${index}`} style={{ marginBottom:'5px', padding:'5px 8px', borderRadius:'4px', backgroundColor: isUser ? '#e1f5fe' : '#f0f0f0' }}>
                                         <strong>{isUser ? 'User:' : 'Agent:'}</strong>
                                         {message.parts.map((part, partIndex) => {
                                              if (part.type === 'text') return <span key={partIndex}>{part.text}</span>;
                                              if (part.type === 'file' && part.file) {
                                                 const filePart = part as FilePart; 
                                                 return (
                                                     <div key={partIndex} style={{ marginTop: '5px', fontSize: '0.9em' }}>
                                                          <span style={{ fontStyle: 'italic' }}>File: {filePart.file.name || 'untitled'}</span> (
                                                          <button onClick={() => handleViewFile(filePart)} disabled={!filePart.file?.bytes} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>View</button>
                                                         )
                                                     </div>
                                                 );
                                             }
                                              if (part.type === 'data') return <pre key={partIndex} style={{ fontSize: '0.8em', background: '#eee', padding: '3px', marginTop: '5px' }}>Data: {JSON.stringify(part.data)}</pre>;
                                             return <span key={partIndex}> (Unsupported Part Type: {part.type})</span>;
                                         })}
                                     </div>
                                 );
                             })}
                         </div>
                       ) : (<p className="placeholder-text">No A2A task history yet.</p>)}
                            </div>
             </div>
          </>
      )}

        {uiMode === 'done' && (
            <div className="conclusion-section">
                {/* Final Result Cards */}
                {useBridgeStore.getState().remoteDecision === 'Approved' && <ResultCard title="Approved">PA Approved by Agent.</ResultCard>}
                {useBridgeStore.getState().remoteDecision === 'Denied' && <ResultCard title="Denied">PA Denied by Agent.</ResultCard>}
                {useBridgeStore.getState().remoteDecision === 'CannotApprove' && <ResultCard title="Cannot Approve">Agent could not approve.</ResultCard>}
                {!useBridgeStore.getState().remoteDecision && <ResultCard title="Concluded">Workflow finished.</ResultCard>}

                {/* Start New Button */}
                    <button 
                      onClick={() => { 
                        if (liaisonState.status === 'running') {
                            console.log("[Orders2Tab] Start New clicked, cancelling active liaison task.");
                            liaisonActions.cancelTask();
                        }
                        resetBridgeStore();
                        setCurrentQuestions([]);
                        setUserAnswers({});
                          setPolicyDataProcessed(false); 
                        setFinalEvalResultData(null);
                        setUiMode('idle'); // Explicitly set back to idle
                    }}
                    disabled={isLoading && liaisonState.status !== 'idle' && liaisonState.status !== 'completed' && liaisonState.status !== 'error'} // Disable while loading unless already finished/error
                    className="btn btn-secondary btn-start-new">
                    Start New
                    </button>
                </div>
            )}

      <ArtifactsDisplay artifacts={liaisonState.task?.artifacts} />

        </div>
    );
};

export default Orders2Tab;

// ─────────────────────────────────────────────────────────────────────────────
// 5. HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// --- NEW Helper to Extract Patient Administrative Details ---
