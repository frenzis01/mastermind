// BoardBreaker.js
import { useState,useEffect } from 'react';
import ColorChooseModal from '../modals/ColorChooseModal'; // Import the ColorChooseModal component
import "../../css/styles.css"
import "../../css/boards.css"
import { colors, colorToInt, intToColor, feedbackColors } from '../../assets/colors';

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill(feedbackColors.xx) };

export function BoardBreaker({ 
    maxGuesses,
    makeGuess,
    startTurn,
    turnStarted,
    codeHash,
    joined,
    newFeedback,
    resetNewFeedback,
    guesses,
    feedbacks,
    codeSecretPublished}) {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);

  const toggleColorChooseModal = () => setColorChooseModalOpen(!isColorChooseModalOpen);

  const boardInitialized = rows
    .map((row,index) => ({ ...row, index }))
    .every((row) => 
    (row.index > guesses.length - 1 || row.guess.every(color => color !== null))
    // This cannot be checked
    // && (row.index > feedbacks.length || row.feedback.every(color => color !== feedbackColors.xx))
  );  

  const prevFeedbackReceived = rows[currentRow].guess.every(color => color === null);
  
  useEffect(() => {
    if (newFeedback && !prevFeedbackReceived) {
      console.log("New Feedback!")
      handleFeedback(currentRow, newFeedback);
    }
    if (joined && currentRow === 0 && !codeHash && !turnStarted && !newFeedback && guesses.length === 0){ //forse TODO: includere caso in cui utente joina il game, ma non submitta guess prima di uscire
      console.log("is Joined!")
      startTurn();
    }
    // TODO test
    if (guesses.length !== 0 && !boardInitialized) {

      handleSubmitGuess(true)(guesses[currentRow].map(intToColor));
      if(currentRow < feedbacks.length){
        handleFeedback(currentRow, feedbacks[currentRow]);
      }
    }

  }, [joined, newFeedback, currentRow, rows]);

  const handleSubmitGuess = (init) => {
    return (colors) => {
      console.log('Submitting guess: ', colors);
      const newRows = [...rows];
      newRows[currentRow].guess = colors;
      setRows(newRows);
      if (!init) {
        toggleColorChooseModal();
        makeGuess(colors.map(colorToInt), currentRow);
      }
      // Move to the next row or handle end game logic
      if (currentRow < maxGuesses) {
        resetNewFeedback();
        // setCurrentRow(currentRow + 1);
      } else {
        console.log('Game Over');
        // TODO implement end game logic
      }
    }
  };

  const handleFeedback = (rowIndex, feedback) => {
    console.log("Handling feedback: ", feedback);
    feedback.cc = Number(feedback.cc);
    feedback.nc = Number(feedback.nc);
    const newRows = [...rows];
    const feedbackCircles = [
      ...Array(feedback.cc).fill(feedbackColors.cc),
      ...Array(feedback.nc).fill(feedbackColors.nc), // Very light gray
      ...Array(6 - feedback.cc - feedback.nc).fill(feedbackColors.xx),
    ];
    newRows[rowIndex].feedback = feedbackCircles;
    setRows(newRows);
    setCurrentRow(currentRow + 1);
  };

  const handleDispute = () => {
    // TODO tutto
  }

  return (
    <div className="App">
      <button
         className='btn-faded' 
         onClick={() => {toggleColorChooseModal(); }}>Make a Guess</button>
      
      {codeSecretPublished && 
        <button className='btn-dispute' onClick={handleDispute}>Dispute</button>
      }
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
      {/* TODO check MakeGuess modal opening logic */}
      {isColorChooseModalOpen && (codeHash || guesses.length !== 0) && (prevFeedbackReceived) && <ColorChooseModal submitCode={handleSubmitGuess(false)} onToggleModal={toggleColorChooseModal}/>}
    </div>
  );
}

export default BoardBreaker;
