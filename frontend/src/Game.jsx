import React, { useState } from 'react';
// Ethers used to interact with the Ethereum network and our contract
import { ethers } from "ethers";

import { BoardBreaker } from './components/boards/BoardBreaker';
import { BoardMaker } from './components/boards/BoardMaker';
import { Loading } from './components/misc/Loading';
import { withRouter } from './components/WithRouter';
//import ColorChooseModal from './components/modals/ColorChooseModal';
import { NonClosableModal } from "./components/modals/NonClosableModal";

import MastermindArtifact from "./contracts/Mastermind.json";
import contractAddress from "./contracts/contract-address.json"
import { intToColor } from './assets/colors';

import Snackbar from "./components/snackBar/SnackBar";

import { bindWrapContractInteraction } from './utils/utils';

import "../src/css/styles.css"

class Game extends React.Component {
  constructor(props) {
    super(props);

    const { id: gameId } = this.props.router.params;
    const { selectedAddress, _mastermind: home_mastermind_flag, _provider: home_provider_flag } = this.props.router.location.state || {};

    this.state = {
      gameId: gameId,
      selectedAddress: selectedAddress.toLowerCase(),
      home_mastermind_flag: home_mastermind_flag,
      home_provider_flag: home_provider_flag,
      turn: undefined,
      submitCodeHashModalOpen: true,
      reqBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      //infos about the game
      joiner: undefined,
      guesses: [],
      feedbacks: [],
      makerListeners: {},
      breakerListeners: {},
      playerListeners: {},
      gameJoinedHandler: undefined,
      _mastermind: undefined,
      _provider: undefined,
      _gameDetails: undefined,
      _lastGuess: undefined,
      _lastFeedback: undefined,
      _codeHash: undefined,
      _joined: false,
      _turnStarted: false,
      _turnEnded: false,
      _disputed: false,
      _accusedAFK: {}, // dictionary indicating the time of accusation for each player
      _codeSecret: undefined,
      // persistent (known by the player) codeSecret(s) to be displayed in BoardMaker
      // These codes will persist in case of page reload or change page/game
      // They get reset on createGame in Home.jsx or on GameEnded
      _codeSecretMemo: this.jsonStringParse(localStorage.getItem('_codeSecretMemo_' + gameId)) || undefined,
      // fundamental to parse as Uint8Array
      _codeSeedMemo: this.jsonStringToUint8Array(localStorage.getItem('_codeSeedMemo_' + gameId)) || undefined,
      _gameEnded:false,
      _gameEndedMessages: undefined,
      _catchedEvents: new Set()
    };

    this.localCatchedEvents = new Set();
    this.wrap = this.wrap.bind();

    this._initializeEthers = this._initializeEthers.bind(this);
    this.setupBreakerEventListeners = this.setupBreakerEventListeners.bind(this);
    this.setupMakerEventListeners = this.setupMakerEventListeners.bind(this);
    this.setupPlayerEventListeners = this.setupPlayerEventListeners.bind(this);
    this.removeBreakerEventListeners = this.removeBreakerEventListeners.bind(this);
    this.removeMakerEventListeners = this.removeMakerEventListeners.bind(this);
    this.removePlayerEventListeners = this.removePlayerEventListeners.bind(this);
    
    this.componentDidMount = this.componentDidMount.bind(this);
    this.componentWillUnmount = this.componentWillUnmount.bind(this);

    this.handleGuess = this.handleGuess.bind(this);
    this.handleFeedback = this.handleFeedback.bind(this);
    this.handleDispute = this.handleDispute.bind(this);
    this.handleHashPublished = this.handleHashPublished.bind(this);
    this.handleTurnStarted = this.handleTurnStarted.bind(this);
    this.handleGameJoined = this.handleGameJoined.bind(this);
    this.handleTurnEnded = this.handleTurnEnded.bind(this);
    this.handleCodeSecretPublished = this.handleCodeSecretPublished.bind(this);
    this.handleAFKAccusation = this.handleAFKAccusation.bind(this);
    this.handleGameEnded = this.handleGameEnded.bind(this);
    this.setCodeSecretMemo = this.setCodeSecretMemo.bind(this);
    this.setCodeSeedMemo = this.setCodeSeedMemo.bind(this);
    this.getGameEndedMessages = this.getGameEndedMessages.bind(this);


    this.computeHash = this.computeHash.bind(this);
    this.submitCodeHash = this.submitCodeHash.bind(this);
    this.makeGuess = this.makeGuess.bind(this);
    this.startTurn = this.startTurn.bind(this);
    this.provideFeedback = this.provideFeedback.bind(this);
    this.resetLastGuess = this.resetLastGuess.bind(this);
    this.resetLastFeedback = this.resetLastFeedback.bind(this);
    this.publishCodeSecret = this.publishCodeSecret.bind(this);
    this.disputeFeedback = this.disputeFeedback.bind(this);
    this.accuseAFK = this.accuseAFK.bind(this);
    this.verifyAFKAccusation = this.verifyAFKAccusation.bind(this);
    this.addAFKaccuse = this.addAFKaccuse.bind(this);
    this.resetAFKaccuse = this.resetAFKaccuse.bind(this);
    this.setupNewTurn = this.setupNewTurn.bind(this);
    
    this.redirectHome = this.redirectHome.bind(this);
    this.wrapContractInteraction = bindWrapContractInteraction(this);
  } 

