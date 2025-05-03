import React, { useCallback, useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useEhrContext } from '../../context/EhrContext';
import { usePaSession } from '../../hooks/usePaSession';
import { PaSession, PaPhase } from '../../core/PaSession'; // Import PaPhase
import { sessions } from '../../core/registry';
import type { Answer, ClinicianQuestion } from '../../types/priorAuthTypes';
import type { PackageBundle } from '../../engine/engineTypes';
import type { Message } from '@jmandel/a2a-client/src/types';
import QuestionCard from './QuestionDisplay'; 
import { useEhrSearch } from '../../hooks/useEhrSearch';
import { extractPatientAdminDetails } from '../../utils/extractPatientAdminDetails';

// === Sub-Components ===

// --- Debug Info Component ---
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
        <div style={{ border: '1px dashed blue', padding: '10px', margin: '10px 0', fontSize: '0.9em', background: '#eef' }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px' }}>PaSession State (Debug)</h4>
            <p style={{ margin: '2px 0' }}>Task ID: {taskId ?? 'N/A'}</p>
            <p style={{ margin: '2px 0' }}>Phase: <strong>{phase}</strong></p>
            <p style={{ margin: '2px 0' }}>Open Questions: {openQuestionCount}</p>
            <p style={{ margin: '2px 0' }}>Has Bundle: {hasBundle ? 'Yes' : 'No'}</p>
            {lastError && <p style={{ margin: '2px 0', color: 'red' }}>Last Error: {lastError}</p>}
        </div>
    );
});
SessionDebugInfo.displayName = 'SessionDebugInfo'; // Add display name

// --- Bundle Viewer --- (Keep as is)
// ... (BundleViewer component code) ...
interface BundleViewerProps {
    bundle: PackageBundle;
    onSend: () => void;
    isSending: boolean; 
}

