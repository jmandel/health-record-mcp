import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useEhrContext } from '../../context/EhrContext';

// Remove props interface
// interface OrderEntryTabProps { ... }

// Keep form data interface
interface OrderFormData {
    medication: string;
    dose: string;
    frequency: string;
    instructions: string;
    startDate: string;
}

// Remove DRAFT_STORAGE_KEY if draft logic moves to context or is removed
// const DRAFT_STORAGE_KEY = 'botoxOrderDraft';

// Remove props from signature
const OrderEntryTab: React.FC = () => {
    const {
        ehrData,
        isLoading: isContextLoading,
        activePatientName,
        saveOrUpdateResource, // Use the context function
        error: contextError
    } = useEhrContext();

    // Local state for form
    const [formData, setFormData] = useState<OrderFormData>({
        medication: 'Botulinum Toxin A (Botox)', // Default
        dose: '155', // Example default
        frequency: 'Every 3 months',
        instructions: '', // Empty default
        startDate: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false); // Local submitting state
    const [draftSaved, setDraftSaved] = useState(false); // Track if current form is saved

    // Effect to reset form when active patient changes
    useEffect(() => {
        // Reset form to defaults when patient changes, unless loading
        if (activePatientName && !isContextLoading) {
            setFormData({
                 medication: 'Botulinum Toxin A (Botox)', dose: '155', frequency: 'Every 3 months', instructions: '', startDate: new Date().toISOString().split('T')[0]
            });
            setDraftSaved(false); // New patient, new draft
        }
    }, [activePatientName, isContextLoading]);

    // --- Rename handler -> handleSaveDraft ---
    const handleSaveDraft = useCallback(async () => {
        if (!ehrData?.fhir?.Patient?.[0]?.id) {
            alert("Cannot save draft: Active patient ID not found.");
            return;
        }
        setIsSubmitting(true);
        setDraftSaved(false); // Reset saved status on new attempt
        try {
            const newServiceRequestId = `sr-${crypto.randomUUID().substring(0, 8)}`;
            const patientReference = `Patient/${ehrData.fhir.Patient[0].id}`;

            const newServiceRequest = {
                resourceType: "ServiceRequest",
                id: newServiceRequestId,
                status: "draft",
                intent: "order",
                subject: { reference: patientReference },
                code: { coding: [{ system: "http://example.org/codes", code: "BOTOX-INJ" }], text: formData.medication },
                quantityQuantity: { value: parseInt(formData.dose) || 0, unit: 'units' },
                occurrenceTiming: { repeat: { frequency: 1, period: 3, periodUnit: "mo" } },
                authoredOn: new Date().toISOString(),
                note: [{ text: `Instructions: ${formData.instructions}\nStart Date: ${formData.startDate}` }]
                // TODO: Add requester, proper coding, etc.
            };

            await saveOrUpdateResource(newServiceRequest);
            setDraftSaved(true); // Mark as saved
            alert(`Draft ServiceRequest ${newServiceRequestId} saved for ${activePatientName}.`);
             // REMOVED: navigateToTasks(newServiceRequestId);

        } catch (error) {
            console.error("Failed to save draft:", error);
             alert(`Failed to save draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, ehrData, saveOrUpdateResource, activePatientName]);

    // Form input handler
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        setDraftSaved(false); // Mark as modified, needs saving again
    }, []);

    // Handler to clear the form (local action)
    const handleClearForm = () => {
        if (window.confirm('Clear the current order form?')) {
            setFormData({
                 medication: 'Botulinum Toxin A (Botox)', dose: '155', frequency: 'Every 3 months', instructions: '', startDate: new Date().toISOString().split('T')[0]
            });
            setDraftSaved(false);
            console.log("Order form cleared.");
        }
    };

    // Check if form is dirty (simple check)
    const isFormDirty = useMemo(() => {
         // Compare current state to a default state - adjust defaults if needed
         const defaults: OrderFormData = { medication: 'Botulinum Toxin A (Botox)', dose: '155', frequency: 'Every 3 months', instructions: '', startDate: new Date().toISOString().split('T')[0] };
         return JSON.stringify(formData) !== JSON.stringify(defaults);
    }, [formData]);

    // Render loading/error states from context
    if (isContextLoading) return <p>Loading Order Entry...</p>;
    if (contextError) return <p>Error loading data: {contextError}</p>;
    if (!ehrData) return <p>No patient data loaded.</p>;

    // Main view: Order form
    return (
        <div id="order-entry" className="tab-content">
            <h2>Order Entry</h2>
            <div className="order-form-container">
                <h3>{formData.medication || 'New Order'}</h3>

                <form id="botox-form">
                    <div>
                        <div className="form-group">
                            <label htmlFor="medication">Medication:</label>
                            <input type="text" id="medication" value={formData.medication} onChange={handleChange} readOnly={draftSaved || isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="dose">Dose:</label>
                            <input type="text" id="dose" value={formData.dose} onChange={handleChange} placeholder="e.g., 155 units" readOnly={draftSaved || isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="frequency">Frequency:</label>
                            <select id="frequency" value={formData.frequency} onChange={handleChange} disabled={draftSaved || isSubmitting}>
                                <option>Every 3 months</option>
                                <option>One-time</option>
                                <option>Other...</option>
                            </select>
                        </div>
                         <div className="form-group">
                             <label htmlFor="startDate">Start Date:</label>
                             <input type="date" id="startDate" value={formData.startDate} onChange={handleChange} readOnly={draftSaved || isSubmitting} />
                         </div>
                        <div className="form-group">
                            <label htmlFor="instructions">Instructions:</label>
                            <textarea id="instructions" value={formData.instructions} onChange={handleChange} rows={3} placeholder="Injection sites, technique, etc." readOnly={draftSaved || isSubmitting}></textarea>
                        </div>
                    </div>
                    <div className="buttons">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={draftSaved || isSubmitting || !isFormDirty}
                        >
                            {isSubmitting ? 'Saving Draft...' : (draftSaved ? 'Draft Saved' : 'Save Draft')}
                        </button>
                         <button
                            type="button"
                            onClick={handleClearForm}
                            disabled={isSubmitting}
                        >
                            Clear Form
                        </button>
                        {/* Add a submit/sign button if needed for a non-draft status */}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderEntryTab; 