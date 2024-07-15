import React, { useState } from 'react';
// Ethers used to interact with the Ethereum network and our contract
import { ethers } from "ethers";

import { BoardBreaker } from './components/boards/BoardBreaker';
import { BoardMaker } from './components/boards/BoardMaker';
import { Loading } from './components/misc/Loading';
import { withRouter } from './components/WithRouter';
//import ColorChooseModal from './components/modals/ColorChooseModal';

import MastermindArtifact from "./contracts/Mastermind.json";
import contractAddress from "./contracts/contract-address.json"
import { intToColor } from './assets/colors';

//const crypto = require('crypto');

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
 
class Game extends React.Component {
  constructor(props) {
    super(props);

    const { id: gameId } = this.props.router.params;
    const { selectedAddress } = this.props.router.location.state || {};


    this.state = {
      gameId: gameId,
      selectedAddress: selectedAddress,
      turn: undefined,
      submitCodeHashModalOpen: true, // TODO true at the beginning?
      reqBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      //info sul game
      joiner: undefined, // TODO replace with actual value
      guesses: [],
      feedbacks: [],
      _mastermind: undefined,
      _provider: undefined,
      _gameDetails: undefined,
      _lastGuess: undefined,
      _lastFeedback: undefined,
      _codeHash: false,
      _joined: false,
      _turnStarted: false,
      _turnEnded: false,
      _codeSecret: undefined,
      // persistent (known by the player) codeSecret(s) to be displayed in BoardMaker
      // These codes will persist in case of page reload or change page/game
      _codeSecretMemo: JSON.parse(localStorage.getItem('_codeSecretMemo_' + gameId)) || undefined,
      // parse as Uint8Array // TODO
      _codeSeedMemo: this.jsonStringToUint8Array(localStorage.getItem('_codeSeedMemo_' + gameId)) || undefined,
      _catchedEvents: new Set()
    };

    this.localCatchedEvents = new Set();
    this.wrap = this.wrap.bind();

    this._initializeEthers = this._initializeEthers.bind(this);
    this.handleGuess = this.handleGuess.bind(this);
    this.handleFeedback = this.handleFeedback.bind(this);
    this.handleDispute = this.handleDispute.bind(this);
    this.handleHashPublished = this.handleHashPublished.bind(this);
    this.handleTurnStarted = this.handleTurnStarted.bind(this);
    this.handleGameJoined = this.handleGameJoined.bind(this);
    this.handleTurnEnded = this.handleTurnEnded.bind(this);
    this.handleCodeSecretPublished = this.handleCodeSecretPublished.bind(this);
    this.handleGameEnded = this.handleGameEnded.bind(this);
    this.setCodeSecretMemo = this.setCodeSecretMemo.bind(this);
    this.setCodeSeedMemo = this.setCodeSeedMemo.bind(this);

    this.computeHash = this.computeHash.bind(this);
    this.submitCodeHash = this.submitCodeHash.bind(this);
    this.makeGuess = this.makeGuess.bind(this);
    this.startTurn = this.startTurn.bind(this);
    this.provideFeedback = this.provideFeedback.bind(this);
    this.resetLastGuess = this.resetLastGuess.bind(this);
    this.resetLastFeedback = this.resetLastFeedback.bind(this);
    this.publishCodeSecret = this.publishCodeSecret.bind(this);
    this.disputeFeedback = this.disputeFeedback.bind(this);
  } 

  componentDidMount(){
    this._initializeEthers();
  }

  wrap = (handler) => {
    return (...args) => {
      const event = args[args.length - 1];  // The event object is always the last argument

      const transactionHash = event.log.transactionHash;
      if (this.localCatchedEvents.has(transactionHash) || this.state._catchedEvents.has(transactionHash)) {
        console.log('Event already catched, discarding:', transactionHash);
      } else {
        this.localCatchedEvents.add(transactionHash); // Add to local set
        this.setState((prevState) => ({
          _catchedEvents: new Set(prevState._catchedEvents).add(transactionHash)
        }), () => {
          handler(...args); // Pass all arguments including the event object to the handler
        });
      }
      };
  };

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const signer = await provider.getSigner();

