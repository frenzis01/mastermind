import { useState } from 'react';
import "../../css/styles.css"
import "../../css/boards.css"


export function ProvideFeedbackModal({ onToggleModal, submitFeedback }) {
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
      onToggleModal();
    }
  };
  return (
    <div className="modal-backdrop d-flex justify-content-center align-items-center" onClick={onToggleModal}>
      <div className="modal-content bg-light p-4 rounded" style={{ position: 'relative', width: '200px' }} onClick={(e) => e.stopPropagation()}>
        <h2>Provide Feedback</h2>
        <div className="form-group d-flex align-items-center">
          <label className="mr-2 mb-0 label-font" style={{ whiteSpace: 'nowrap', width: '250px' }}>Colors in correct positions</label>
          <input
            type="number"
            className="form-control"
            value={cc}
            onChange={handleCcChange}
            min="0"
            max="6"
            style={{ width: '80px' }}
          />
        </div>
        <div className="form-group d-flex align-items-center">
          <label className="mr-2 mb-0 label-font" style={{ whiteSpace: 'nowrap', width: '250px' }}>Colors in wrong positions</label>
          <input
            type="number"
            className="form-control"
            value={nc}
            onChange={handleNcChange}
            min="0"
            max="6"
            style={{ width: '80px' }}
          />
        </div>
        <button onClick={handleSubmit} className="btn btn-primary mt-3 label-font" disabled={cc + nc > 6}>
          Submit Feedback
        </button>
        {error && <div className="alert alert-danger mt-3">{error}</div>}
      </div>
    </div>
  );
}
export default ProvideFeedbackModal;
