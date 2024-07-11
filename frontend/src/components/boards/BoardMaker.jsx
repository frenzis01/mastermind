// BoardMaker.js
import { useState } from 'react';
import ProvideFeedbackModal from '../modals/ProvideFeedbackModal'; // Import the ProvideFeedbackModal component
import ColorChooseModal from '../modals/ColorChooseModal';
import "../../css/styles.css"

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

export function BoardMaker() {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);
  const [isSecretCodeChosen, setSecretCodeChosen] = useState(false);

  const openFeedbackModal = () => setFeedbackModalOpen(true);
  const closeFeedbackModal = () => setFeedbackModalOpen(false);
  
  const openColorChooseModal = () => setColorChooseModalOpen(true);
  const closeColorChooseModal = () => setColorChooseModalOpen(false);

  const waitForNewGuess = () => setPrevFeedback(false);

  const handleProvideFeedback = (feedback) => {
    const newRows = [...rows];
    const feedbackColors = [
      ...Array(feedback.cc).fill('black'),
      ...Array(feedback.nc).fill('#d3d3d3'), // Very light gray
      ...Array(6 - feedback.cc - feedback.nc).fill('gray'),
    ];
    newRows[currentRow].feedback = feedbackColors;
    setRows(newRows);
    closeFeedbackModal();
    if (currentRow < 9) {
      setCurrentRow(currentRow + 1);
    } else {
      console.log('Game Over');
    }
  };

  const handleGuess = (colors) => {
    const newRows = [...rows];
    newRows[currentRow].guess = colors;
    setRows(newRows);
  };

  const handleSecretCodeChosen = (colors) => {
   //  onSecretCodeChosen(colors);
    setSecretCodeChosen(true);
    closeColorChooseModal();
  };

  return (
    <div className="App">
      {!isSecretCodeChosen && (
        <button
          className='submit-secret-button'
          onClick={openColorChooseModal}
          style={{ marginBottom: '20px' }}
        >
          Choose Secret Code
        </button>
      )}
      {isSecretCodeChosen && (
        <button
          className='submit-button'
          onClick={() => {
            openFeedbackModal();
            waitForNewGuess();
          }}
        >
          Provide Feedback
        </button>
      )}
      {rows.map((row, index) => (
        <div
          className="board-row"
          key={index}
          style={{ backgroundColor: row.guess.includes(null) ? '#d3d3d3' : '#2e2e2e' }}
        >
          <div className="feedback-grid">
            {row.feedback.map((color, i) => (
              <div className="small-circle" key={i} style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="guess-grid">
            {row.guess.map((color, i) => (
              <div
                className={`large-circle ${color ? 'filled' : ''}`}
                key={i}
                style={{ backgroundColor: color || '#d3d3d3' }}
              />
            ))}
          </div>
        </div>
      ))}
      {isFeedbackModalOpen && (
        <ProvideFeedbackModal submitFeedback={handleProvideFeedback} closeModal={closeFeedbackModal} />
      )}
      {isColorChooseModalOpen && (
        <ColorChooseModal submitCode={handleSecretCodeChosen} closeModal={closeColorChooseModal} />
      )}
    </div>
  );
}

export default BoardMaker;