  componentDidMount(){
    this._initializeEthers();
  }

  addSnack = (type, message) =>{
    this.props.addCustomSnack(<Snackbar variant={type} message={message} />, {
      horizontal: "top",
      vertical: "right"
    })
  }

  wrap = (handler) => { 
    return (...args) => {
      const event = args[args.length - 1];  // The event object is always the last argument

      const transactionHash = event.log.transactionHash;
      const filter = event.filter;

      const eventIdentifier = `${transactionHash}-${filter}`;

      console.log(eventIdentifier)
      const cond = (this.localCatchedEvents.has(eventIdentifier) || this.state._catchedEvents.has(eventIdentifier)) 
      // console.log(cond)
      if (cond) {
        // console.log('Event already catched, discarding:', eventIdentifier);
      } else {
        // console.log("Else branch taken")
        this.localCatchedEvents.add(eventIdentifier); // Add to local set
        this.setState((prevState) => ({
          _catchedEvents: new Set(prevState._catchedEvents).add(eventIdentifier)
        }), () => {
          // console.log("Invoking handler on:", eventIdentifier);
          handler(...args); // Pass all arguments including the event object to the handler
        });
      }
      };
  };

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const signer = await provider.getSigner();

    // Useless probably
    provider.polling = true;
    provider.pollingInterval = 1000; // Set to 1000 ms (1 second)
    
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

