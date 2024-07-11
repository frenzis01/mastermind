// ProvideFeedbackModal.js
import React, { useState } from 'react';
import "../../css/styles.css"

const ProvideFeedbackModal = ({ closeModal, submitFeedback }) => {
  const [cc, setCc] = useState(0);
  const [nc, setNc] = useState(0);
  const [error, setError] = useState('');

  const handleCcChange = (e) => {
    const value = Math.max(0, Math.min(6, parseInt(e.target.value) || 0));
    if (value + nc > 6) {
      setError('CC + NC must be less than or equal to 6');
    } else {
      setError('');
      setCc(value);
    }
  };

  const handleNcChange = (e) => {
    const value = Math.max(0, Math.min(6, parseInt(e.target.value) || 0));
    if (cc + value > 6) {
      setError('CC + NC must be less than or equal to 6');
    } else {
      setError('');
      setNc(value);
    }
  };

  const handleSubmit = () => {
    if (cc + nc <= 6) {
      submitFeedback({ cc, nc });
      closeModal();
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Provide Feedback</h2>
        <div className="input-container">
          <label>
            CC:
            <input
              type="number"
              value={cc}
              onChange={handleCcChange}
              min="0"
              max="6"
            />
          </label>
        </div>
        <div className="input-container">
          <label>
            NC:
            <input
              type="number"
              value={nc}
              onChange={handleNcChange}
              min="0"
              max="6"
            />
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        <button onClick={handleSubmit} className="submit-button" disabled={cc + nc > 6}>
          Submit Feedback
        </button>
      </div>
    </div>
  );
};

export default ProvideFeedbackModal;
