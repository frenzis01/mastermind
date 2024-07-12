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
      //info sul game
      joiner: true, // TODO replace with actual value
      _mastermind: undefined,
      _provider: undefined,
      _gameDetails: undefined,
    };

    this._initializeEthers = this._initializeEthers.bind(this);
    this.handleGuess = this.handleGuess.bind(this);
    this.handleFeedback = this.handleFeedback.bind(this);
    this.handleDispute = this.handleDispute.bind(this);
  } 

  // getGameDetails() {
  //   const gameDetails = this.state._mastermind.getGameDetails(this.state.gameId);
  //   console.log(gameDetails);
  // }


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
    const gameDetails = (await mastermind.getGameDetails(this.state.gameId)).toObject();
    // Perform useful conversions
    gameDetails.creator = gameDetails.creator.toLowerCase();
    gameDetails.joiner = gameDetails.joiner.toLowerCase();
    gameDetails.currentTurn = parseInt(gameDetails.currentTurn);
    gameDetails.guessesLength = parseInt(gameDetails.guessesLength);
    console.log(gameDetails);
    // this.setState({ _gameDetails: gameDetails });
    // this.setState({ _provider: provider});
    // this.setState({ _mastermind: mastermind });
    this.setState({ _gameDetails: gameDetails, _provider: provider, _mastermind: mastermind }, () => {
      this.setupEventListeners();
    });
  }

  setupEventListeners() {
    const { _mastermind } = this.state;
    _mastermind.on("Guess", this.handleGuess);
    _mastermind.on("Feedback", this.handleFeedback);
    _mastermind.on("Dispute", this.handleDispute);
  }

  handleGuess(eventData) {
    console.log("Event A received:", eventData);
    // Handle event A
  }

  handleFeedback(eventData) {
    console.log("Event B received:", eventData);
    // Handle event B
  }

  handleDispute(eventData) {
    console.log("Event C received:", eventData);
    // Handle event C
  }

  componentWillUnmount() {
    const { _mastermind } = this.state;
    if (_mastermind) {
      _mastermind.off("Guess", this.handleGuess);
      _mastermind.off("Feedback", this.handleFeedback);
      _mastermind.off("Dispute", this.handleDispute);
    }
  }
    //init dove chiamiamo fetchInfo

    /*
    useEffect(() => {
      // initializing provider and dai contract instance
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract(
        contractAddress,
        abiCode,
        provider
      );

        // caching the emitted event
        contract && contract.on("TurnEnded", eve => {
            //update info relative al turno
        })
    }, this.state); 
    //ToDo: capire a cosa collegare useEffect. 
    //TODO useEffect forse non si può usare nelle classi!! */

  isCurrentMaker() {
    const game = this.state._gameDetails;
    // console.log(this.state.selectedAddress === game.creator);
    // console.log(game.currentTurn % 2 == 1 && game.creatorIsMakerSeed);
    // console.log(game.currentTurn);
    // console.log(game.creatorIsMakerSeed);
      if (this.state.selectedAddress === game.creator) {
          if ((game.currentTurn % 2 === 1 && game.creatorIsMakerSeed) ||
              (game.currentTurn % 2 === 0 && !game.creatorIsMakerSeed) ||
              (game.currentTurn === 0 && game.creatorIsMakerSeed)) {
                console.log("First if");
              return true;
          }
      }
      if (this.state.selectedAddress === game.joiner) {
          if ((game.currentTurn != 0 && game.currentTurn % 2 === 0 && game.creatorIsMakerSeed) ||
              (game.currentTurn % 2 === 1 && !game.creatorIsMakerSeed) ||
              (game.currentTurn === 0 && !game.creatorIsMakerSeed)) {
                console.log("Second if");
                return true;
          }
      }
      return false;
  }

  render() {
    if (this.state._mastermind === undefined) {
      // console.log(this.state._mastermind)
      this._initializeEthers();
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

      {!this.isCurrentMaker() && (<BoardBreaker />)}
      {this.isCurrentMaker() && (<BoardMaker />)}
      
      {/* this.state.submitCodeHashModalOpen && <ColorChooseModal submitHandler={this.submitCodeHash} /> */}
      </div>

      //se sono maker
      //render di BoardMaker -> component per giocare come maker

      //se sono breaker
      //render di BoardBreaker -> component per giocare come breaker

      //pulsantino per accusa di AFK
      );
}

  /*
    async fetchInfo(gameId){

        setState(...)
    }
  */

  /*
  board maker avrà riferimento a "GenerateCodeModal", per submittare 
  */

  // _generateRandomSalt() {
  //   return crypto.randomBytes(32); // 32 bytes * 2 hex chars per byte = 64 hex chars
  // }
  // _computeHash(intArray, seed) {
  //   // Serialize the array as it would be in Solidity
  //   const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  //   const types = new Array(intArray.length).fill('uint256');
  //   const serializedArray = abiCoder.encode(types, intArray);

  //   // Concatenate the seed and the serialized array
  //   const combined = ethers.concat([seed, serializedArray]);

  //   console.log("JS hash: " + ethers.keccak256(combined));
  //   // Compute the hash
  //   return ethers.keccak256(combined);
  // }
  // // Logic to join a game
  // async submitCodeHash(gameId, codeSecret) {

  //   let req = undefined;

  //   const codeHash = this.computeHash(codeSecret, this.generateRandomSalt());

  //   await this._mastermind.submitCodeHash(gameId, codeHash);
  // }

  // async makeGuess(gameId, guess) {
  //   await this._mastermind.makeGuess(gameId, guess);
  // }

}

export default withRouter(Game);
export { Game };
