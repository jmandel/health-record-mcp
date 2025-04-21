import React, { useState, useEffect } from 'react';
import { useEhrContext } from '../context/EhrContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { userApiKey, setUserApiKey, effectiveApiKey } = useEhrContext();
  const [inputKey, setInputKey] = useState('');

  // Sync input field with context value when modal opens or userApiKey changes
  useEffect(() => {
    if (isOpen) {
      setInputKey(userApiKey || ''); // Pre-fill with saved key or empty
    }
  }, [isOpen, userApiKey]);

  const handleSave = () => {
    setUserApiKey(inputKey.trim() || null); // Save trimmed key or null if empty
    onClose(); // Close modal after saving
  };

  const handleClear = () => {
      setUserApiKey(null); // Clear the user key
      setInputKey(''); // Clear the input field
      // Optionally close: onClose();
  }

  if (!isOpen) {
    return null; // Don't render anything if modal is closed
  }

  // Basic check if the effective key is the user's or the default env var
  const isUsingUserKey = !!userApiKey && effectiveApiKey === userApiKey;
  const isUsingEnvKey = !userApiKey && !!effectiveApiKey; // Check if env key exists

  return (
    // Basic modal structure - enhance styling as needed
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p className="modal-status">
            {isUsingUserKey
                ? "Using custom API Key."
                : isUsingEnvKey
                ? "Using API Key from environment variables."
                : "No API Key configured. Please set one below or via VITE_GEMINI_API_KEY."}
        </p>
        <div className="form-group">
          <label htmlFor="apiKeyInput" className="form-label">
            Gemini API Key Override:
          </label>
          <input
            type="password" // Mask the key
            id="apiKeyInput"
            className="form-input"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter API Key to override default"
          />
           <p className="input-hint">Leave blank and save (or click Clear) to revert to default key from environment variables.</p>
        </div>
        <div className="modal-actions">
          <button onClick={handleClear} className="btn btn-secondary btn-clear-key" disabled={!userApiKey}>
            Clear Custom Key
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
