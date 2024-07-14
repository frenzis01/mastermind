// BoardBreaker.js
import { useState,useEffect } from 'react';
import ColorChooseModal from '../modals/ColorChooseModal'; // Import the ColorChooseModal component
import "../../css/styles.css"
import { colors, colorToInt, intToColor, feedbackColors } from '../../assets/colors';

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

export function BoardBreaker({ makeGuess, startTurn, codeHash, joined, newFeedback, guesses, feedbacks }) {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);
  const [prevFeedback, setPrevFeedback] = useState(false);

  const toggleColorChooseModal = () => setColorChooseModalOpen(!isColorChooseModalOpen);
  const waitForNewFeedback = () => setPrevFeedback(false);

  // console.log("Deploying board");
  // startTurn();
  useEffect(() => {
    if (newFeedback) {
      console.log("New Feedback!")
      handleFeedback(currentRow, newFeedback);
    }
    if (joined && currentRow === 0 && !newFeedback && !guesses){ //forse TODO: includere caso in cui utente joina il game, ma non submitta guess prima di uscire
      console.log("is Joined!")
      startTurn();
    }

    // TODO test
    if (guesses) {
      console.log("feeds: " + feedbacks)
      console.log(guesses)
      for (let i = 0; i < guesses.length; i++) {
        console.log("riga: " + currentRow)
        handleSubmitGuess(true)(guesses[i].map(intToColor));
        if(i < feedbacks.length){
          handleFeedback(i, feedbacks[i]);
        }
      }
    }

  }, [joined, newFeedback]);

  const handleSubmitGuess = (init) => {
    return (colors) => {
      console.log('Submitting guess: ', colors);
      const newRows = [...rows];
      newRows[currentRow].guess = colors;
      setRows(newRows);
      console.log(init)
      if (!init) {
        toggleColorChooseModal();
        makeGuess(colors.map(colorToInt), currentRow);
      }
      // Move to the next row or handle end game logic
      if (currentRow < 9) {
        waitForNewFeedback();
        // setCurrentRow(currentRow + 1);
      } else {
        console.log('Game Over');
        // TODO implement end game logic
      }
    }
  };

  const handleFeedback = (rowIndex, feedback) => {
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
    setPrevFeedback(true);
    setCurrentRow(currentRow + 1);
    console.log(currentRow)
  };

  return (
    <div className="App">
      <button
         className='submit-button' 
         onClick={() => {toggleColorChooseModal(); }}>Make a Guess</button>
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
      {isColorChooseModalOpen && codeHash && (prevFeedback || currentRow == 0) && <ColorChooseModal submitCode={handleSubmitGuess(false)} onToggleModal={toggleColorChooseModal}/>}
    </div>
  );
}

export default BoardBreaker;