      this.setState({ guesses: guesses});
    }

    gameDetails.feedbacksLength = parseInt(gameDetails.feedbacksLength);
    if(gameDetails.feedbacksLength !== 0){
      const reqFeedbacks = await mastermind.getFeedback(this.state.gameId);
      const rawFeedbacks = reqFeedbacks.map(parseProxy);

      const feedbacks = rawFeedbacks.map(f => {
        return { cc: Number(f[0]), nc: Number(f[1]) };
      });

      this.setState({ feedbacks: feedbacks });
    }
    

    this.addAFKaccuse(gameDetails.creator, gameDetails.creatorAFKaccused === 0n ? undefined : Number(gameDetails.creatorAFKaccused));
    this.addAFKaccuse(gameDetails.joiner, gameDetails.joinerAFKaccused === 0n ? undefined : Number(gameDetails.joinerAFKaccused));

    this.setState({ 
        _gameDetails: gameDetails,
        _provider: provider,
        _mastermind: mastermind,
        _turnStarted: gameDetails.startTime != 0,
        _turnEnded: gameDetails.endTime != 0,
        _codeHash: gameDetails.codeHash,
        _codeSecret: gameDetails.codeSecret.map(Number),
        _gameEnded: gameDetails.gameEnded,
  }, () => {
      if (this.state._gameDetails.joiner === "0x0000000000000000000000000000000000000000") {
        this.setState({gameJoinedHandler: this.wrap(this.handleGameJoined)}, function(){
          mastermind.on("GameJoined", this.state.gameJoinedHandler);
        })
      }
      if (this.state._gameDetails._gameEnded === true) {
        // If the game is ended, infer winner and set proper messages
        const creatorPoints = parseInt(gameDetails.creatorPoints);
        const joinerPoints = parseInt(gameDetails.joinerPoints);
        // Note the >= in case of a tie
        const winner = creatorPoints >= joinerPoints ? gameDetails.creator : gameDetails.joiner;
        this.setState({ _gameEndedMessages:
        this.getGameEndedMessages(
          winner,
          winner === gameDetails.creator ? creatorPoints : joinerPoints,
          winner === gameDetails.creator ? joinerPoints : creatorPoints
        )});
        this.removeBreakerEventListeners();
        this.removeMakerEventListeners();
        return; // No need to setup listeners, the game has ended
      }
      
      this.setupPlayerEventListeners();

      if(this.isCurrentMaker()){
        this.removeBreakerEventListeners();
        this.setupMakerEventListeners();
      }
      else{
        this.removeMakerEventListeners();
        this.setupBreakerEventListeners();
      }

      if (this.state._gameDetails.joiner !== "0x0000000000000000000000000000000000000000" && this.state._gameDetails.gameStarted === true) {
        this.setState({ _joined: true });
      }
    });

  }

  setupPlayerEventListeners() {
    const { _mastermind } = this.state;
    const playerListeners = {
      "TurnEnded": this.wrap(this.handleTurnEnded),
      "GameEnded": this.wrap(this.handleGameEnded),
      "AFKAccusation": this.wrap(this.handleAFKAccusation)
    };

    for (const [event, listener] of Object.entries(playerListeners)) {
      _mastermind.on(event, listener);
    }

    this.setState({ playerListeners: playerListeners });
  }

  setupBreakerEventListeners() {
    const { _mastermind } = this.state;
    const breakerListeners = {
      "Feedback": this.wrap(this.handleFeedback),
      "HashPublished": this.wrap(this.handleHashPublished),
      "CodeSecretPublished": this.wrap(this.handleCodeSecretPublished),
    };

    for (const [event, listener] of Object.entries(breakerListeners)) {
      _mastermind.on(event, listener);
    }

    this.setState({ breakerListeners: breakerListeners });
  }

  setupMakerEventListeners() {
    const { _mastermind } = this.state;
    const makerListeners = {
      "Guess": this.wrap(this.handleGuess),
      "Dispute": this.wrap(this.handleDispute),
      "TurnStarted": this.wrap(this.handleTurnStarted),
    };

    for (const [event, listener] of Object.entries(makerListeners)) {
      _mastermind.on(event, listener);
    }

    this.setState({ makerListeners: makerListeners });
  }

  removePlayerEventListeners() {
    const { _mastermind, playerListeners } = this.state;

    for (const [event, listener] of Object.entries(playerListeners)) {
      _mastermind.off(event, listener);
    }

    this.setState({ playerListeners: {} });
  }

  removeMakerEventListeners() {
    const { _mastermind, makerListeners } = this.state;

    for (const [event, listener] of Object.entries(makerListeners)) {
      _mastermind.off(event, listener);
    }

    this.setState({ makerListeners: {} });
  }

  removeBreakerEventListeners() {
    const { _mastermind, breakerListeners } = this.state;

    for (const [event, listener] of Object.entries(breakerListeners)) {
      _mastermind.off(event, listener);
    }

    this.setState({ breakerListeners: {} });
  }

  resetLastGuess = () => {
    this.setState({ _lastGuess: undefined });
  }
  handleGuess(gameId, guess) {
    this.addSnack("default", "New guess received")
    this.setState({ _lastGuess: guess });
    this.resetAFKaccuse(this.getOpponent());
  }
  
  resetLastFeedback = () => {
    this.setState({ _lastFeedback: undefined });
  }
  handleFeedback(gameId,cc,nc) {
    this.addSnack("default", "New Feedback received")
    this.setState({ _lastFeedback: {"cc": cc, "nc": nc} });
    this.resetAFKaccuse(this.getOpponent());
  }

  handleDispute(eventData) {
    this.addSnack("warning", "Your opponent claims you have cheated");
    this.setState({ _disputed: true });
  }
  
  handleHashPublished(gameId, codeMaker, hash) {
    this.addSnack("success", "Code hash published")
    this.setState({ _codeHash: hash })
    this.resetAFKaccuse(this.getOpponent());
  }

  handleTurnStarted(gamedId, maker) {
    this.addSnack("success", "Turn started")
    this.setState({ _turnStarted: true });

    this.resetAFKaccuse(this.getOpponent());
    this.resetAFKaccuse(this.state.selectedAddress);
    this.setupNewTurn();
  }

  handleTurnEnded(gameID, codeGuessed) {
    this.addSnack("default","TurnEnded received, the code was " + (!codeGuessed ? "not" : "") + " guessed by the breaker");
    this.setState({ _turnEnded: true });
  }

  handleCodeSecretPublished(gameId, rawSecretCode) {
    this.addSnack("success","Secret Code published");
    const secretCode = rawSecretCode.map(Number);
    this.setState({ _codeSecret: secretCode });
    this.resetAFKaccuse(this.getOpponent());
  }

  handleGameJoined(gameId, joiner, creator) {
    this.addSnack("default", "An opponent has joined the game")
    this.setState({ _joined: true , joiner: joiner});
  }

  handleAFKAccusation(gameId, accused) {
    if (accused.toLowerCase() === this.state.selectedAddress) {
      this.addSnack("warning", "You have been accused of being AFK")
      this.addAFKaccuse(accused, Date.now());
    }
  }

  handleGameEnded(gameId, winner, winnerPoints, loserPoints) {
    console.log("GameEnded received, the winner is " + winner + " with " + winnerPoints + " points");
    // reset persistent codeSecretMemo and codeSeedMemo
    this.setCodeSecretMemo(undefined);
    this.setCodeSeedMemo(undefined);
    const messages = this.getGameEndedMessages(winner, winnerPoints, loserPoints);
    this.setState({ _gameEnded: true, _gameEndedMessages: messages });
  }

  getGameEndedMessages(winner, winnerPoints, loserPoints) {
    const _winner = winner.toLowerCase();
    
    const stake = ethers.formatEther(this.state._gameDetails.gameStake);
    const isCreator = this.state.selectedAddress === this.state._gameDetails.creator.toLowerCase()
    const messages = {
      title: (_winner === this.state.selectedAddress ? "You won!" : "You lost!"),
      text: (_winner === this.state.selectedAddress ? 
        `Congratulations ${isCreator ? 'creator' : 'joiner'}! You won ${stake} ETH, having ${winnerPoints} points against ${loserPoints}` :
        `${isCreator ? 'Creator' : 'Joiner'}, you lost ${stake} ETH, having ${loserPoints} points against ${winnerPoints}`) 
        + ". Go back to the home page to play again!",
        buttonText: "Home",
      }
      
    if (Number(winnerPoints) === 1 && Number(loserPoints) === 0) {
      messages.text =
        (_winner === this.state.selectedAddress ?
          (this.state._disputed ? "Your opponent cheated" : "Your opponent went AFK") :
          (this.state._disputed ? "You cheated" : "You went AFK")
        )
        + ". Go back to the home page to play again!";
    }
    return messages;
  }

  setCodeSecretMemo (newCode) {
    this.setState({ _codeSecretMemo: newCode }, () => {
      localStorage.setItem('_codeSecretMemo_' + this.state.gameId, JSON.stringify(newCode));
    });
  }
  
  setCodeSeedMemo (newSeed) {
    this.setState({ _codeSeedMemo: newSeed }, () => {
      localStorage.setItem('_codeSeedMemo_' + this.state.gameId, JSON.stringify(newSeed));
    });
  }

  async setupNewTurn() {
    const { _mastermind } = this.state;
    const gameDetails = (await _mastermind.getGameDetails(this.state.gameId)).toObject();
    gameDetails.creator = gameDetails.creator.toLowerCase();
    gameDetails.joiner = gameDetails.joiner.toLowerCase();
    gameDetails.currentTurn = parseInt(gameDetails.currentTurn);
    this.setState({
      _gameDetails: gameDetails,
      _turnStarted: gameDetails.startTime != 0,
      _turnEnded: gameDetails.endTime != 0,
      _codeHash: gameDetails.codeHash,
      _codeSecret: gameDetails.codeSecret.map(Number),
      _lastFeedback: undefined,
      _lastGuess: undefined,
      _disputed: false,
      guesses: [],
      feedbacks: []
    }, function(){ //callback
      this.resetAFKaccuse(this.state._gameDetails.creator);
      this.resetAFKaccuse(this.state._gameDetails.joiner);
      this.setCodeSecretMemo(undefined);
      this.setCodeSeedMemo(undefined);
      if(this.isCurrentMaker()){
        this.removeBreakerEventListeners();
        this.setupMakerEventListeners();
      }
      else{
        this.removeMakerEventListeners();
        this.setupBreakerEventListeners();
      }
    })
  }

  componentWillUnmount() {
    const { _mastermind } = this.state;
    if (_mastermind) {
      this.removePlayerEventListeners();
      if(this.isCurrentMaker()){
        this.removeMakerEventListeners();
      }
      else{
        this.removeBreakerEventListeners();
      }
      _mastermind.off("GameJoined", this.state.gameJoinedHandler);
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

  addAFKaccuse = (player, timeOfAccusation) => {
    this.setState(prevState => ({
      _accusedAFK: {
        ...prevState._accusedAFK,
        [player]: timeOfAccusation
      }
    }));
  }

  resetAFKaccuse = (player) => {
    this.setState(prevState => ({
      _accusedAFK: {
        ...prevState._accusedAFK,
        [player]: undefined
      }
    }));
  }

  isAccused() {
    return this.state._accusedAFK[this.state.selectedAddress] !== undefined;
  }

  hasAccused() {
    const accused = this.state.selectedAddress === this.state._gameDetails.creator ? this.state._gameDetails.joiner : this.state._gameDetails.creator;
    return this.state._accusedAFK[accused] !== undefined;
  }

  getOpponent() {
    return this.state.selectedAddress === this.state._gameDetails.creator ? this.state._gameDetails.joiner : this.state._gameDetails.creator;
  }

  render() {
    if (this.state._mastermind === undefined) {
      return <Loading />;
    }
    // redirect to Home if this.state.selectedAddress or this.state.gameId are not setted
    if (!this.state.selectedAddress || !this.state.gameId || !this.state.home_mastermind_flag || !this.state.home_provider_flag ) {
      // return (this.props.router.navigate('/'));
      return (this.redirectHome());
    }
    
    //print infos about the game
    return (
      <div className="container-fluid vh-100">
        <div className="title top-left" onClick={this.redirectHome} style={{cursor:"pointer"}}>
            mastermind
        </div>
        <div className="under-title top-right">
          Your Address: <br>
          </br>
          <b style={{fontSize: "1em"}} >{this.state.selectedAddress}</b>
        </div>
        <div className="grid-container">
          <div className={`grid-item ${this.isCurrentMaker() ? 'left-column-maker' : 'left-column-breaker'}`}>
            <div className="column under-title">
              <h3>
                Game #{this.state.gameId} - Turn {parseInt(this.state._gameDetails.currentTurn)}/{parseInt(this.state._gameDetails.numTurns)}
              </h3>
              <div className='custom-line-height'>
                You are now the <b>{this.isCurrentMaker() ? "Maker" : "Breaker"}</b>
              </div>
              Stake: {2 * ethers.formatEther(this.state._gameDetails.gameStake)} ETH
            </div>
          </div>
          <div className="grid-item middle-column">
              {this.isCurrentMaker() &&
                <div className="top-secret-row">
                  {this.state._codeSecretMemo &&
                    this.state._codeSecretMemo.map((i, index) => (
                      <div className="large-color-circle" key={index} 
                      style={{ 
                        backgroundColor: intToColor(i) || 'white', 
                        cursor: 'default'   }} />))}
                  {!this.state._codeSecretMemo &&
                    Array(6).fill().map((i, index) => (
                      <div className="large-color-circle" key={index} 
                      style={{ 
                        backgroundColor: 'white',
                        cursor: 'default'   }} />))}
                </div>
              }
            {!this.isCurrentMaker() &&
              (<BoardBreaker
                maxTurns={Number(this.state._gameDetails.numTurns)}
                maxGuesses={Number(this.state._gameDetails.maxGuesses)}
                makeGuess={this.makeGuess}
                startTurn={this.startTurn}
                turnStarted={this.state._turnStarted}
                turnEnded={this.state._turnEnded}
                codeHash={this.state._codeHash}
                joined={this.state._joined}
                newFeedback={this.state._lastFeedback}
                resetNewFeedback={this.resetLastFeedback}
                guesses={this.state.guesses}
                feedbacks={this.state.feedbacks}
                codeSecretPublished={this.state._codeSecret}
                disputeFeedback={this.disputeFeedback}
                disputed={this.state._disputed}
                currentTurn={this.state._gameDetails.currentTurn}  
                gameEnded={this.state._gameEnded}
            />)}

            {this.isCurrentMaker() &&
              (<BoardMaker
              // TODO add seed and display it to allow player to annotate it
                maxTurns={Number(this.state._gameDetails.numTurns)}
                maxGuesses={Number(this.state._gameDetails.maxGuesses)}
                hashSecretCode={this.computeHash}
                generateSeed={this.generateRandomSeed}
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
                disputed={this.state._disputed}
                gameEnded={this.state._gameEnded}
                currentTurn={this.state._gameDetails.currentTurn}
              />)}
          </div>

          <div className={`grid-item ${this.isCurrentMaker() ? 'right-column-maker' : 'right-column-breaker'}`}>
            <div className="column">
              {this.isAccused() &&
              <div className='secret-row'>
                  You have been accused of being AFK
              </div>
              }
              { !this.hasAccused() &&
              <div className="d-flex align-items-center">
                <button className='btn-accuse-afk' onClick={this.accuseAFK}>Accuse opponent of being AFK</button>
              </div>}
              { this.hasAccused() &&
              <div className="d-flex align-items-center">
                <button className='btn-accuse-afk' onClick={this.verifyAFKAccusation}>Verify AFK accusation</button>
              </div>}
                {!this.state._joined && <NonClosableModal 
                  show={!this.state._joined}
                  title={"No opponent joined yet"}
                  text={"Wait for someone to join your game"}
                  buttonText={"Home"}
                  onClick={this.redirectHome}
                  ></NonClosableModal>}
                {this.state._gameEnded && <NonClosableModal
                show={this.state._gameEnded}
                title={this.state._gameEndedMessages.title}
                text={this.state._gameEndedMessages.text}
                buttonText={this.state._gameEndedMessages.buttonText}
                onClick={this.redirectHome}
                ></NonClosableModal>    
              }
            </div>
          </div>
        </div>
      </div>

      );
}
  redirectHome() {
    this.props.router.navigate('/');
  }

  // Generate a random 64-character long string salt
  generateRandomSeed() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return array;
  }

  // Hash the salt prepended to the serialized array
  computeHash(intArray, seed) {
    // Serialize the array as it would be in Solidity
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const types = new Array(intArray.length).fill('uint256');
    const serializedArray = abiCoder.encode(types, intArray);

    // Concatenate the seed and the serialized array
    const combined = ethers.concat([seed, serializedArray]);

    // Compute the hash
    return ethers.keccak256(combined);
  }

  jsonStringParse (jsonString) {
    if (!jsonString || jsonString === "undefined") {
      return undefined;
    }
    return JSON.parse(jsonString);
  }

  jsonStringToUint8Array(jsonString) {
    if (!jsonString || jsonString === "undefined") {
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
    this.wrapContractInteraction(
      this.state._mastermind.publishCodeSecret, 
      [this.state.gameId, codeSecret, codeSeed], () => {
      this.setState({_codeSecret : codeSecret});
      this.resetAFKaccuse(this.state.selectedAddress)
    });
  }

  async submitCodeHash(codeHash,codeSecret,codeSeed) {
    this.wrapContractInteraction(
      this.state._mastermind.submitCodeHash,
      [this.state.gameId, codeHash],
      () => {
        this.setState({_codeHash : codeHash});
        this.resetAFKaccuse(this.state.selectedAddress);
        this.setCodeSecretMemo(codeSecret);
        this.setCodeSeedMemo(codeSeed);  
      });
  }

  async makeGuess(guess) {
    this.wrapContractInteraction(
      this.state._mastermind.makeGuess,
      [this.state.gameId, guess],
      () => {
        this.setState({_lastGuess : guess});
        this.resetAFKaccuse(this.state.selectedAddress);
      });
  }

  async provideFeedback(cc,nc) {
    this.wrapContractInteraction(
      this.state._mastermind.provideFeedback,
      [this.state.gameId,cc,nc],
      () => {
        this.setState({_lastFeedback : {"cc": cc, "nc": nc}});
        this.resetAFKaccuse(this.state.selectedAddress);
      });
  }

  async startTurn() {
    this.wrapContractInteraction(
      this.state._mastermind.startTurn,
      [this.state.gameId],
      () => {
        this.setupNewTurn();
      });
  }

  async disputeFeedback(guessIDs) {
    this.wrapContractInteraction(
      this.state._mastermind.disputeFeedback,
      [this.state.gameId,guessIDs],
      () => {
        this.setState({_disputed : true});
      });

  }

  async accuseAFK(){
    this.wrapContractInteraction(
      this.state._mastermind.accuseAFK,
      [this.state.gameId],
      () => {
        // We should use the block timestamp instead of Date.now(), but it is a good approximation
        // Serves only as an indicator for there being an accusation, and to avoid flooding the contract
        // with useless accusations
        this.addAFKaccuse(this.getOpponent(), Date.now());
      });
  }

  async verifyAFKAccusation() {
    this.wrapContractInteraction(
      this.state._mastermind.verifyAFKAccusation,
      [this.state.gameId],
      () => {
        this.resetAFKaccuse(this.getOpponent());
      });
  }
  

  // -------------------------- TRANSACTION HANDLING --------------------------

  // // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }
}

export default withRouter(Game);
export { Game };
