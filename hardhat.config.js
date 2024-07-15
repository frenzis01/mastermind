require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      gasPrice: 0,
      gas: 0,
      mining: {
        auto: false,
        interval: 500
      }
    }
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
      viaIR: true,
    }
  },
  mocha: {
    timeout: 100000000
  }
};