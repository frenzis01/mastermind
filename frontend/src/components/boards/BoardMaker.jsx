// BoardMaker.js
import { useState } from 'react';
import ProvideFeedbackModal from '../modals/ProvideFeedbackModal';
import ColorChooseModal from '../modals/ColorChooseModal';
import "../../css/styles.css"
import {colors, colorToInt} from "../../assets/colors";

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

export function BoardMaker({ hashSecretCode, generateSeed, submitSecretHash}) {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);
  const [isSecretCodeChosen, setSecretCodeChosen] = useState(false);
  const [prevGuess, setPrevGuess] = useState(false);

  const toggleFeedbackModal = () => setFeedbackModalOpen(!isFeedbackModalOpen);
  
  const toggleColorChooseModal = () => setColorChooseModalOpen(!isColorChooseModalOpen);

  const waitForNewGuess = () => setPrevGuess(false);

  const handleProvideFeedback = (feedback) => {
    const newRows = [...rows];
    const feedbackColors = [
      ...Array(feedback.cc).fill('black'),
      ...Array(feedback.nc).fill('white'), // Very light gray
      ...Array(6 - feedback.cc - feedback.nc).fill('gray'),
    ];
    newRows[currentRow].feedback = feedbackColors;
    setRows(newRows);
    toggleFeedbackModal();
    if (currentRow < 9) {
      setCurrentRow(currentRow + 1);
    } else {
      console.log('Game Over');
    }
  };

  const handleGuess = (guessColors) => {
    const newRows = [...rows];
    newRows[currentRow].guess = guessColors;
    setRows(newRows);
    setPrevGuess(true);
  };

  const handleSecretCodeChosen = (codeColors) => {
   // TODO: Implement this function
   console.log('Secret Code Chosen: ', codeColors);
   codeColors = codeColors.map(colorToInt);
   const hash = hashSecretCode(codeColors,generateSeed());
    submitSecretHash(hash);
    setSecretCodeChosen(true);
    toggleColorChooseModal();
  };

  return (
    <div className="App">
      {!isSecretCodeChosen && (
        <button
          className='submit-secret-button'
          onClick={() => {console.log('isModalOpen' + isColorChooseModalOpen); toggleColorChooseModal()}}
          style={{ marginBottom: '20px' }}
        >
          Choose Secret Code
        </button>
      )}
      {isSecretCodeChosen && (
        <button
          className='submit-button'
          onClick={() => {
            toggleFeedbackModal();
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
              <div className="large-circle" key={i} style={{ backgroundColor: color || 'white' }} />
            ))}
          </div>
        </div>
      ))}
      {isFeedbackModalOpen && prevGuess && (
        <ProvideFeedbackModal submitFeedback={handleProvideFeedback} onToggleModal={toggleFeedbackModal} />
      )}
      {isColorChooseModalOpen && !isSecretCodeChosen  && (
        <ColorChooseModal submitCode={handleSecretCodeChosen} onToggleModal={toggleColorChooseModal} />
      )}
    </div>
  );
}

export default BoardMaker;
