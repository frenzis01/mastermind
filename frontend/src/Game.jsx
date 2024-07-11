import React from 'react';

// Ethers used to interact with the Ethereum network and our contract
import { ethers } from "ethers";

//import { BoardBreaker } from './components/boards/BoardBreaker';
//import { BoardMaker } from './components/boards/BoardMaker';
import { Loading } from './components/misc/Loading';
import { withRouter } from './components/WithRouter';
//import ColorChooseModal from './components/modals/ColorChooseModal';

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
    };
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
    }, this.state); //ToDo: capire a cosa collegare useEffect*/

  render() {
    //controlla se sia presente selectedAddress e gameId: se non lo sono, redirect a Dapp.js

    //se non c'è il joiner
    //render di Loading con messaggio "aspettiamo il joiner"
    //ci mettiamo in ascolto di GameJoined event (https://stackoverflow.com/questions/58150023/how-do-we-listen-to-solidity-smart-contract-events-on-react-js)

    //stampare a schermo informazioni sull'attuale game in corso
    return (
      <div className="container p-4">
      <div className="row">
        <div className="col-12">
          <h1>Game ID: {this.state.gameId}</h1>
          <h2>Selected Address: {this.state.selectedAddress}</h2>
          {/* resto delle informazioni */}
        </div>
      </div>

      {/* this.state.submitCodeHashModalOpen && <ColorChooseModal submitHandler={this.submitCodeHash} /> */}
      </div>
    );

    //se sono maker
    //render di BoardMaker -> component per giocare come maker

    //se sono breaker
    //render di BoardBreaker -> component per giocare come breaker

    //pulsantino per accusa di AFK
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
