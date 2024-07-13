// BoardMaker.js
import { useState, useEffect } from 'react';
import ProvideFeedbackModal from '../modals/ProvideFeedbackModal';
import ColorChooseModal from '../modals/ColorChooseModal';
import "../../css/styles.css"
import {colors, colorToInt, intToColor, feedbackColors} from "../../assets/colors";

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

export function BoardMaker({ hashSecretCode, generateSeed, submitSecretHash, newGuess, turnStarted, provideFeedback}) {
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
    const feedbackCircles = [
      ...Array(feedback.cc).fill(feedbackColors.cc),
      ...Array(feedback.nc).fill(feedbackColors.nc), // Very light gray
      ...Array(6 - feedback.cc - feedback.nc).fill(feedbackColors.xx),
    ];
    newRows[currentRow].feedback = feedbackCircles;
    setRows(newRows);
    toggleFeedbackModal();
    waitForNewGuess();
    
    // Call the contract
    provideFeedback(feedback.cc, feedback.nc);
    
    if (currentRow < 9) {
      // TODO implement endgame
      setCurrentRow(currentRow + 1);
    } else {
      console.log('Game Over');
    }
  };

  // Use useEffect to listen for changes in `onGuess` prop
  useEffect(() => {
    if (newGuess) {
      const guessColors = newGuess.map(intToColor)
      handleGuess(guessColors); // Invoke handleGuess with the received guess
    }
    if (turnStarted) {
      toggleColorChooseModal();
    }
  }, [newGuess,turnStarted]);

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
