import React, { useCallback, useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useEhrContext } from '../../context/EhrContext';
import { usePaSession } from '../../hooks/usePaSession';
import { PaSession, PaPhase, SearchHistoryEntry, ApprovalData } from '../../core/PaSession';
import { sessions } from '../../core/registry';
import type { Answer, ClinicianQuestion, ScratchpadBlock, ConditionNode } from '../../types/priorAuthTypes';
import type { PackageBundle } from '../../engine/engineTypes';
import type { Message, Part, FilePart, Artifact } from '@jmandel/a2a-client/src/types';
import QuestionCard from './QuestionDisplay'; 
import { useEhrSearch } from '../../hooks/useEhrSearch';
import { extractPatientAdminDetails } from '../../utils/extractPatientAdminDetails';

// === Sub-Components ===

// --- Debug Info Components ---

// Session Phase Info
interface SessionDebugInfoProps {
    phase: PaPhase;
    openQuestionCount: number;
    hasBundle: boolean;
    lastError: string | null;
    taskId: string | null;
}

const SessionDebugInfo: React.FC<SessionDebugInfoProps> = React.memo(({
    phase,
    openQuestionCount,
    hasBundle,
    lastError,
    taskId
}) => {
    return (
        <div style={{ border: '1px dashed blue', padding: '10px', margin: '10px 0 5px 0', fontSize: '0.9em', background: '#eef' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>PaSession State</h4>
            <p style={{ margin: '2px 0' }}>Task ID: {taskId ?? 'N/A'}</p>
            <p style={{ margin: '2px 0' }}>Phase: <strong>{phase}</strong></p>
            <p style={{ margin: '2px 0' }}>Open Questions: {openQuestionCount}</p>
            <p style={{ margin: '2px 0' }}>Has Bundle: {hasBundle ? 'Yes' : 'No'}</p>
            {lastError && <p style={{ margin: '2px 0', color: 'red' }}>Last Error: {lastError}</p>}
        </div>
    );
});
SessionDebugInfo.displayName = 'SessionDebugInfo';

// Endorsed Snippets Info
interface EndorsedSnippetsDebugInfoProps {
    snippets: Record<string, { content: string }>;
}

const EndorsedSnippetsDebugInfo: React.FC<EndorsedSnippetsDebugInfoProps> = React.memo(({ snippets }) => {
    const snippetEntries = Object.entries(snippets);
    return (
        <div style={{ border: '1px dashed green', padding: '10px', margin: '5px 0', fontSize: '0.9em', background: '#efe' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Endorsed Snippets ({snippetEntries.length})</h4>
            {snippetEntries.length > 0 ? (
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {snippetEntries.map(([qid, data]) => (
                        <li key={qid} title={`QID: ${qid}`}>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '2px 0' }}>{data.content}</pre>
                        </li>
                    ))}
                </ul>
            ) : (
                <p style={{ margin: 0, fontStyle: 'italic' }}>None</p>
            )}
        </div>
    );
});
EndorsedSnippetsDebugInfo.displayName = 'EndorsedSnippetsDebugInfo';

// Search History Info
interface SearchHistoryDebugInfoProps {
    history: SearchHistoryEntry[];
}

const SearchHistoryDebugInfo: React.FC<SearchHistoryDebugInfoProps> = React.memo(({ history }) => {
    return (
        <div style={{ border: '1px dashed orange', padding: '10px', margin: '5px 0 10px 0', fontSize: '0.9em', background: '#ffe' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>EHR Search History ({history.length})</h4>
            {history.length > 0 ? (
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {history.map((entry, index) => (
                        <li key={index}>
                            {new Date(entry.timestamp).toLocaleTimeString()}: <i>{entry.keywords.join(', ')}</i>
                        </li>
                    ))}
                </ul>
            ) : (
                <p style={{ margin: 0, fontStyle: 'italic' }}>None</p>
            )}
        </div>
    );
});
SearchHistoryDebugInfo.displayName = 'SearchHistoryDebugInfo';

// --- NEW: Conversation History Display ---
interface ConversationHistoryDisplayProps {
    history: Message[] | null;
}

const ConversationHistoryDisplay: React.FC<ConversationHistoryDisplayProps> = React.memo(({ history }) => {
    
    // --- File Viewing Logic (copied from Orders2Tab) ---
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
          // Optional: Revoke URL after some time if needed
          // setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
       } catch (error) { console.error('Error opening file blob:', error); }
   }, []);
   // -------------------------------------------------

    return (
        <div style={{ border: '1px dashed purple', padding: '10px', margin: '5px 0 10px 0', fontSize: '0.9em', background: '#fdf' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>A2A Task History ({history?.length ?? 0})</h4>
            {history && history.length > 0 ? (
                <div className="conversation-history a2a-history-display" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {history.map((message: Message, index: number) => {
                        const isUser = message.role === 'user';
                        return (
                            <div key={`task-hist-${index}`} style={{ marginBottom:'5px', padding:'5px 8px', borderRadius:'4px', backgroundColor: isUser ? '#e1f5fe' : '#f0f0f0' }}>
                                <strong>{isUser ? 'User:' : 'Agent:'}</strong>
                                {message.parts?.map((part, partIndex) => { // Added null check for parts
                                    if (!part) return null;
                                    if (part.type === 'text') return <span key={partIndex} style={{ whiteSpace: 'pre-wrap', display: 'block' }}>{part.text}</span>;
                                    if (part.type === 'file' && part.file) {
                                        const filePart = part as FilePart; 
                                        return (
                                            <div key={partIndex} style={{ marginTop: '5px', fontSize: '0.9em' }}>
                                                <span style={{ fontStyle: 'italic' }}>File: {filePart.file.name || 'untitled'} ({filePart.file.mimeType})</span> (
                                                <button onClick={() => handleViewFile(filePart)} disabled={!filePart.file?.bytes} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>View</button>
                                                )
                                            </div>
                                        );
                                    }
                                    if (part.type === 'data') return <pre key={partIndex} style={{ fontSize: '0.8em', background: '#eee', padding: '3px', marginTop: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>Data: {JSON.stringify(part.data, null, 2)}</pre>;
                                    return <span key={partIndex} style={{ fontStyle: 'italic' }}> (Unsupported Part Type: {part.type})</span>;
                                })}
                            </div>
                        );
                    })}
                </div>
             ) : (
                 <p style={{ margin: 0, fontStyle: 'italic' }}>None</p>
             )}
        </div>
    );
});
ConversationHistoryDisplay.displayName = 'ConversationHistoryDisplay';

// --- NEW: CriteriaTree Component (copied from Orders2Tab) ---
const CriteriaTree: React.FC<{ node: ConditionNode }> = React.memo(({ node }) => (
  <ul className="criteria-tree-list" style={{ paddingLeft: '15px', listStyleType: 'circle' }}>
    <li>
      <span className="criteria-label">{node.label}</span>
      {node.operator && (
        <span className="criteria-operator" style={{ fontStyle: 'italic', marginLeft: '5px' }}>({node.operator})</span>
      )}
      {node.evidence && (
        <ul className="evidence-list" style={{ paddingLeft: '15px', listStyleType: 'disc', fontSize: '0.9em', color: '#333' }}>
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
));
CriteriaTree.displayName = 'CriteriaTree';

// --- NEW: ScratchpadDisplay Component (adapted from Orders2Tab) ---
interface ScratchpadDisplayProps {
    blocks: ScratchpadBlock[] | null;
}

const ScratchpadDisplay: React.FC<ScratchpadDisplayProps> = React.memo(({ blocks }) => {
    return (
        <div style={{ border: '1px dashed teal', padding: '10px', margin: '5px 0 10px 0', fontSize: '0.9em', background: '#e0ffff' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>AI Scratchpad</h4>
            {blocks && blocks.length > 0 ? (
                <div className="scratchpad"> {/* Reuse scratchpad class if defined in CSS */} 
                    {blocks.map((b, i) => {
                        switch (b.type) {
                            case "outline":
                                return (
                                    <div key={i} className="pad-block pad-outline" style={{ marginBottom: '8px' }}>
                                    <h5 className="pad-heading" style={{ margin: '0 0 3px 0' }}>{b.heading}</h5>
                                    <ul className="pad-list" style={{ paddingLeft: '20px', margin: 0 }}>{b.bullets.map((t, j) => <li key={j}>{t}</li>)}</ul>
                                    </div>
                                );
                            case "policyQuote":
                                return (
                                    <blockquote key={i} className="pad-block pad-quote" style={{ borderLeft: '3px solid #aaa', paddingLeft: '10px', margin: '8px 0', fontStyle: 'italic' }}>
                                    <cite className="pad-cite" style={{ display: 'block', fontSize: '0.9em', color: '#555' }}>{b.from}</cite>
                                    <p style={{ margin: '3px 0 0 0' }}>{b.text}</p>
                                    </blockquote>
                                );
                            case "criteriaTree":
                                return (
                                    <div key={i} className="pad-block pad-tree" style={{ margin: '8px 0' }}>
                                        {/* <h5 className="pad-heading">Criteria Tree</h5> */}
                                        <CriteriaTree node={b.tree} />
                                    </div>
                                );
                            case "note": 
                                return (
                                    <div key={i} className="pad-block pad-note" style={{ margin: '8px 0' }}>
                                    <p style={{ margin: 0 }}>{b.text}</p>
                                    </div>
                                );
                            default:
                                const blockWithText = b as { text?: string };
                                if (blockWithText.text) {
                                    return <p key={i} className="pad-block pad-unknown" style={{ margin: '8px 0' }}>{blockWithText.text}</p>;
                                }
                                console.warn("Unknown scratchpad block type:", b);
                                return <div key={i} className="pad-block pad-unknown" style={{ margin: '8px 0' }}>[Unknown Scratchpad Content]</div>;
                        }
                    })}
                </div>
             ) : (
                 <p style={{ margin: 0, fontStyle: 'italic' }}>Empty</p>
             )}
        </div>
    );
});
ScratchpadDisplay.displayName = 'ScratchpadDisplay';

// --- NEW: Artifacts Debug Info --- 
interface ArtifactsDebugInfoProps {
    artifacts: Artifact[] | null;
}

const ArtifactsDebugInfo: React.FC<ArtifactsDebugInfoProps> = React.memo(({ artifacts }) => {
    return (
        <div style={{ border: '1px dashed gray', padding: '10px', margin: '5px 0 10px 0', fontSize: '0.9em', background: '#eee' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Task Artifacts ({artifacts?.length ?? 0})</h4>
            {artifacts && artifacts.length > 0 ? (
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {artifacts.map((artifact, index) => (
                        <li key={artifact.id || index}>
                            {artifact.name || 'Untitled'} ({artifact.parts?.length ?? 0} parts)
                        </li>
                    ))}
                </ul>
            ) : (
                <p style={{ margin: 0, fontStyle: 'italic' }}>None</p>
            )}
        </div>
    );
});
ArtifactsDebugInfo.displayName = 'ArtifactsDebugInfo';

// --- NEW: Approval Display Component --- 
interface ApprovalDisplayProps {
    approvalData: ApprovalData | null;
}

const ApprovalDisplay: React.FC<ApprovalDisplayProps> = ({ approvalData }) => {
    if (!approvalData) return null;

    return (
        <div style={{ 
            border: '2px solid green', 
            borderRadius: '5px', 
            padding: '15px', 
            margin: '20px 0', 
            backgroundColor: '#e8f5e9' 
        }}>
            <h3 style={{ marginTop: 0, color: 'green' }}>✔ Prior Authorization Approved</h3>
            {approvalData.approvalReferenceNumber && 
                <p style={{ margin: '5px 0' }}><strong>Approval #:</strong> {approvalData.approvalReferenceNumber}</p>}
            {approvalData.status && 
                <p style={{ margin: '5px 0' }}><strong>Status:</strong> {approvalData.status}</p>}
            {approvalData.timestamp && 
                <p style={{ margin: '5px 0' }}><strong>Timestamp:</strong> {new Date(approvalData.timestamp).toLocaleString()}</p>}
            {approvalData.reason && 
                <p style={{ margin: '5px 0' }}><strong>Reason:</strong> {approvalData.reason}</p>}
            {/* Add other fields as needed */} 
        </div>
    );
};
ApprovalDisplay.displayName = 'ApprovalDisplay';

// --- Bundle Viewer --- (Keep as is)
interface BundleViewerProps {
    bundle: PackageBundle;
    // onSend: () => void; // Removed as sending is automatic
    // isSending: boolean; 
}

const BundleViewer: React.FC<BundleViewerProps> = ({ bundle /*, onSend, isSending */ }) => {
    // ... (BundleViewer implementation remains the same, just remove button logic) ...
    return (
        <div className="conclusion-section">
            <div className="result-card">
                <div className="card-content">
                    <h2 className="result-title">Prior Auth Package Ready</h2>
                    <p style={{fontSize: '0.9em', fontStyle: 'italic', color: '#555'}}>Package submitted automatically to agent.</p>
                    <h3 className="subsection-title">Criteria Evaluation Tree</h3>
                    <pre className="criteria-tree-container">{JSON.stringify(bundle.criteriaTree, null, 2)}</pre>
                    
                    {/* Display final snippets from the bundle (merged in PaSession) */}
                    {bundle.snippets && bundle.snippets.length > 0 && (
                        <>
                            <h3 className="subsection-title">Final Endorsed Snippets ({bundle.snippets.length})</h3>
                            <div className="signable-snippets"> {/* Reuse style */} 
                                {bundle.snippets.map((snippet, index) => (
                                    <div key={index} className="snippet-item"> {/* Removed signable */} 
                                        <p className="snippet-item-title">{snippet.title}</p>
                                        <pre className="snippet-item-content">{snippet.content}</pre>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    
                    {/* Removed Send Button */}
                    {/* 
                    <button onClick={onSend} className="btn btn-primary btn-send-bundle" disabled={isSending}>
                        {isSending ? 'Sending...' : 'Send Package to Agent'}
                    </button>
                    */}
                </div>
            </div>
        </div>
    );
};

// === Main Tab Component ===

const Orders3Tab: React.FC = () => {
    const { ehrData, effectiveApiKey } = useEhrContext();
    const { ehrSearch, isEhrDataAvailable } = useEhrSearch(); 
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    // const [isSendingBundle, setIsSendingBundle] = useState(false); // Removed state for sending
    const session = usePaSession(currentTaskId);

    // State for initial form
    const [treatment, setTreatment] = useState<string>("rTMS Protocol");
    const [indication, setIndication] = useState<string>("Refractory Bipolar Depression");
    const [isStarting, setIsStarting] = useState<boolean>(false);
    // State to hold answers for the current set of questions
    const [currentAnswers, setCurrentAnswers] = useState<Record<string, Answer>>({});

    const handleStartPA = useCallback(async () => {
        // ... (handleStartPA logic remains the same) ...
        if (!isEhrDataAvailable || !treatment || !indication || !effectiveApiKey) {
            console.error("Missing prerequisites to start PA: EHR data, treatment, indication, or API key.");
            return;
        }
        setIsStarting(true);
        setCurrentAnswers({}); 
        const taskId = uuid();
        setCurrentTaskId(taskId);

        const patientDetails = extractPatientAdminDetails(ehrData);
        const initialUserMessageText = `Start prior auth check.\nTreatment: ${treatment}\nIndication: ${indication}\n\n${patientDetails}`;
        const firstMsg: Message = { role: 'user', parts: [{ type: 'text', text: initialUserMessageText }] };

        try {
            const newSession = new PaSession(
                taskId,
                'http://localhost:3001/a2a', 
                effectiveApiKey,
                ehrSearch,
                patientDetails,
                treatment,
                indication,
                ehrData,
                firstMsg
            );
            sessions.set(taskId, newSession);
        } catch (error) { 
            console.error("Error creating PaSession:", error);
            setCurrentTaskId(null);
        } finally {
            setIsStarting(false);
        }
    }, [ehrData, treatment, indication, effectiveApiKey, ehrSearch, isEhrDataAvailable]);

    // Callback for individual QuestionCard answers (remains the same)
    const handleQuestionAnswer = useCallback((questionId: string, value: string, snippet: string, type: ClinicianQuestion['questionType']) => {
        setCurrentAnswers(prev => ({
            ...prev,
            [questionId]: { value, snippet }
        }));
    }, []);

    // Function to submit all collected answers (remains the same)
    const handleSubmitAnswers = useCallback(async () => {
        if (session && session.phase === 'waitingUser') {
           await session.answer(currentAnswers);
           // setCurrentAnswers({}); // Decide if answers should clear after submit
        }
    }, [session, currentAnswers]);

    // Removed handleSendBundle and related state
    // const handleSendBundle = useCallback(async () => { ... }, [session]);

    const handleReset = () => {
        // ... (handleReset logic remains the same) ...
        if (session) {
            session.cancel(); 
            sessions.delete(currentTaskId!); 
        }
        setCurrentTaskId(null);
        setTreatment("New rTMS Protocol");
        setIndication("Refractory MDD");
        // setIsSendingBundle(false); // Removed
        setCurrentAnswers({}); 
    };

    // Determine if ready to submit answers (remains the same)
    const isReadyToSubmit = useMemo(() => {
        if (!session || session.phase !== 'waitingUser' || !session.openQs?.length) return false;
        return session.openQs.every(q => {
            const answer = currentAnswers[q.id];
            const hasValue = !!answer?.value?.trim();
            const hasSnippet = !!answer?.snippet?.trim();
            return hasValue || (q.questionType === 'freeText' && hasSnippet); 
        });
    }, [session, currentAnswers]);

    // --- Determine Loading/Submitting State --- 
    const isLoading = session?.phase === 'running' || isStarting;
    const isSubmitting = session?.phase === 'submittingAnswers';

    // --- NEW: Styles for Layout --- 
    const layoutStyle: React.CSSProperties = {
        display: 'flex',
        gap: '20px'
    };
    const mainColumnStyle: React.CSSProperties = {
        flex: '2', // Takes up more space
        minWidth: '0' // Prevent overflow issues
    };
    const sidebarColumnStyle: React.CSSProperties = {
        flex: '1', // Takes up less space
        minWidth: '250px', // Ensure sidebar has minimum width
        maxWidth: '400px' // Optional max width
    };
    // -----------------------------

    return (
        <div className="orders2-tab"> {/* Consider renaming class if needed */} 
            <h2>Prior Auth Workflow</h2>

            {/* --- NEW: Render Approval Display right below title if finalized & approved --- */} 
            {session && session.phase === 'finalized' && <ApprovalDisplay approvalData={session.approvalData} />}

            {!currentTaskId && (
                 // Initial form (unchanged)
                 <div className="order-form-section">
                      <div className="form-group">
                         <label htmlFor="treatment-v3" className="form-label">Treatment:</label>
                         <input 
                            type="text" id="treatment-v3" value={treatment}
                            onChange={(e) => setTreatment(e.target.value)} className="form-input"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && isEhrDataAvailable) {
                                    e.preventDefault(); // Prevent default form submission/newline
                                    handleStartPA();
                                }
                            }}
                         />
                      </div>
                      <div className="form-group">
                         <label htmlFor="indication-v3" className="form-label">Indication:</label>
                          <input 
                            type="text" id="indication-v3" value={indication}
                            onChange={(e) => setIndication(e.target.value)} className="form-input"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && isEhrDataAvailable) {
                                    e.preventDefault(); // Prevent default form submission/newline
                                    handleStartPA();
                                }
                            }}
                         />
                      </div>
                     <button 
                         onClick={handleStartPA} className="btn btn-primary btn-start-pa"
                         disabled={isLoading || !isEhrDataAvailable}
                     >
                         {isLoading ? "Starting..." : `Request Prior Auth`}
                     </button>
                     {!isEhrDataAvailable && <p className="status-message status-warning">Waiting for EHR data...</p>}
                 </div>
            )}

            {currentTaskId && !session && (
                <div className="loading-indicator">Loading session for Task ID: {currentTaskId}...</div>
            )}
            
            {session && (
                // --- Apply Two-Column Layout --- 
                <div style={layoutStyle}>
                
                    {/* === Main Interaction Column === */} 
                    <div style={mainColumnStyle}>
                        {(isLoading || isSubmitting) && 
                            <div className="loading-indicator">Processing (Phase: {session.phase})...</div>
                        }
                        
                        {session.phase === 'error' && (
                            <div className="error-message">
                                <p>An error occurred in the workflow:</p>
                                <pre>{session.lastError || 'Unknown error'}</pre>
                                {/* Reset button moved below */} 
                            </div>
                        )}

                        {/* Question Display */} 
                        {session.phase === 'waitingUser' && session.openQs.length > 0 && (
                            <div className="questions-section"> 
                                <h3 className="section-title">Clinician Input Required</h3>
                                {session.openQs.map(q => (
                                    <QuestionCard 
                                        key={q.id} 
                                        question={q} 
                                        currentAnswer={currentAnswers[q.id] ? { 
                                            value: currentAnswers[q.id].value,
                                            snippet: currentAnswers[q.id].snippet || ''
                                        } : undefined } 
                                        onAnswer={handleQuestionAnswer}
                                    />
                                ))}
                                <button 
                                    onClick={handleSubmitAnswers} 
                                    // Disable if loading OR submitting
                                    disabled={!isReadyToSubmit || isLoading || isSubmitting} 
                                    className="btn btn-success btn-submit-answers"
                                >
                                    {isSubmitting ? "Submitting..." : "Submit Answers"}
                                </button>
                            </div>
                        )}

                        {/* Bundle Display */} 
                        {(session.phase === 'awaitingAgentResponse' || session.phase === 'finalized' || session.phase === 'error') && session.bundle && (
                            <BundleViewer 
                                bundle={session.bundle} 
                                // onSend removed
                                // isSending removed
                            />
                        )}
                    </div>

                    {/* === Debug Sidebar Column === */} 
                    <div style={sidebarColumnStyle}>
                        <h4>Debug Info</h4>
                         <SessionDebugInfo 
                            taskId={currentTaskId}
                            phase={session.phase}
                            openQuestionCount={session.openQs?.length ?? 0}
                            hasBundle={!!session.bundle}
                            lastError={session.lastError}
                        />
                        <ScratchpadDisplay blocks={session.scratchpad} />

                        <EndorsedSnippetsDebugInfo snippets={session.endorsedSnippets} />
                        <SearchHistoryDebugInfo history={session.searchHistory} />
                        <ConversationHistoryDisplay history={session.taskHistory} />
                        {/* --- NEW: Render Artifacts Debug --- */} 
                        <ArtifactsDebugInfo artifacts={session.artifacts} />
                    </div>
                 </div>
             )}

             {/* --- Action Buttons (Rendered outside flex layout for now) --- */} 
             {session && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    {(session.phase === 'awaitingAgentResponse' || session.phase === 'finalized' || session.phase === 'error') && (
                            <button onClick={handleReset} className="btn btn-secondary btn-start-new" >Start New Workflow</button>
                    )}
                    {(session.phase !== 'finalized' && session.phase !== 'error') && (
                        <button onClick={() => session.cancel()} className="btn btn-danger" style={{ marginLeft: '10px' }} disabled={isSubmitting || isLoading}>
                            Cancel Workflow
                        </button>
                    )}
                </div>
             )}
        </div>
    );
};

export default Orders3Tab; 