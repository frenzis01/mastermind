// BoardMaker.js
import { useState, useEffect } from 'react';
import ProvideFeedbackModal from '../modals/ProvideFeedbackModal';
import ColorChooseModal from '../modals/ColorChooseModal';
import "../../css/styles.css"
import "../../css/boards.css"
import {colors, colorToInt, intToColor, feedbackColors} from "../../assets/colors";
import { Col } from 'react-bootstrap';
import NonClosableModal from '../modals/NonClosableModal';

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
    disputed,
    currentTurn
    }) {
  const [rows, setRows] = useState(Array(maxGuesses).fill().map(() => ({ ...initialRow })));
  const [currentRow, setCurrentRow] = useState(0);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isColorChooseModalOpen, setColorChooseModalOpen] = useState(false);

  const toggleFeedbackModal = () => setFeedbackModalOpen(!isFeedbackModalOpen);
  
  const toggleColorChooseModal = () => setColorChooseModalOpen(!isColorChooseModalOpen);

  const boardInitialized = rows
    .map((row,index) => ({ ...row, index }))
    .every((row) => 
    (row.index > guesses.length - 1 || row.guess.every(color => color !== null))
    // This cannot be checked
    // && (row.index > feedbacks.length || row.feedback.every(color => color !== feedbackColors.xx))
  );  

  const noGuessesPresent = rows[0].guess.every(color => color === null);
  const prevGuessReceived = rows[currentRow].guess.every(color => color !== null);
  const codeHashPresent = codeHash !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Use useEffect to listen for changes in `onGuess` prop
  useEffect(() => {
    console.log("Current row " + currentRow);
    console.log("prevGuessReceived " + prevGuessReceived);
    console.log("boardInitialized "+ boardInitialized);
    if (guesses.length !== 0 && !boardInitialized) {
      handleGuess(guesses[currentRow].map(intToColor));
      if(currentRow < feedbacks.length){
        handleProvideFeedback(true)(feedbacks[currentRow]);
      }
    }

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
    const hash = hashSecretCode(codeColors, seed);
    submitSecretHash(hash, codeColors, seed);
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
        // console.log('Game Over');
      }
    }
  };

  const handlePublishCodeSecret = (colorsAndSeed) => {
    const codeColors = colorsAndSeed.colors;
    const codeSeed = colorsAndSeed.textInput;
    console.log('Publishing Secret Code: ', codeColors);
    toggleColorChooseModal();
    console.log('My seed is:', codeSeed);
    publishCodeSecret(codeColors.map(colorToInt), codeSeed);

  }

  const codeSecretPublishedFlag = codeSecretPublished && codeSecretPublished.length > 1;
  // Game phases
  const waitingFirstTurnToStart = !turnStarted && !codeHashPresent && noGuessesPresent;
  const waitingForAGuess = turnStarted && !turnEnded  && codeHashPresent && !prevGuessReceived;
  const turnJustStarted = turnStarted && !turnEnded && !codeHashPresent && noGuessesPresent;
  const guessPending = !turnEnded && codeHashPresent && prevGuessReceived;
  const publishSecret = turnEnded && !codeSecretPublishedFlag && codeHashPresent && turnStarted && !noGuessesPresent;
  const waitNextTurn = turnEnded && codeSecretPublishedFlag && codeHashPresent;
  const lastTurn = currentTurn === maxTurns;
  return (
    <div className="App">
      {waitingFirstTurnToStart &&
          // TODO style this
          <div className='secret-row'>
            Waiting for the Breaker to start the game
          </div>
      }
      { waitingForAGuess &&
          <div className='secret-row'>
            Waiting for the Breaker to make a guess
          </div>
      }
      {turnJustStarted && 
        <button
          className='submit-secret-button'
          onClick={() => {console.log('isModalOpen' + isColorChooseModalOpen); toggleColorChooseModal()}}
          >
          Choose Secret Code
        </button>
      }
      {guessPending && (
        <button
          className='btn-faded'
          onClick={() => {
            toggleFeedbackModal();
          }}
        >
          Provide Feedback
        </button>
      )}
      {publishSecret && (
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
      { waitNextTurn && 
        // TODO implement "Game will end soon" if max number of turns reached
        <>
        {disputed &&
          // TODO <div className="disputed-message">
          <div className='secret-row'> Opponent claims you have cheated in this turn. The game will end soon, establishing who is not being honest.</div>
        }
        {!disputed &&
          <div className='secret-row'> The breaker will either {`${lastTurn ? 'end the game' : 'start a new turn'}`}  or dispute the Feedbacks you provided. </div>
        }
        </>
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
      {guessPending && isFeedbackModalOpen && (
        <ProvideFeedbackModal submitFeedback={handleProvideFeedback(false)} onToggleModal={toggleFeedbackModal} />
      )}
      {turnJustStarted && isColorChooseModalOpen && (
        <ColorChooseModal submitCode={handleSecretCodeChosen} onToggleModal={toggleColorChooseModal} showTextInput={false}/>
      )}
      {publishSecret && isColorChooseModalOpen && (
        <ColorChooseModal submitCode={handlePublishCodeSecret} onToggleModal={toggleColorChooseModal} initColors={codeSecretMemo} showTextInput={true} initText={codeSeedMemo} />
      )}
    </div>
  );
}

export default BoardMaker;
