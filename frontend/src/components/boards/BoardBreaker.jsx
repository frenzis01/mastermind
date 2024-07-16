import { useState, useEffect } from 'react';
import ColorChooseModal from '../modals/ColorChooseModal'; // Import the ColorChooseModal component
import "../../css/styles.css"
import "../../css/boards.css"
import { colors, colorToInt, intToColor, feedbackColors, disputeColor } from '../../assets/colors';

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
    codeSecretPublished,
    disputeFeedback,
    disputed}) {
    
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]); // State to track selected rows
  const [isDisputeMode, setIsDisputeMode] = useState(false); // State to track dispute mode

  const toggleColorChooseModal = () => setColorChooseModalOpen(!isColorChooseModalOpen);

  const boardInitialized = rows
    .map((row, index) => ({ ...row, index }))
    .every((row) => 
    (row.index > guesses.length - 1 || row.guess.every(color => color !== null))
  );

  const prevFeedbackReceived = rows[currentRow].guess.every(color => color === null);
  const codeHashPresent = codeHash !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    if (newFeedback && !prevFeedbackReceived) {
      console.log("New Feedback!")
      handleFeedback(currentRow, newFeedback);
    }
    if (joined && currentRow === 0 && !codeHashPresent && !turnStarted && !newFeedback && guesses.length === 0) {
      console.log("is Joined!")
      startTurn();
    }
    if (guesses.length !== 0 && !boardInitialized) {
      handleSubmitGuess(true)(guesses[currentRow].map(intToColor));
      if (currentRow < feedbacks.length) {
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
      if (currentRow < maxGuesses) {
        resetNewFeedback();
      } else {
        console.log('Game Over');
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
      ...Array(feedback.nc).fill(feedbackColors.nc),
      ...Array(6 - feedback.cc - feedback.nc).fill(feedbackColors.xx),
    ];
    newRows[rowIndex].feedback = feedbackCircles;
    setRows(newRows);
    setCurrentRow(currentRow + 1);
  };

  const toggleRowSelection = (index) => {
    if (index > currentRow -1 ) return;
    setSelectedRows((prevSelectedRows) => {
      if (prevSelectedRows.includes(index)) {
        return prevSelectedRows.filter(rowIndex => rowIndex !== index);
      } else {
        return [...prevSelectedRows, index];
      }
    });
  };

  const handleDispute = () => {
    setIsDisputeMode(!isDisputeMode);
    if (isDisputeMode) {
      console.log('Selected rows for dispute:', selectedRows);
      // Perform actions with selectedRows, e.g., send to server or handle dispute logic
      disputeFeedback(selectedRows);
    }
  };

  const nextTurn = () => {
    startTurn();
    // Reload page
    window.location.reload(); // TODO Test if is this okay
  }

  return (
    <div className="App">
      {/* TODO write all these conditions in a more readable way */}
      {!disputed &&
      <>
        {/* in-game buttons */}
        {!codeSecretPublished && <button
          className='btn-faded'
          onClick={() => { toggleColorChooseModal(); }}>Make a Guess</button>
        }
        {codeSecretPublished && 
          <button className='dispute-button' onClick={handleDispute}>
            {isDisputeMode ? 'Confirm Dispute' : 'The maker cheated! Dispute!'}
          </button>
        }
        {codeSecretPublished && <button className='btn-faded' onClick={startTurn}> Start next Turn</button>}
      </>}
      {disputed &&
        // <div className="disputed-message">
        <div> Opponent claims you have cheated in this turn. The game will end soon, establishing who is not being honest.</div>
      }
      {rows.map((row, index) => (
        <div
          className="board-row"
          key={index}
          onClick={isDisputeMode ? () => toggleRowSelection(index) : undefined}
          style={{
            // Darker gray #e2e2e2
            backgroundColor: row.guess.includes(null) ? '#d3d3d3' : '#353535',
            border: selectedRows.includes(index) ? `3px solid ${disputeColor}` : 'none', // Highlight selected rows
            cursor: isDisputeMode ? 'pointer' : 'default',
            boxShadow: selectedRows.includes(index) ? '0px 0px 45px rgba(255, 255, 255, 0.8)' : 'none' // Add shadow to selected rows;
          }}
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
      {isColorChooseModalOpen &&
       (codeHashPresent || guesses.length !== 0) &&
       (prevFeedbackReceived) &&
       <ColorChooseModal 
        submitCode={handleSubmitGuess(false)} 
        onToggleModal={toggleColorChooseModal} 
        initColors={currentRow !== 0 ? rows[currentRow-1].guess.map(colorToInt) : undefined}
        showTextInput={false} />}
    </div>
  );
}

export default BoardBreaker;
