// BoardMaker.js
import { useState } from 'react';
import ProvideFeedbackModal from '../modals/ProvideFeedbackModal'; // Import the ProvideFeedbackModal component
import "../../css/styles.css"

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

export function BoardMaker() {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isModalOpen, setModalOpen] = useState(false);
  const [prevFeedback, setPrevGuess] = useState(false);

  
  const openModal = () => setModalOpen(true);
   const closeModal = () => {
       setModalOpen(false);}

  const waitForNewGuess = () => setPrevGuess(false);

  console.log("Deploying board");
  
  const handleProvideFeedback = (feedback) => {
     const newRows = [...rows];
     newRows[currentRow].feedback = feedback;
     setRows(newRows);
     closeModal();
     // Move to the next row or handle end game logic
     if (currentRow < 9) {
        setCurrentRow(currentRow + 1);
      } else {
         console.log('Game Over');
         // TODO implement end game logic
      }
   };
   
   const handleGuess = (colors) => {
     const newRows = [...rows];
     newRows[currentRow].guess = colors;
     setRows(newRows);
    setPrevGuess(true);
  };

  return (
    <div className="App">
      <button
         className='submit-button' 
         onClick={() => {openModal(); waitForNewGuess();}}>Provide Feedback</button>
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
      {isModalOpen && (prevFeedback || currentRow == 0) && <ProvideFeedbackModal submitCode={handleProvideFeedback} />}
    </div>
  );
}

export default BoardMaker;
