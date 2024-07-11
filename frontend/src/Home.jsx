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

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Token contract
//   3. Polls the user balance to keep it updated.
//   4. Allows you to create or join a game
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
      _provider: undefined,
      _mastermind: undefined
    };

    this.state = this.initialState;
    this.createGame = this.createGame.bind(this)
    //this.redirectToGame = this.redirectToGame.bind(this);
  }

  render() {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install a wallet.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // Ask the user to connect their wallet.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    // If the available games or the user's balance hasn't loaded yet, we show
    // a loading component.
    console.log(this.availableGames)
    if (!this.state.availableGames || !this.state.balance) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              Mastermind
              {/*{this.state.tokenData.name} ({this.state.tokenData.symbol})*/}
            </h1>
            <p>
              Welcome <b>{this.state.selectedAddress}</b>, you have{" "}
              <b>
                {this.state.balance.toString()} {this.state.currency}
              </b>
              .
            </p>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <button 
              className="btn btn-primary" 
              onClick={() => this.setState({ showModal: true })}>
              Create Game
            </button>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
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
        </div>

        <div className="row">
          <div className="col-12">
            <h2>Available Games</h2>
            <ul>
              {this.state.availableGames.map((game) => (
                <li key={game.gameId}>
                  {console.log(game)}
                  Stake: {Number(game.gameStake/BigInt(1000000000000000000))} {this.state.currency}, Creator: {game.creator}
                  <button 
                    className="btn btn-secondary ml-2" 
                    onClick={() => this.joinGame(game.gameId, Number(game.gameStake/BigInt(1000000000000000000)))}>
                    Join Game
                  </button>
                </li>
              ))}
            </ul>
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
    );
  }

  componentWillUnmount() {
    // We poll the available games, so we have to stop doing that when Dapp gets unmounted
    this._stopPollingData();
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
      this._stopPollingData();
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
      // Then, we initialize ethers, fetch the user balance, and start polling for the available games
      await this._initializeEthers();
      this._updateBalance();

      //ToDo: controlla che l'utente sotto userAddress non sia già in un game; se lo è redirect a pagina di game

      //this._getTokenData();
      this._startPollingData();
    });
  }

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    this._provider = new ethers.BrowserProvider(window.ethereum);
    console.log(this._provider)

    const signer = await this._provider.getSigner();
    console.log(signer.address)

    // Then, we initialize the contract using that provider and the token's artifact.
    this._mastermind = new ethers.Contract(
      contractAddress.Mastermind,
      MastermindArtifact.abi,
      signer
    );
    console.log(this._mastermind)
  }

  async _updateBalance(){
    try {
      const balance = await this._provider.getBalance(this.state.selectedAddress)
      const balanceEther = ethers.formatEther(balance);

      this.setState({ balance: balanceEther });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }

  // The next two methods are needed to start and stop polling data. While
  // the data being polled here is specific to this example, you can use this
  // pattern to read any data from your contracts.
  //
  // Note that if you don't need it to update in near real time, you probably
  // don't need to poll it. If that's the case, you can just fetch it when you
  // initialize the app, as we do with the token data.
  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateAvailableGames(), 10000);

    // We run it once immediately so we don't have to wait for it
    this._updateAvailableGames();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  // The next two methods just read from the contract and store the results
  // in the component state.
  /*async _getTokenData() {
    const name = await this._token.name();
    const symbol = await this._token.symbol();

    this.setState({ tokenData: { name, symbol } });
  }*/

  async _updateAvailableGames() {
    const availableGames = await this._mastermind.getJoinableGames(this.state.selectedAddress)
    const result = availableGames.map(arr =>{
        return {
            gameId: arr[0],
            creator: arr[1],
            joiner: arr[2],
            gameStake: arr[3]
        }
    })
    console.log(result);
    this.setState({ availableGames: result });
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
        req = await this._mastermind.createGame(opt)
      }
      else{
        req = await this._mastermind.createGameWithJoiner(challengeAddress, opt)
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

      this.setState({ showModal: false });
      await this._updateBalance();
      //this.redirectToGame(parseInt(receipt.events[0].args.gameId._hex.slice(2), 16), this.state.selectedAddress)
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
      req = await this._mastermind.joinGame(gameId, {
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
      //this.redirectToGame(gameId, this.state.selectedAddress)
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

  redirectToGame(gameId, selectedAddress) { //ToDo: understand better which fields have to be passed
    const { navigate } = this.props.router;
    navigate(`/game/${gameId}`, {
      state: {selectedAddress}
    });
  }

  // This is an utility method that turns an RPC error into a human readable
  // message.
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
  _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }
}

export default withRouter(Home);
export { Home };
