require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      chainId: 31337,
      // gasPrice: 0,
      // gas: 0,
      // mining: {
      //   auto: false,
      //   interval: 1000
      // }
      url: `http://0.0.0.0:8545`, // Listen on all network interfaces
    },
    // localhost: {
    // },
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