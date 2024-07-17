## Quick Start

### Deploy blockchain on a local node
```
git clone https://github.com/frenzis01/mastermind.git
cd mastermind
npm install
npx hardhat node
```
A list of accounts along with private keys will appear;
Note at least two of them, you will need them later.

In a *new* terminal run
```
npx hardhat run scripts/deploy.js --network localhost
```


### Vite+React Frontend
```
cd frontend
npm install
npm run dev
```

To configure Metamask, set the following parameters
```
Network Name: <anything>
Address: http://127.0.0.1:8545/
ChainID: 31337
Symbol: <ETH or anything>
```

After adding the network, Metamask will ask whether you want to switch to the new network: do it.
To actually use the app, you need to import one the local network's accounts.
To do so, add new account to Metamask and choose to *import* one, then insert one the private keys mentioned earlier (Should look like `0xac0974bec39...`).

Navigate to `localhost:5173`, press *"Connect wallet"* and choose the imported account, it should have 10000 ETH, or a bit less.

Now you're good to go! Have fun playing our blockchain-powered mastermind.

## Testing Contract functionalities

To perform the test in the folder `tests` you may run
```
npx hardhat test
```
In case you want to have the built-in hardhat gas report run
```
REPORT_GAS=true npx hardhat test
```

### TODOs
   - [x] Gas Evaluation
      - [x] Guesses and Feedbacks: ```mapping``` vs ```[][][]```
      - [x] Breaker/Maker
   - [ ] AFK Accusation
      - [ ] *Maker accuse while Breaker is Disputing* is a "race" between AFK Accusation time and Valid Dispute time, but should be okay since the breaker cannot take forever to dispute the feedbacks
   - [x] Handle `Next Turn`
   - [x] Catch `Accusation time has not expired yet`
   - [ ] Contract interaction wrapper in home
   - [ ] localStorage set in utils
   - [ ] Create game modal negative stake
   - [x] Better provide Feedback modal
   - [x] Accuse AFK button restyle
   - [ ] Add message for "Waiting for someone to join"
   - [x] Decimal value in join are not allowed, they become 0
   - [ ] Add message for Breaker to wait the code