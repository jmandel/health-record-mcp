import React from 'react';

// Assuming ProcessedAttachment type is defined elsewhere or defined here
// If not using a shared types file, define it here:
interface ProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string; 
    contentPlaintext: string | null;
}

interface NotesTabProps {
    // notes: any[]; // Old prop
    attachments: ProcessedAttachment[]; // New prop
}

const NotesTab: React.FC<NotesTabProps> = ({ attachments }) => {
    return (
        <div id="notes" className="tab-content active">
            <h2>Clinical Notes & Attachments</h2> {/* Updated title */}
            {attachments?.length > 0 ? (
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
                        {attachments.map((att, index) => (
                            <tr key={`${att.resourceId}-${att.path}-${index}`}> 
                                <td>{att.resourceType}/{att.resourceId}</td>
                                <td><code>{att.path}</code></td>
                                <td>{att.contentType}</td>
                                <td style={{ fontStyle: att.contentPlaintext ? 'normal' : 'italic' }}>
                                    {att.contentPlaintext 
                                        ? (att.contentPlaintext.substring(0, 100) + (att.contentPlaintext.length > 100 ? '...' : '')) 
                                        : '(No plaintext preview)'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No clinical notes or attachments available.</p>
            )}
        </div>
    );
};

export default NotesTab; 