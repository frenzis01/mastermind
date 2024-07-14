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
    this.computeHash = this.computeHash.bind(this);
    this.submitCodeHash = this.submitCodeHash.bind(this);
    this.makeGuess = this.makeGuess.bind(this);
    this.startTurn = this.startTurn.bind(this);
    this.provideFeedback = this.provideFeedback.bind(this);


  } 

  componentDidMount(){
    this._initializeEthers();
  }

  wrap = (handler) => {
    return (...args) => {
      const event = args[args.length - 1];  // The event object is always the last argument
      console.log(event)

      const transactionHash = event.log.transactionHash;
      // console.log(transactionHash)
      // console.log("Catched Set");
      // console.log(this.state._catchedEvents);
      if (this.localCatchedEvents.has(transactionHash) || this.state._catchedEvents.has(transactionHash)) {
        console.log('Event already catched, discarding:', event);
      } else {
        this.localCatchedEvents.add(transactionHash); // Add to local set
        this.setState((prevState) => ({
          _catchedEvents: new Set(prevState._catchedEvents).add(transactionHash)
        }), () => {
          handler(...args); // Pass all arguments including the event object to the handler
        });
      }
      // console.log("Catched Set After");
      // console.log(this.state._catchedEvents);
      // console.log(this.localCatchedEvents);
      };
  };

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // console.log("Signer");
    // console.log(signer);
    // Then, we initialize the contract using that provider and the token's artifact.
    const mastermind = new ethers.Contract(
      contractAddress.Mastermind,
      MastermindArtifact.abi,
      signer
    );

    // provider.on("block", async (n) => {
    //   console.log(n)
    //   const block = await provider.getBlock(n);
  
    //   console.log(block.number.toString());
    // });

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
    // this.setState({ _gameDetails: gameDetails });
    // this.setState({ _provider: provider});
    // this.setState({ _mastermind: mastermind });
    this.setState({ _gameDetails: gameDetails, _provider: provider, _mastermind: mastermind }, () => {
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
  }

  setupMakerEventListeners() {
    const { _mastermind } = this.state;
    _mastermind.on("Guess", this.wrap(this.handleGuess));
    _mastermind.on("Dispute", this.wrap(this.handleDispute));
    _mastermind.on("TurnStarted", this.wrap(this.handleTurnStarted));
  }

  handleGuess(gameId, guess) {
    console.log("Guess received:", guess.map(Number));
    // Handle event A
    this.setState({ _lastGuess: guess });
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

  handleGameJoined(gameId, joiner, creator) {
    console.log("GameJoined received:");
    this.setState({ _joined: true , joiner: joiner});
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
                // console.log("First if");
              return true;
          }
      }
      if (this.state.selectedAddress === game.joiner) {
          if ((game.currentTurn % 2 === 0 && game.creatorIsMakerSeed) ||
              (game.currentTurn % 2 === 1 && !game.creatorIsMakerSeed)) {
                // console.log("Second if");
                return true;
          }
      }
      return false;
  }

  render() {
    if (this.state._mastermind === undefined) {
      // console.log(this.state._mastermind)
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
        makeGuess={this.makeGuess}
        startTurn={this.startTurn}
        codeHash={this.state._codeHash}
        joined={this.state._joined}
        newFeedback={this.state._lastFeedback}
        guesses={this.state.guesses}
        feedbacks={this.state.feedbacks}/>)}
      
      {this.isCurrentMaker() &&
        (<BoardMaker 
        hashSecretCode={this.computeHash}
        generateSeed={this.generateRandomString}
        submitSecretHash={ this.submitCodeHash }
        newGuess = {this.state._lastGuess}
        turnStarted = {this.state._turnStarted}
        provideFeedback={this.provideFeedback} 
        guesses={this.state.guesses}
        feedbacks={this.state.feedbacks}/>)}
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
    // console.log("Generating random string");
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

    // Concatenate the seed and the serialized array
    const combined = ethers.concat([seed, serializedArray]);

    // Compute the hash
    return ethers.keccak256(combined);
  }

  async submitCodeHash(codeHash) {

    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.submitCodeHash(this.state.gameId, codeHash);
      this.setState({ reqBeingSent: req.hash });
      console.log(req);
      const receipt = await req.wait();
      console.log(receipt);
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      
      console.log(codeHash);
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
      console.log(req);
      const receipt = await req.wait();
      console.log(receipt);
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
    // const gameDetails = await this.state._mastermind.getGameDetails(this.state.gameId);
    // console.log("Game id " + this.state.gameId);
    // console.log("Current turn: " + gameDetails.toObject().currentTurn);
    // console.log("CodeHash: " + gameDetails.toObject().codeHash);

    // await this.state._mastermind.makeGuess(this.state.gameId, guess);

    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.provideFeedback(this.state.gameId,cc,nc);
      this.setState({ reqBeingSent: req.hash });
      // console.log(req);
      const receipt = await req.wait();
      // console.log(receipt);
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
    // return new Promise((resolve) => {
    //   this.state._mastermind.startTurn(this.state.gameId);
    // });
    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.startTurn(this.state.gameId);
      this.setState({ reqBeingSent: req.hash });
      console.log(req);
      const receipt = await req.wait();
      console.log(receipt);
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
