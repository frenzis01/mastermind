// BoardMaker.js
import { useState, useEffect } from 'react';
import ProvideFeedbackModal from '../modals/ProvideFeedbackModal';
import ColorChooseModal from '../modals/ColorChooseModal';
import "../../css/styles.css"
import "../../css/boards.css"
import {colors, colorToInt, intToColor, feedbackColors} from "../../assets/colors";
import { Col } from 'react-bootstrap';

const initialRow = { guess: Array(6).fill(null), feedback: Array(6).fill('gray') };

export function BoardMaker({
    maxTurns,
    maxGuesses,
    hashSecretCode,
    generateSeed,
    codeHash,
    submitSecretHash,
    newGuess,
    resetNewGuess,
    turnStarted,
    provideFeedback,
    guesses,
    feedbacks,
    turnEnded,
    codeSecretPublished,
    publishCodeSecret,
    codeSecretMemo,
    codeSeedMemo,
    setCodeSecretMemo,
    setCodeSeedMemo
    }) {
  const [rows, setRows] = useState(Array(10).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);
  const [isSecretCodeChosen, setSecretCodeChosen] = useState(false);

  const toggleFeedbackModal = () => setFeedbackModalOpen(!isFeedbackModalOpen);
  
  const toggleColorChooseModal = () => setColorChooseModalOpen(!isColorChooseModalOpen);

  const boardInitialized = rows
    .map((row,index) => ({ ...row, index }))
    .every((row) => 
    (row.index > guesses.length - 1 || row.guess.every(color => color !== null))
    // This cannot be checked
    // && (row.index > feedbacks.length || row.feedback.every(color => color !== feedbackColors.xx))
  );  

  const prevGuessReceived = rows[currentRow].guess.every(color => color !== null);
  const codeHashPresent = codeHash !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Use useEffect to listen for changes in `onGuess` prop
  useEffect(() => {
    console.log("Current row " + currentRow);
    console.log("prevGuessReceived " + prevGuessReceived);
    console.log("boardInitialized "+ boardInitialized);
    if (guesses.length !== 0 && !boardInitialized) {
      setSecretCodeChosen(true);
      handleGuess(guesses[currentRow].map(intToColor));
      if(currentRow < feedbacks.length){
        handleProvideFeedback(true)(feedbacks[currentRow]);
      }
    }

    console.log("My secret code is: ", codeSecretMemo);

    if (newGuess && !prevGuessReceived) {
      const guessColors = newGuess.map(intToColor)
      handleGuess(guessColors); // Invoke handleGuess with the received guess
    }
    if (turnStarted  && !boardInitialized && currentRow === 0 && guesses.length === 0) {
      toggleColorChooseModal();
    }
  },[newGuess, turnStarted, currentRow, rows]);

  const handleGuess = (guessColors) => {
    const newRows = [...rows];
    newRows[currentRow].guess = guessColors;
    setRows(newRows);
  };

  const handleSecretCodeChosen = (codeColors) => {
   console.log('Secret Code Chosen: ', codeColors);
   codeColors = codeColors.map(colorToInt);
   var seed = generateSeed();
   const hash = hashSecretCode(codeColors,seed);
   console.log('Maker Seed: ', seed);
    submitSecretHash(hash);
    setSecretCodeChosen(true);
    setCodeSecretMemo(codeColors);
    setCodeSeedMemo(seed);
    toggleColorChooseModal();
  };

  const handleProvideFeedback = (init) =>{
    return (feedback) => {
      console.log('Providing feedback: ', feedback);
      // console.log(feedback)
      const newRows = [...rows];
      const feedbackCircles = [
        ...Array(feedback.cc).fill(feedbackColors.cc),
        ...Array(feedback.nc).fill(feedbackColors.nc), // Very light gray
        ...Array(6 - feedback.cc - feedback.nc).fill(feedbackColors.xx),
      ];
      newRows[currentRow].feedback = feedbackCircles;
      setRows(newRows);
      if (!init) {
        toggleFeedbackModal();
        provideFeedback(feedback.cc, feedback.nc);
      }
      // Call the contract
      
      if (currentRow < maxGuesses - 1) {
        // TODO implement endgame
        setCurrentRow(currentRow + 1);
        resetNewGuess()
      } else {
        console.log('Game Over');
      }
    }
  };

  const handlePublishCodeSecret = (codeColors) => {
    // TODO add modal to enter seed
    console.log('Publishing Secret Code: ', codeColors);
    toggleColorChooseModal();
    console.log('My seed is:', codeSeedMemo);
    publishCodeSecret(codeColors.map(colorToInt), codeSeedMemo);

  }

  return (
    <div className="App">
      {!codeHashPresent && (
        <button
          className='submit-secret-button'
          onClick={() => {console.log('isModalOpen' + isColorChooseModalOpen); toggleColorChooseModal()}}
          style={{ marginBottom: '20px' }}
        >
          Choose Secret Code
        </button>
      )}
      {codeHashPresent && !turnEnded && (
        <button
          className='btn-faded'
          onClick={() => {
            toggleFeedbackModal();
          }}
        >
          Provide Feedback
        </button>
      )}
      {turnEnded && !codeSecretPublished && codeHashPresent && turnStarted && (
        <button
          className='btn-faded'
          onClick={() => {
            toggleColorChooseModal();
          }}
        >
          Publish Secret Code
        </button>
      )  
      }
      { turnEnded && codeSecretPublished && codeHashPresent && 
      // TODO implement "Game will end soon" if max number of turns reached
          <div> The breaker will either start a new Turn or dispute the Feedbacks you provided.</div>
      }
      {rows.map((row, index) => (
        <div
          className="board-row"
          key={index}
          style={{ backgroundColor: row.guess.includes(null) ? '#d3d3d3' : '#353535' }}
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
      {prevGuessReceived && isFeedbackModalOpen && (
        <ProvideFeedbackModal submitFeedback={handleProvideFeedback(false)} onToggleModal={toggleFeedbackModal} />
      )}
      {!isSecretCodeChosen && isColorChooseModalOpen && turnStarted && (
        <ColorChooseModal submitCode={handleSecretCodeChosen} onToggleModal={toggleColorChooseModal} />
      )}
      {turnEnded && !codeSecretPublished && codeHashPresent && turnStarted && isColorChooseModalOpen && (
        <ColorChooseModal submitCode={handlePublishCodeSecret} onToggleModal={toggleColorChooseModal} initColors={codeSecretMemo} />
      )}
    </div>
  );
}

export default BoardMaker;
