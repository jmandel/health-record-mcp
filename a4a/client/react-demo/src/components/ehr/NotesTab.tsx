import React from 'react';
import { useEhrContext } from '../../context/EhrContext'; // Import hook
// Assuming ProcessedAttachment is defined and exported from a central types file (e.g., ../../clientTypes)
// import { ProcessedAttachment } from '../../clientTypes'; // Adjust path if needed

// Remove local definition if defined centrally
// interface ProcessedAttachment { ... }

// Remove props interface
// interface NotesTabProps { ... }

// Remove props from signature
const NotesTab: React.FC = () => {
    const { ehrData, isLoading } = useEhrContext(); // Get data from context

    if (isLoading) return <p>Loading Notes & Attachments...</p>;

    // Extract attachments from context data
    const attachments = ehrData?.attachments || [];

    // Sort attachments? Maybe by source resource type then path?
     attachments.sort((a: any, b: any) => {
         const typeA = `${a.resourceType}/${a.resourceId}`;
         const typeB = `${b.resourceType}/${b.resourceId}`;
         if (typeA !== typeB) return typeA.localeCompare(typeB);
         return a.path.localeCompare(b.path);
     });

    return (
        // Restore id and original class
        <div id="notes" className="tab-content">
            <h2>Clinical Notes & Attachments</h2>
            {attachments.length > 0 ? (
                 <div>
                     <table>
                        <thead>
                            <tr>
                                 <th>Source Resource</th>
                                 <th>Attachment Path</th>
                                 <th>Content Type</th>
                                 <th>Content Snippet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Add type annotation for att and index */}
                            {attachments.map((att: any, index: number) => (
                                <tr key={`${att.resourceId}-${att.path}-${index}`}>
                                    <td>{att.resourceType}/{att.resourceId}</td>
                                    <td><code>{att.path}</code></td>
                                    <td>{att.contentType || 'N/A'}</td>
                                     <td>
                                        {att.contentPlaintext
                                            ? (att.contentPlaintext.substring(0, 150) + (att.contentPlaintext.length > 150 ? '...' : ''))
                                            : '(No plaintext preview)'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            ) : (
                <p>No clinical notes or attachments available.</p>
            )}
        </div>
    );
};

export default NotesTab; 