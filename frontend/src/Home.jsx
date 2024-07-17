import React from "react";

// Ethers used to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// Import contract's artifacts and address here, as we are going to be
// using them with ethers
import MastermindArtifact from "./contracts/Mastermind.json";
import contractAddress from "./contracts/contract-address.json"

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./components/misc/NoWalletDetected";
import { ConnectWallet } from "./components/ConnectWallet";
import { Loading } from "./components/misc/Loading";
import { CreateGameModal}  from './components/modals/CreateGameModal';
import { TransactionErrorMessage } from "./components/misc/TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./components/misc/WaitingForTransactionMessage";

import { withRouter } from './components/WithRouter';

import Snackbar from "./components/snackBar/SnackBar";

import "./css/styles.css"

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Mastermind contract
//   3. Polls the user balance to keep it updated.
//   4. Allows you to create, join or resume a game
//   5. Renders the whole application
//
class Home extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      // The user's address and balance
      selectedAddress: undefined,
      balance: undefined,
      currency: "ETH",
      // The ID about transactions being sent, and any possible error with them
      reqBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      // available games
      availableGames: [],
      startedGames: [],
      newGame: false,
      _provider: undefined,
      _mastermind: undefined,
      // Metamask creates replicas of events for some reason
      // We will store here the hash of the transaction of received events,
      // To discard duplicates
      _catchedEvents: new Set()  
    };
    this.localCatchedEvents = new Set(); // Local set to handle immediate duplicates

    this.state = this.initialState;
    this.createGame = this.createGame.bind(this)
    
    this.wrap = this.wrap.bind(this);
    this.handleGameCreated = this.handleGameCreated.bind(this);
    this.handleGameJoined = this.handleGameJoined.bind(this);
  }

  componentWillUnmount() {
    this.removeEventListeners();
  }

  render() {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install a wallet.
    if (window.ethereum === undefined) {
      return (
        <div className="content container p-4">
          <h1 className="title">
              Mastermind
          </h1>
        <NoWalletDetected />
        </div>
      );
    }

    // Ask the user to connect their wallet.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <div className="content container p-4">
          <h1 className="title">
              Mastermind
          </h1>
          <ConnectWallet
            connectWallet={() => this._connectWallet()}
            networkError={this.state.networkError}
            dismiss={() => this._dismissNetworkError()}
          />
        </div>
      );
    }

    // If the available games or the user's balance hasn't loaded yet, we show
    // a loading component.
    if (!this.state.availableGames || !this.state.balance) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <div className="content container-fluid p-4">
        <div className="row">
          <div className="col-lg-6 col-md-6 mb-4 mb-md-0">
            <div className="text-centered">
              <h1 className="title">
                Mastermind
              </h1>
              <p>
                Welcome <b>{this.state.selectedAddress}</b>, <br/> you have{" "}
                <b>
                  {this.state.balance.toString()} {this.state.currency}
                </b>.
              </p>
              <button 
                className="btn-faded create-game-button-padding-bottom" 
                onClick={() => this.setState({ showModal: true })}>
                Create Game
              </button>
              {
                //Sending a transaction isn't an immediate action. You have to wait
                //for it to be mined.
                //If we are waiting for one, we show a message here.
              }
              {this.state.reqBeingSent && (
                <WaitingForTransactionMessage reqHash={this.state.reqBeingSent} />
              )}

              {
                //Sending a transaction can fail in multiple ways. 
                //If that happened, we show a message here.
              }
              {this.state.transactionError && (
                <TransactionErrorMessage
                  message={this._getRpcErrorMessage(this.state.transactionError)}
                  dismiss={() => this._dismissTransactionError()}
                />
              )}
            </div>
            
            <div className="box">
              <h3>Started Games</h3>
              {this.state.startedGames.length === 0 ? (
                <p className="under-title  frame-text">Start a new game or create one</p>
              ) : (
                <ul>
                  {this.state.startedGames.map((game) => (
                        <li className="list" key={game.gameId}>
                          <div className="content">
                            <h4>#{Number(game.gameId)} - Stake {ethers.formatEther(game.gameStake)} {this.state.currency}</h4>
                            <p>Creator: {game.creator}</p>
                            <button 
                              className="btn-faded hidden-button ml-2" 
                              onClick={() => this.resumeGame(game.gameId)}>
                              Resume Game
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
          </div>
        </div>

        <div className="col-lg-6 col-md-6">
          <div className="box">
            <h3>Available Games</h3>
            {this.state.availableGames.length === 0 ? (
                <p className="under-title frame-text">No available games, create one!</p>
              ) : (
                <ul>
                  {this.state.availableGames.map((game) => (
                    <li className={`list ${game.joiner !== '0x0000000000000000000000000000000000000000' ? 'glowing' : ''}`} key={game.gameId}>
                      <div className="content">
                        <h4>#{Number(game.gameId)} {game.joiner !== '0x0000000000000000000000000000000000000000' ? '- Challenge -' : "-"} Stake: {ethers.formatEther(game.gameStake)} {this.state.currency}</h4>
                        <p>Creator: {game.creator}</p>
                        <button 
                          className="btn-faded hidden-button ml-2" 
                          // TODO fix stake
                          onClick={() => this.joinGame(game.gameId, ethers.formatEther(game.gameStake))}>
                          Join Game
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
            )}
          </div>
        </div>

        {this.state.showModal && (
          <CreateGameModal
            closeModal={() => this.setState({ showModal: false })}
            createGame={this.createGame}
          />
        )}

        <hr />

      </div>
    </div>
    );
  }


  async _connectWallet() {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Once we have the address, we can initialize the application.

    // First we check the network
    this._checkNetwork();

    // And then we inizialize the dapp
    this._initialize(selectedAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this.removeEventListeners();
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state 
      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });
  }

  // This method initializes the dapp
  _initialize(userAddress) {
    // We first store the user's address in the component's state
    this.setState({selectedAddress: userAddress}, async () => { 
      // Then, we initialize ethers, fetch the user balance, get the available games, and start listening for new / joined games
      await this._initializeEthers();
      await this._updateBalance();

      this._updateStartedGames();
      this._updateAvailableGames();
      this.setupEventListeners();
    });
  }

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    provider.polling = true;
    provider.pollingInterval = 500; // Set to 1000 ms (1 second)

    // Then, we initialize the contract using that provider and the token's artifact.
    const mastermind = new ethers.Contract(
      contractAddress.Mastermind,
      MastermindArtifact.abi,
      signer
    );
    return new Promise((resolve) => {
      this.setState({
        _provider: provider,
        _mastermind: mastermind,
      }, resolve);
    });
  }

  async _updateBalance(){
    try {
      const balance = await this.state._provider.getBalance(this.state.selectedAddress)
      const balanceEther = ethers.formatEther(balance);

      this.setState({ balance: balanceEther });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }

  async _updateAvailableGames() {
    const availableGames = await this.state._mastermind.getJoinableGames(this.state.selectedAddress)
    
    const result = availableGames.map(arr =>{
        return {
            gameId: arr[0],
            creator: arr[1],
            joiner: arr[2],
            gameStake: arr[3]
        }
    })

    // Move challenges to the top
    result.sort((a, b) => (b.joiner !== '0x0000000000000000000000000000000000000000') - (a.joiner !== '0x0000000000000000000000000000000000000000'));
    
    this.setState({ availableGames: result });
  }

  async _updateStartedGames() {
    const startedGames = await this.state._mastermind.getActiveGames(this.state.selectedAddress)
    
    const result = startedGames.map(arr =>{
        return {
            gameId: arr[0],
            creator: arr[1],
            joiner: arr[2],
            gameStake: arr[3]
        }
    })
    
    this.setState({ startedGames: result });
  }

  // The next two methods are needed to start and stop polling data. 
  // Events are used to update the availableGames array

  setupEventListeners() {
    const { _mastermind } = this.state;
    _mastermind.on("GameCreated", this.wrap(this.handleGameCreated));
    _mastermind.on("GameJoined", this.wrap(this.handleGameJoined));
  }

  removeEventListeners() {
    const { _mastermind } = this.state;
    _mastermind.off("GameCreated", this.wrap(this.handleGameCreated));
    _mastermind.off("GameJoined", this.wrap(this.handleGameJoined));
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

  // GameCreated handler
  handleGameCreated(gameId, creator, joiner, numColors, codeLength, numTurns, maxGuesses, gameStake) {
    if(creator.toLowerCase() !== this.state.selectedAddress)
      this.addSnack("default", "A new game (#" + gameId + ") with stake " + ethers.formatEther(game.gameStake) + " is available!");
    //console.log("GameCreated received:");

    this.setState((prevState) => {
      const newGame = {
        gameId: gameId,
        creator: creator,
        joiner: joiner,
        gameStake: gameStake
      }

      return {availableGames: (joiner !== '0x0000000000000000000000000000000000000000' 
        ? [newGame, ...prevState.availableGames] 
        : [...prevState.availableGames, newGame])}
    });
  }

  // GameJoined handler
  handleGameJoined(gameId, joiner, creator) {
    if(joiner.toLowerCase() !== this.state.selectedAddress)
      this.addSnack("default", "The game (#" + gameId + ") has been joined!");
    //console.log("GameJoined received:");
    const eventData = {
      gameId: gameId,
      joiner: joiner,
      creator: creator
    }
    if(creator.toLowerCase() === this.state.selectedAddress.toLowerCase()){
      this._updateStartedGames();
    }
    this.setState((prevState) => ({
      availableGames: prevState.availableGames.filter(game => game.gameId !== eventData.gameId)
    }));
  }

  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // Logic to create the game
  async createGame(stake, challengeAddress){

    // If the request fails, we save that error in the component's state.
    // We only save one such error, so before sending a second request, we clear it.
    this._dismissTransactionError();
    let req = undefined;

    try{
      const opt = {
        from: this.state.selectedAddress,
        value: ethers.parseEther(stake),
        gasLimit: 1000000
      }
      if (challengeAddress === null){
        req = await this.state._mastermind.createGame(opt)
      }
      else{
        req = await this.state._mastermind.createGameWithJoiner(challengeAddress, opt)
      }
      this.setState({ reqBeingSent: req.hash });

      // We use .wait() to wait for the transaction to be mined. This method
      // returns the transaction's receipt.
      const receipt = await req.wait();
      
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        // We can't know the exact error that made the transaction fail when it
        // was mined, so we throw this generic one.
        throw new Error("Transaction failed");
      }

      const newGameId = Number(receipt.logs[0].args[0])
      localStorage.setItem("_codeSecretMemo_" + newGameId, "undefined");
      localStorage.setItem("_codeSeedMemo_" + newGameId, "undefined");
      this.setState({ showModal: false });
      await this._updateBalance();
      this.redirectToGame(Number(receipt.logs[0].args[0]), this.state.selectedAddress)
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

  // Logic to join a game
  async joinGame(gameId, stake){

    // If the request fails, we save that error in the component's state.
    // We only save one such error, so before sending a second request, we clear it.
    this._dismissTransactionError();
    let req = undefined;
    
    try{
      req = await this.state._mastermind.joinGame(Number(gameId).toString(), {
        from: this.state.selectedAddress,
        value: ethers.parseEther(stake.toString()),
        gasLimit: 1000000
      })
      this.setState({ reqBeingSent: req.hash });
      // We use .wait() to wait for the transaction to be mined. This method
      // returns the transaction's receipt.
      const receipt = await req.wait();
      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        // We can't know the exact error that made the transaction fail when it
        // was mined, so we throw this generic one.
        throw new Error("Transaction failed");
      }
  
      await this._updateBalance();
      this.redirectToGame(gameId, this.state.selectedAddress)
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

  resumeGame(gameId){
    this.redirectToGame(gameId, this.state.selectedAddress)
  }

  redirectToGame(gameId, selectedAddress) {
    const { navigate } = this.props.router;
    navigate(`/game/${gameId}`, {
      state: {selectedAddress}
    });
  }

  addSnack = (type, message) =>{
    this.props.addCustomSnack(<Snackbar variant={type} message={message} />, {
      horizontal: "top",
      vertical: "right"
    })
  }

  // This is an utility method that turns an RPC error into a human readable message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    const chainIdHex = `0x${HARDHAT_NETWORK_ID.toString(16)}`
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await this._initialize(this.state.selectedAddress);
  }

  // This method checks if the selected network is Localhost:8545
  async _checkNetwork() {
    const net_version = await window.ethereum.request({method: 'net_version'});
    if (net_version !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }
}

export default withRouter(Home);
export { Home };