    console.log(provider.pollingInterval);

    provider.polling = true;
    provider.pollingInterval = 1000; // Set to 1000 ms (1 second)
    console.log(provider);
    console.log(provider.pollingInterval);
    
    // Then, we initialize the contract using that provider and the token's artifact.
    const mastermind = new ethers.Contract(
      contractAddress.Mastermind,
      MastermindArtifact.abi,
      signer
    );
    const gameDetails = (await mastermind.getGameDetails(this.state.gameId)).toObject();
    // Perform useful conversions
    gameDetails.creator = gameDetails.creator.toLowerCase();
    gameDetails.joiner = gameDetails.joiner.toLowerCase();
    gameDetails.currentTurn = parseInt(gameDetails.currentTurn);

    const parseProxy = (g) => {
      let guessObject = [];
        for (let key in g) {
          if (g.hasOwnProperty(key)) {
            guessObject.push(g[key]);
          }
        }
        return guessObject;
    } 

    gameDetails.guessesLength = parseInt(gameDetails.guessesLength);
    if(gameDetails.guessesLength !== 0){
      const reqGuesses = await mastermind.getGuesses(this.state.gameId);
      const rawGuesses = reqGuesses.map(parseProxy);
      const guesses = rawGuesses.map(a => a.map(Number))

      console.log(guesses)
      this.setState({ guesses: guesses});
    }

    gameDetails.feedbacksLength = parseInt(gameDetails.feedbacksLength);
    if(gameDetails.feedbacksLength !== 0){
      const reqFeedbacks = await mastermind.getFeedback(this.state.gameId);
      const rawFeedbacks = reqFeedbacks.map(parseProxy);

      const feedbacks = rawFeedbacks.map(f => {
        return { cc: Number(f[0]), nc: Number(f[1]) };
      });

      console.log(feedbacks)
      this.setState({ feedbacks: feedbacks });
    }