const BundleViewer: React.FC<BundleViewerProps> = ({ bundle, onSend, isSending }) => {
    // ... (BundleViewer implementation remains the same) ...
    return (
        <div className="conclusion-section">
            <div className="result-card">
                <div className="card-content">
                    <h2 className="result-title">Prior Auth Package Ready</h2>
                    <h3 className="subsection-title">Criteria Evaluation Tree</h3>
                    <pre className="criteria-tree-container">{JSON.stringify(bundle.criteriaTree, null, 2)}</pre>
                    
                    {bundle.snippets && bundle.snippets.length > 0 && (
                        <>
                            <h3 className="subsection-title">Endorsed Snippets ({bundle.snippets.length})</h3>
                            <div className="signable-snippets">
                                {bundle.snippets.map((snippet, index) => (
                                    <div key={index} className="snippet-item snippet-signable">
                                        <p className="snippet-item-title">{snippet.title}</p>
                                        <pre className="snippet-item-content">{snippet.content}</pre>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    
                    <button onClick={onSend} className="btn btn-primary btn-send-bundle" disabled={isSending}>
                        {isSending ? 'Sending...' : 'Send Package to Agent'}
                    </button>
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
    const [isSendingBundle, setIsSendingBundle] = useState(false); 
    const session = usePaSession(currentTaskId);

    // State for initial form
    const [treatment, setTreatment] = useState<string>("New rTMS Protocol");
    const [indication, setIndication] = useState<string>("Refractory MDD");
    const [isStarting, setIsStarting] = useState<boolean>(false);
    const [currentAnswers, setCurrentAnswers] = useState<Record<string, Answer>>({});

    const handleStartPA = useCallback(async () => {
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

    const handleQuestionAnswer = useCallback((questionId: string, value: string, snippet: string, type: ClinicianQuestion['questionType']) => {
        setCurrentAnswers(prev => ({
            ...prev,
            [questionId]: { value, snippet }
        }));
    }, []);

    const handleSubmitAnswers = useCallback(async () => {
        if (session && session.phase === 'waitingUser') {
           await session.answer(currentAnswers);
        }
    }, [session, currentAnswers]);

    const handleSendBundle = useCallback(async () => {
       if (session) {
            setIsSendingBundle(true);
            try {
                await session.sendBundle();
            } catch (error) {
                console.error("Error sending bundle:", error);
            } finally {
                setIsSendingBundle(false);
            }
        }
    }, [session]);

    const handleReset = () => {
        if (session) {
            session.cancel(); 
            sessions.delete(currentTaskId!); 
        }
        setCurrentTaskId(null);
        setTreatment("New rTMS Protocol");
        setIndication("Refractory MDD");
        setIsSendingBundle(false);
        setCurrentAnswers({});
    };

    const isReadyToSubmit = useMemo(() => {
        if (!session || session.phase !== 'waitingUser' || !session.openQs?.length) return false;
        return session.openQs.every(q => {
            const answer = currentAnswers[q.id];
            const hasValue = !!answer?.value?.trim();
            const hasSnippet = !!answer?.snippet?.trim();
            return hasValue || (q.questionType === 'freeText' && hasSnippet); 
        });
    }, [session, currentAnswers]);

    const isLoading = session?.phase === 'running' || isStarting;

    return (
        <div className="orders2-tab"> 
            <h2>Prior Auth Workflow (v3 - PaSession)</h2>

            {/* Initial Form Section */} 
            {!currentTaskId && (
                 <div className="order-form-section">
                     {/* ... Treatment/Indication Inputs ... */}
                      <div className="form-group">
                         <label htmlFor="treatment-v3" className="form-label">Treatment:</label>
                         <input 
                            type="text" id="treatment-v3" value={treatment}
                            onChange={(e) => setTreatment(e.target.value)} className="form-input"
                            disabled={isLoading}
                         />
                      </div>
                      <div className="form-group">
                         <label htmlFor="indication-v3" className="form-label">Indication:</label>
                          <input 
                            type="text" id="indication-v3" value={indication}
                            onChange={(e) => setIndication(e.target.value)} className="form-input"
                            disabled={isLoading}
                         />
                      </div>
                     <button 
                         onClick={handleStartPA} className="btn btn-primary btn-start-pa"
                         disabled={isLoading || !isEhrDataAvailable}
                     >
                         {isLoading ? "Starting..." : `Request Prior Auth (v3)`}
                     </button>
                     {!isEhrDataAvailable && <p className="status-message status-warning">Waiting for EHR data...</p>}
                 </div>
            )}

            {/* Loading Session Message */} 
            {currentTaskId && !session && (
                <div className="loading-indicator">Loading session for Task ID: {currentTaskId}...</div>
            )}
            
            {/* Active Session Display */} 
            {session && (
                <div className="active-workflow-display"> 
                
                    {/* --- Render Debug Info Card --- */} 
                    <SessionDebugInfo 
                        taskId={currentTaskId}
                        phase={session.phase}
                        openQuestionCount={session.openQs?.length ?? 0}
                        hasBundle={!!session.bundle}
                        lastError={session.lastError}
                    />
                
                    {isLoading && <div className="loading-indicator">Processing (Phase: {session.phase})...</div>}
                    
                    {session.phase === 'error' && (
                        <div className="error-message">
                            <p>An error occurred in the workflow:</p>
                            <pre>{session.lastError || 'Unknown error'}</pre>
                            <button onClick={handleReset} className="btn btn-secondary btn-start-new">Start New</button>
                        </div>
                    )}

                    {/* Question Display Section */} 
                    {session.phase === 'waitingUser' && session.openQs.length > 0 && (
                        <div className="questions-section"> 
                            <h3 className="section-title">Clinician Input Required</h3>
                            {session.openQs.map(q => (
                                <QuestionCard 
                                    key={q.id} 
                                    question={q} 
                                    currentAnswer={currentAnswers[q.id]} 
                                    onAnswer={handleQuestionAnswer}
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

                    {/* Bundle Display Section */} 
                    {session.phase === 'done' && session.bundle && (
                        <BundleViewer 
                            bundle={session.bundle} 
                            onSend={handleSendBundle} 
                            isSending={isSendingBundle}
                        />
                    )}
                    
                    {/* Action Buttons */} 
                    {(session.phase === 'done' || session.phase === 'error') && (
                         <button onClick={handleReset} className="btn btn-secondary btn-start-new" style={{ marginTop: '1rem' }}>Start New Workflow</button>
                    )}
                    {(session.phase === 'running' || session.phase === 'waitingUser') && (
                        <button onClick={() => session.cancel()} className="btn btn-danger" style={{ marginTop: '1rem', marginLeft: '0.5rem' }} disabled={isLoading}>
                            Cancel Workflow
                        </button>
                    )}
                </div>
            )}

        </div>
    );
};

export default Orders3Tab; 