import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ClinicianQuestion, ProposedSnippet } from '../../types/priorAuthTypes';
// --- Copied from Orders2Tab.tsx --- 

// QuestionCard – only change: guard snippet editor visibility
interface QuestionCardProps {
    question: ClinicianQuestion;
    // Use the Answer type definition for consistency if available, or keep inline
    currentAnswer: { value: string; snippet: string } | undefined;
    onAnswer: (
        id: string,
        value: string,
        snippet: string,
        type: ClinicianQuestion["questionType"]
    ) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ // Added export
  question,
  currentAnswer,
  onAnswer,
}) => {
  const [inputValue, setInputValue] = useState<string>(currentAnswer?.value || "");
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(
    (question.questionType === 'boolean' || question.questionType === 'multipleChoice') ? currentAnswer?.value : undefined
  );
  const [selectedMultiValues, setSelectedMultiValues] = useState<Set<string>>(new Set());
  const [multiSelectSnippetContent, setMultiSelectSnippetContent] = useState<string>("");
  const [snippetContent, setSnippetContent] = useState<string>(
    currentAnswer?.snippet || ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to initialize state (copied)
  useEffect(() => {
    const answerValue = currentAnswer?.value;
    const answerSnippet = currentAnswer?.snippet || "";
    setSnippetContent(answerSnippet);

    if (question.questionType === 'numeric') {
        setInputValue(answerValue || "");
        setSelectedLabel(undefined);
        setSelectedMultiValues(new Set()); 
        let initialSnippet = answerSnippet; 
        if (!initialSnippet && answerValue && question.proposedSnippetsBySubRange) { 
            const numValue = parseFloat(answerValue);
            if (!isNaN(numValue)) {
                const matchingSubRange = question.proposedSnippetsBySubRange.find(sub => {
                    const minOk = sub.min === undefined || numValue >= sub.min;
                    const maxOk = sub.max === undefined || numValue <= sub.max;
                    return minOk && maxOk;
                });
                if (matchingSubRange?.proposedSnippet) { // Check if proposedSnippet exists
                    initialSnippet = matchingSubRange.proposedSnippet.content.replace('{{value}}', answerValue);
                }
            }
        }
        setSnippetContent(initialSnippet);
    } else if (question.questionType === 'freeText') {
        setInputValue(answerValue || "");
        setSelectedLabel(undefined);
        setSelectedMultiValues(new Set());
        if (!answerSnippet) setSnippetContent("");
    } else if (question.questionType === 'multipleSelect') {
        setInputValue("");
        setSelectedLabel(undefined);
        const initialMulti = new Set(answerValue ? answerValue.split(',').map(s => s.trim()).filter(Boolean) : []);
        setSelectedMultiValues(initialMulti);
        if (!answerSnippet && question.multiSelectSnippet && initialMulti.size > 0) {
            const choicesString = Array.from(initialMulti).join(', ');
            setSnippetContent(question.multiSelectSnippet.content.replace('$CHOICES', choicesString));
        }
    } else { // boolean or multipleChoice
        setSelectedLabel(answerValue);
        setInputValue("");
        setSelectedMultiValues(new Set());
        if (answerValue) {
            const opt = question.options?.find(o => o.label === answerValue);
            if (!answerSnippet) {
                setSnippetContent(opt?.proposedSnippet?.content || "");
            }
        } else {
            if (!answerSnippet) setSnippetContent("");
        }
    }
  }, [currentAnswer, question]);

  // handleRadioSelection (copied)
  const handleRadioSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const label = event.target.value;
    setSelectedLabel(label);
    setInputValue("");
    setSelectedMultiValues(new Set()); // Clear multi-select on radio change
    const opt = question.options?.find(o => o.label === label);
    const proposedSnippet = opt?.proposedSnippet?.content || "";
    setSnippetContent(proposedSnippet);
    onAnswer(question.id, label, proposedSnippet, question.questionType);
  };

  // handleCheckboxChange (copied)
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value: label, checked } = event.target;
      const isNoneOfTheAbove = label === "None of the above";
      let currentSelected = new Set(selectedMultiValues);

      if (isNoneOfTheAbove) {
          if (checked) {
              currentSelected = new Set([label]);
          } else {
              currentSelected.delete(label);
          }
      } else {
          if (checked) {
              currentSelected.add(label);
              currentSelected.delete("None of the above");
          } else {
              currentSelected.delete(label);
          }
      }

      setSelectedMultiValues(currentSelected);
      setSelectedLabel(undefined); 
      setInputValue(""); 

      const valueString = Array.from(currentSelected).join(', ');
      let currentSnippet = "";
      const noneIsSelected = currentSelected.has("None of the above");

      if (noneIsSelected && currentSelected.size === 1) {
          const noneOption = question.options?.find(o => o.label === "None of the above");
          if (noneOption?.proposedSnippet) {
              currentSnippet = noneOption.proposedSnippet.content;
          }
      } else if (currentSelected.size > 0 && !noneIsSelected) {
          if (question.multiSelectSnippet) {
              const choicesString = Array.from(currentSelected)
                  .filter(item => item !== "None of the above")
                  .join(', ');
              currentSnippet = question.multiSelectSnippet.content.replace('$CHOICES', choicesString);
          }
      } 

      setSnippetContent(currentSnippet);
      onAnswer(question.id, valueString, currentSnippet, question.questionType);
  };

  // handleInputChange (copied)
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setSelectedLabel(undefined); 
    setSelectedMultiValues(new Set()); 
    
    let currentSnippet = "";
    let proposedSnippetFound = false;

    if (question.questionType === 'numeric' && question.proposedSnippetsBySubRange) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
             const matchingSubRange = question.proposedSnippetsBySubRange.find(sub => {
                 const minOk = sub.min === undefined || numValue >= sub.min;
                 const maxOk = sub.max === undefined || numValue <= sub.max;
                 return minOk && maxOk;
             });
             if (matchingSubRange?.proposedSnippet) { // Check proposedSnippet exists
                  currentSnippet = matchingSubRange.proposedSnippet.content.replace('{{value}}', value);
                  proposedSnippetFound = true;
             }
        }
        if(proposedSnippetFound) {
            setSnippetContent(currentSnippet);
        } else {
             setSnippetContent(""); 
             currentSnippet = "";
        }
    } else if (question.questionType === 'freeText') {
         currentSnippet = snippetContent; // Keep manual edits for freeText
    } else {
         setSnippetContent("");
         currentSnippet = "";
    }
    
    onAnswer(question.id, value, currentSnippet, question.questionType);
  };

  // handleSnippetChange (copied)
  const handleSnippetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newSnippetContent = e.target.value;
      setSnippetContent(newSnippetContent);
      let primaryValue = "";
      if (question.questionType === 'multipleSelect') {
           primaryValue = Array.from(selectedMultiValues).join(', ');
      } else {
          primaryValue = selectedLabel || inputValue || "";
      }
      onAnswer(question.id, primaryValue, newSnippetContent, question.questionType); 
  };

  // shouldShowSnippetEditor (copied)
  const shouldShowSnippetEditor = useMemo(() => {
      if (question.hideSnippetEditor) return false;
      const noneIsSelected = selectedMultiValues.has("None of the above");
      const noneOption = question.options?.find(o => o.label === "None of the above");

      if (selectedLabel) { 
          const opt = question.options?.find(o => o.label === selectedLabel);
          return !!opt?.proposedSnippet || snippetContent.trim() !== '';
      } else if (question.questionType === 'multipleSelect') { 
          if (noneIsSelected && selectedMultiValues.size === 1 && !!noneOption?.proposedSnippet) return true;
          if (selectedMultiValues.size > 0 && !noneIsSelected && !!question.multiSelectSnippet) return true;
          if (snippetContent.trim() !== '') return true;
           return false;
      } else if (question.questionType === 'numeric') { 
          if (inputValue) { 
              const numValue = parseFloat(inputValue);
               if (!isNaN(numValue) && question.proposedSnippetsBySubRange) {
                   const hasMatchingSnippet = question.proposedSnippetsBySubRange.some(sub => {
                       const minOk = sub.min === undefined || numValue >= sub.min;
                       const maxOk = sub.max === undefined || numValue <= sub.max;
                       return minOk && maxOk && !!sub.proposedSnippet; 
                   });
                   if (hasMatchingSnippet) return true; 
               }
           }
           if (snippetContent.trim() !== '') return true;
           return false; 
      } else if (question.questionType === 'freeText') { 
           // Always show for free text unless explicitly hidden
           return true;
      } 
      return false; 
  }, [question, selectedLabel, selectedMultiValues, inputValue, snippetContent]);


  // --- RENDER LOGIC (copied) ---
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
                 const labelClassName = `radio-label ${o.meetsCriteria ? 'meets-criteria' : ''}`;
                 return (
                    <div key={i} className={`form-group form-group-radio ${o.meetsCriteria ? 'has-criteria-met-option' : ''}`}>
                      <label htmlFor={inputId} className={labelClassName}>
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

        {/* Multiple Select (Checkboxes) */}
        {question.questionType === 'multipleSelect' && (
            <div>
              {question.options?.map((o, i) => {
                  const inputId = `${question.id}-${i}`;
                  const labelClassName = `checkbox-label ${o.meetsCriteria ? 'meets-criteria' : ''}`;
                  const isChecked = selectedMultiValues.has(o.label);
                  return (
                      <div key={i} className={`form-group form-group-checkbox ${o.meetsCriteria ? 'has-criteria-met-option' : ''}`}>
                          <label htmlFor={inputId} className={labelClassName}>
                              <input
                                  type="checkbox"
                                  value={o.label}
                                  id={inputId}
                                  name={question.id} 
                                  checked={isChecked}
                                  onChange={handleCheckboxChange}
                                  className="form-checkbox"
                              />
                              <span className="checkbox-option-label">{o.label}</span>
                          </label>
                      </div>
                  )
              })}
              {shouldShowSnippetEditor && (
                 <div className="snippet-container">
                     <p className="snippet-title">
                       {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1)
                           ? (question.options?.find(o=>o.label==="None of the above")?.proposedSnippet ? `Proposed Snippet (None Selected):` : 'Optional Note:')
                           : (selectedMultiValues.size > 0 && question.multiSelectSnippet) 
                               ? `Proposed Snippet (Selection: ${Array.from(selectedMultiValues).filter(l=>l!=="None of the above").join(', ')}):` 
                               : 'Optional Note:'
                       }
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
                    min={question.numericRange?.min}
                    max={question.numericRange?.max}
                    placeholder={`Enter number${question.numericRange?.units ? ` (${question.numericRange.units})` : ''}`}
                    className="form-input form-input-number"
                 />
                 {shouldShowSnippetEditor && (
                      <div className="snippet-container">
                        {(() => {
                            const numValue = parseFloat(inputValue);
                            let matchingSnippet: ProposedSnippet | undefined;
                            let locationSuggestion: string | undefined;
                            if (!isNaN(numValue) && question.proposedSnippetsBySubRange) {
                                const matchingSubRange = question.proposedSnippetsBySubRange.find(sub => {
                                     const minOk = sub.min === undefined || numValue >= sub.min;
                                     const maxOk = sub.max === undefined || numValue <= sub.max;
                                     return minOk && maxOk;
                                });
                                if (matchingSubRange?.proposedSnippet) { // Check proposedSnippet exists
                                    matchingSnippet = matchingSubRange.proposedSnippet;
                                    locationSuggestion = matchingSnippet?.locationSuggestion;
                                }
                            }
                            return (
                                <> 
                                    <p className="snippet-title">
                                        {matchingSnippet ? 'Proposed Snippet:' : 'Optional Note/Snippet:'}
                                        {matchingSnippet && <span className="snippet-title-detail"> ({matchingSnippet.title})</span>}
                                    </p>
                                    <textarea
                                        ref={textareaRef}
                                        className="snippet-textarea"
                                        value={snippetContent}
                                        onChange={handleSnippetChange}
                                        placeholder={matchingSnippet ? 'Edit proposed snippet...' : 'Add an optional note...'}
                                    />
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
            <div className="form-group"> {/* Keep form-group for spacing */} 
                {/* Conditionally render main input vs. snippet editor */} 
                {!shouldShowSnippetEditor ? (
                    // Case 1: Snippet editor HIDDEN (or feature not used) - Show simple textarea
                    <textarea 
                        value={inputValue} // Use inputValue for direct text entry
                        onChange={handleInputChange} // Updates inputValue
                        rows={3}
                        placeholder="Enter response..."
                        className="form-textarea"
                    />
                ) : (
                    // Case 2: Snippet editor SHOWN (for optional note)
                    <div className="snippet-container"> {/* snippet-container provides styling */} 
                        {/* Optional: Main input could still be shown if needed, 
                            but current Orders2 logic implies snippet replaces it */}
                        <p className="snippet-title">Response / Optional Note:</p>
                        <textarea
                            ref={textareaRef}
                            className="snippet-textarea snippet-textarea-optional"
                            value={snippetContent} // Use snippetContent for the note
                            onChange={handleSnippetChange} // Updates snippetContent
                            placeholder="Enter response or note here..."
                        />
                        {/* Optional: Add location suggestion if applicable */} 
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

// Export the component
export default QuestionCard; // Make default export if it's the main export 