    console.log(gameDetails);
    this.setState({ 
        _gameDetails: gameDetails,
        _provider: provider,
        _mastermind: mastermind,
        _turnStarted: gameDetails.startTime != 0,
        _turnEnded: gameDetails.endTime != 0,
        _codeHash: gameDetails.codeHash,
        // TODO check if map inside setState is okay
        // length > 1 is important! The very first codeSecret is init to [0] !
        _codeSecret: gameDetails.codeSecret.length > 1
  }, () => {
      if (this.state._gameDetails.joiner === "0x0000000000000000000000000000000000000000") {
        mastermind.on("GameJoined", this.handleGameJoined);
      }

      if(this.isCurrentMaker()){
        this.setupMakerEventListeners();
      }
      else{
        this.setupBreakerEventListeners();
      }

      if (this.state._gameDetails.joiner !== "0x0000000000000000000000000000000000000000") {
        console.log("is Joined!")
        this.setState({ _joined: true });
      }
    });

  }

  setupBreakerEventListeners() {
    const { _mastermind } = this.state;
    _mastermind.on("Feedback", this.wrap(this.handleFeedback));
    _mastermind.on("HashPublished", this.wrap(this.handleHashPublished));
    _mastermind.on("CodeSecretPublished", this.wrap(this.handleCodeSecretPublished));
    _mastermind.on("GameEnded", this.wrap(this.handleGameEnded));
  }

  setupMakerEventListeners() {
    const { _mastermind } = this.state;
    _mastermind.on("Guess", this.wrap(this.handleGuess));
    _mastermind.on("Dispute", this.wrap(this.handleDispute));
    _mastermind.on("TurnStarted", this.wrap(this.handleTurnStarted));
    _mastermind.on("TurnEnded", this.wrap(this.handleTurnEnded));
    _mastermind.on("GameEnded", this.wrap(this.handleGameEnded));
  }

  resetLastGuess = () => {
    this.setState({ _lastGuess: undefined });
  }
  handleGuess(gameId, guess) {
    console.log("Guess received:", guess.map(Number));
    // Handle event A
    this.setState({ _lastGuess: guess });
  }
  
  resetLastFeedback = () => {
    this.setState({ _lastFeedback: undefined });
  }
  handleFeedback(gameId,cc,nc) {
    console.log("Feedback received:");
    // Handle event B
    this.setState({ _lastFeedback: {"cc": cc, "nc": nc} });
  }

  handleDispute(eventData) {
    console.log("Event C received:", eventData);
    // Handle event C
  }

  handleHashPublished(eventData) {
    console.log("Hash published");
    this.setState({ _codeHash: true })
  }

  handleTurnStarted(gamedId, maker) {
      console.log("StartTurn received:");
      this.setState({ _turnStarted: true });

      this.setState(prevState => ({ //
        _gameDetails: {
          ...prevState._gameDetails,
          currentTurn: prevState._gameDetails.currentTurn + 1
        }
      }));
  }

  handleTurnEnded(gameID, codeGuessed) {
    console.log("TurnEnded received, the code was " + (!codeGuessed ? "not" : "") + " guessed by the breaker");
    this.setState({ _turnEnded: true });
  }

  handleCodeSecretPublished(gameId, rawSecretCode) {
    console.log("CodeSecretPublished received: ", rawSecretCode);
    const secretCode = rawSecretCode.map(Number);
    this.setState({ _codeSecret: secretCode });
  }

  handleGameJoined(gameId, joiner, creator) {
    console.log("GameJoined received:");
    this.setState({ _joined: true , joiner: joiner});
  }

  handleGameEnded(gameId, winner, winnerPoints, loserPoints) {
    console.log("GameEnded received, the winner is " + winner + " with " + winnerPoints + " points");
  }

  setCodeSecretMemo (newCode) {
    this.setState({ _codeSecretMemo: newCode }, () => {
      console.log("Code secret memo updated:", JSON.stringify(newCode));
      localStorage.setItem('_codeSecretMemo_' + this.state.gameId, JSON.stringify(newCode));
      console.log(localStorage.getItem('_codeSecretMemo_' + this.state.gameId));
    });
  }
  
  setCodeSeedMemo (newSeed) {
    // TODO ensure that this is later parsed as Uint8Array
    this.setState({ _codeSeedMemo: newSeed }, () => {
      console.log("Code seed memo updated:", newSeed);
      localStorage.setItem('_codeSeedMemo_' + this.state.gameId, JSON.stringify(newSeed));
      console.log(localStorage.getItem('_codeSeedMemo_' + this.state.gameId));
    });
  }

  componentWillUnmount() { //TODO: diversificare unmount in caso si tratti di maker o breaker
    const { _mastermind } = this.state;
    if (_mastermind) {
      _mastermind.off("Guess", this.wrap(this.handleGuess));
      _mastermind.off("Feedback", this.wrap(this.handleFeedback));
      _mastermind.off("Dispute", this.wrap(this.handleDispute));
      _mastermind.on("HashPublished", this.wrap(this.handleHashPublished));
      _mastermind.on("TurnStarted", this.wrap(this.startTurn));
      _mastermind.on("GameJoined", this.wrap(this.handleGameJoined)); 
    }
  }

  isCurrentMaker() {
    const game = this.state._gameDetails;
    if (game.currentTurn === 0) {
      if (this.state.selectedAddress === game.creator) {
        return game.creatorIsMakerSeed;
      } else {
        return !game.creatorIsMakerSeed;
      }
    }  
      if (this.state.selectedAddress === game.creator) {
          if ((game.currentTurn % 2 === 1 && game.creatorIsMakerSeed) ||
              (game.currentTurn % 2 === 0 && !game.creatorIsMakerSeed)) {
              return true;
          }
      }
      if (this.state.selectedAddress === game.joiner) {
          if ((game.currentTurn % 2 === 0 && game.creatorIsMakerSeed) ||
              (game.currentTurn % 2 === 1 && !game.creatorIsMakerSeed)) {
                return true;
          }
      }
      return false;
  }

  render() {
    if (this.state._mastermind === undefined) {
      return <Loading />;
    }
    //controlla se sia presente selectedAddress e gameId: se non lo sono, redirect a Dapp.js
    if (!this.state.selectedAddress || !this.state.gameId) {
      // TODO check if this is the correct way to redirect
      // redirect to Home
      return (this.props.router.navigate('/'));
    }
    

    //se non c'è il joiner
    //render di Loading con messaggio "aspettiamo il joiner"
    //ci mettiamo in ascolto di GameJoined event (https://stackoverflow.com/questions/58150023/how-do-we-listen-to-solidity-smart-contract-events-on-react-js)

    //stampare a schermo informazioni sull'attuale game in corso
    return (
      <div className="container p-4">
        {this.isCurrentMaker() &&
          <div className="row">
            <div className="secret-row">
              {this.state._codeSecretMemo &&
                this.state._codeSecretMemo.map((i, index) => (
                  <div className="large-color-circle" key={index} style={{ backgroundColor: intToColor(i) || 'white' }} />))}
              {!this.state._codeSecretMemo &&
                Array(6).fill(-1).map((i, index) => (
                  <div className="large-color-circle" key={index} style={{ backgroundColor: intToColor(i) || 'white' }} />))}
            </div>
          </div>
        }

      <div className="row">
        <div className="col-12">
          <h3>Game ID: {this.state.gameId} / Current Turn: {parseInt(this.state._gameDetails.currentTurn)} </h3>
          Selected Address: {this.state.selectedAddress}
          <br />
          You are the {this.isCurrentMaker() ? "Maker" : "Breaker"}
          {/* resto delle informazioni */}
        </div>
      </div>

      {/* 
      se sono maker
      render di BoardMaker -> component per giocare come maker

      se sono breaker
      render di BoardBreaker -> component per giocare come breaker */}

        {!this.isCurrentMaker() &&
          (<BoardBreaker
            maxGuesses={Number(this.state._gameDetails.maxGuesses)}
            makeGuess={this.makeGuess}
            startTurn={this.startTurn}
            turnStarted={this.state._turnStarted}
            codeHash={this.state._codeHash}
            joined={this.state._joined}
            newFeedback={this.state._lastFeedback}
            resetNewFeedback={this.resetLastFeedback}
            guesses={this.state.guesses}
            feedbacks={this.state.feedbacks}
            codeSecretPublished={this.state._codeSecret}
            disputeFeedback={this.disputeFeedback}
         />)}

        {this.isCurrentMaker() &&
          (<BoardMaker
          // TODO add seed and display it to allow player to annotate it
            maxGuesses={Number(this.state._gameDetails.maxGuesses)}
            hashSecretCode={this.computeHash}
            generateSeed={this.generateRandomString}
            codeHash={this.state._codeHash}
            submitSecretHash={this.submitCodeHash}
            newGuess={this.state._lastGuess}
            resetNewGuess={this.resetLastGuess}
            turnStarted={this.state._turnStarted}
            provideFeedback={this.provideFeedback}
            guesses={this.state.guesses}
            feedbacks={this.state.feedbacks}
            turnEnded={this.state._turnEnded}
            codeSecretPublished={this.state._codeSecret}
            publishCodeSecret={this.publishCodeSecret}
            codeSecretMemo={this.state._codeSecretMemo}
            codeSeedMemo={this.state._codeSeedMemo}
            setCodeSecretMemo={this.setCodeSecretMemo}
            setCodeSeedMemo={this.setCodeSeedMemo}
          />)}
      </div>

      //se sono maker
      //render di BoardMaker -> component per giocare come maker

      //se sono breaker
      //render di BoardBreaker -> component per giocare come breaker

      //pulsantino per accusa di AFK
      );
}

  // Function A: Generate a random 64-character long string
  generateRandomString() {
    console.log("Generating random string");
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return array;
    // return window.crypto.getRandomValues(32); // 32 bytes * 2 hex chars per byte = 64 hex chars
  }

  // Function B: Hash the string prepended to the serialized array
  computeHash(intArray, seed) {
    // Serialize the array as it would be in Solidity
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const types = new Array(intArray.length).fill('uint256');
    const serializedArray = abiCoder.encode(types, intArray);

    this.setCodeSeedMemo(seed);

    // Concatenate the seed and the serialized array
    const combined = ethers.concat([seed, serializedArray]);

    // Compute the hash
    return ethers.keccak256(combined);
  }

  jsonStringToUint8Array(jsonString) {
    if (!jsonString) {
      return undefined;
    }
    // Parse the JSON string to an object
    const obj = JSON.parse(jsonString);
    
    // Create an array of length 32 filled with zeros
    const array = new Array(32).fill(0);
    
    // Populate the array with values from the object
    for (const [key, value] of Object.entries(obj)) {
      array[parseInt(key, 10)] = value;
    }
    
    // Convert the array to Uint8Array
    return new Uint8Array(array);
  }


  // -------------------------- CONTRACT INTERACTIONS --------------------------

  async publishCodeSecret(codeSecret, codeSeed) {

    this._dismissTransactionError();
    let req = undefined;
    
    try{
      console.log("Publishing code secret");
      console.log(codeSeed);
      console.log(codeSecret);
      req = await this.state._mastermind.publishCodeSecret(this.state.gameId, codeSecret, codeSeed);
      console.log(req);

      this.setState({ reqBeingSent: req.hash });
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      
      this.setState({_codeSecret : true});
      // await this._updateBalance();
      // this.redirectToGame(gameId, this.state.selectedAddress)

    } catch (error) {
      // We check the error code to see if this error was produced because the
      // user rejected a tx. If that's the case, we do nothing.
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // Other errors are logged and stored in the Dapp's state. This is used to
      // show them to the user, and for debugging.
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a request anymore, so we clear
      // this part of the state.
      this.setState({ reqBeingSent: undefined });
    }
  }

  async submitCodeHash(codeHash) {

    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.submitCodeHash(this.state.gameId, codeHash);
      this.setState({ reqBeingSent: req.hash });
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      
      this.setState({_codeHash : true});
      // await this._updateBalance();
      // this.redirectToGame(gameId, this.state.selectedAddress)

    } catch (error) {
      // We check the error code to see if this error was produced because the
      // user rejected a tx. If that's the case, we do nothing.
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // Other errors are logged and stored in the Dapp's state. This is used to
      // show them to the user, and for debugging.
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a request anymore, so we clear
      // this part of the state.
      this.setState({ reqBeingSent: undefined });
    }
  }

  async makeGuess(guess) {

    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.makeGuess(this.state.gameId,guess);
      this.setState({ reqBeingSent: req.hash });
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      this.setState({_lastGuess : guess});

    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ reqBeingSent: undefined });
    }
  }

  async provideFeedback(cc,nc) {
    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.provideFeedback(this.state.gameId,cc,nc);
      this.setState({ reqBeingSent: req.hash });
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      this.setState({_lastFeedback : {"cc": cc, "nc": nc}});

    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ reqBeingSent: undefined });
    }
  }

  async startTurn() {
    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.startTurn(this.state.gameId);
      this.setState({ reqBeingSent: req.hash });
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      this.setState(prevState => ({
        _gameDetails: {
          ...prevState._gameDetails,
          currentTurn: prevState._gameDetails.currentTurn + 1
        }
      }));

    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ reqBeingSent: undefined });
    }
  
  }

  async disputeFeedback(guessIDs) {
    this._dismissTransactionError();
    let req = undefined;
  
    try{
      req = await this.state._mastermind.disputeFeedback(this.state.gameId,guessIDs);
      this.setState({ reqBeingSent: req.hash });
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      // this.setState(prevState => ({
      //   _gameDetails: {
      //     ...prevState._gameDetails,
      //     currentTurn: prevState._gameDetails.currentTurn + 1
      //   }
      // }));

    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ reqBeingSent: undefined });
    }
  
  }
  /*
  board maker avrà riferimento a "GenerateCodeModal", per submittare 
  */

  // _generateRandomSalt() {
  //   return crypto.randomBytes(32); // 32 bytes * 2 hex chars per byte = 64 hex chars
  // }

  // // Logic to join a game
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }
}

export default withRouter(Game);
export { Game };
