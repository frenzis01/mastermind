// BoardBreaker.js
import { useState } from 'react';
import ColorChooseModal from '../modals/ColorChooseModal'; // Import the ColorChooseModal component
import "../../css/styles.css"

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

// export function CreateGameModal({ closeModal, createGame }) {
export function BoardBreaker() {
// const BoardBreaker = () => {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isModalOpen, setModalOpen] = useState(false);
  const [prevFeedback, setPrevFeedback] = useState(false);

  
  const openModal = () => setModalOpen(true);
   //   const closeModal = () => setModalOpen(false);
   const closeModal = () => {
       setModalOpen(false);}

  const waitForNewFeedback = () => setPrevFeedback(false);

  console.log("Deploying board");
  
  const handleSubmitCode = (colors) => {
    const newRows = [...rows];
    newRows[currentRow].guess = colors;
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

  const handleFeedback = (rowIndex, feedback) => {
    const newRows = [...rows];
    newRows[rowIndex].feedback = feedback;
    setRows(newRows);
    setPrevFeedback(true);
  };

  return (
    <div className="App">
      <button
         className='submit-button' 
         onClick={() => {openModal(); waitForNewFeedback();}}>Make a Guess</button>
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
      {isModalOpen && (prevFeedback || currentRow == 0) && <ColorChooseModal submitCode={handleSubmitCode} />}
    </div>
  );
}

export default BoardBreaker;
