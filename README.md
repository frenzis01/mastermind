<!-- <p align="center">
<img alt="Logo Banner" src="images/Mastermind_logo_Border.jpg"/>
<br/>
</p> -->

![Alt text](media/Mastermind_logo_Border.png)
<!-- # Mastermind -->
---
This is the exam project for the *Peer-to-Peer and Blockchain systems* UniPi course, developed by Francesco Lorenzoni and Emiliano Sescu.
It consists of an adaptation of the Mastermind game on a Solidity powered blockchain along with a frontend.

Backend exploits *Hardhat* framework, while the Frontend *Vite + ReactJS*

## Quick Start

To clone the repo
```
git clone https://github.com/frenzis01/mastermind.git
cd mastermind
```

### Docker Compose
This is the easiest way to test the application, deploying both the frontend and the blockchain on the local host.

```
docker compose build
docker compose up
```
(Use the `-d` option if you want to run it as a daemon: `docker compose up -d`)


Frontend is reachable at `http://localhost:5173`.

Then **you must configure Metamask**, see the dedicated section below.

### Manual setup

If you don't want to use docker compose you may also manually deploy the hardhat node and the frontend. 

#### Deploy blockchain on a local node
```
npm install
npx hardhat node
```
A list of accounts along with private keys will appear;
Note at least two of them, you will need them later to configure metamask.

<u>In a *new* terminal</u> run
```
npx hardhat run scripts/deploy.js --network localhost
```

#### Vite+React Frontend
To setup the frontend, in a new terminal:
```
cd frontend
npm install
npm run dev
```

### Configuring Metamask
To configure Metamask, <u>click on the Ethereum Mainnet logo in the top left corner of Metamask extension popup and add a new Network with the following parameters</u>,
```
Network Name: <anything>
Address: http://127.0.0.1:8545/
ChainID: 31337
Symbol: <ETH or anything>
```

After adding the network, Metamask will ask whether you want to switch to the new network: do it.

To actually use the app, you need to **import** one the local network's accounts.
To do so, add new account to Metamask and choose to *import* one, then insert one the private keys mentioned earlier (Should look like `0xac0974bec39...`) from the output of the hardhat node, <u>or use one of the two provided below</u>:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Navigate to `localhost:5173`, press *"Connect wallet"* and choose the imported account, it should have 10000 ETH, or a bit less.

Now you're good to go! Have fun playing our blockchain-powered mastermind.

## Testing Contract functionalities

To perform the test in the folder `tests` you may run
```
npm install #if not done before
npx hardhat test
```
In case you want to have the built-in hardhat gas report run
```
REPORT_GAS=true npx hardhat test
```

---

