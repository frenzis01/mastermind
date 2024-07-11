// const { ethers } = require("hardhat");
const {
   loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const crypto = require('crypto');
// const Web3 = require('web3');

// const { Web3 } = require('web3');
// const web3 = new Web3();

// import { computeHash, generateRandomString } from './Mastermind';
const { computeHash, generateRandomString } = require('./Mastermind');


describe('Mastermind', function () {

   before(async function () {
      // Deploy the contract once before all tests
      [addr1, addr2, addr3] = await ethers.getSigners();
      // const Mastermind = await ethers.getContractFactory("Mastermind");
      // mastermind = await Mastermind.deploy();
      mastermind = await ethers.deployContract("Mastermind");
      // await 
   });

   it(' - should allow to play multiple games in a row', async function () {
      for (let i = 0; i < 4; i++) {
         await playGame(mastermind, addr1, addr2);
      }
   });
   it('should allow to mine empty blocks to jump forward in time', async function () {
      for (let i = 0; i < 20; i++) {
         await ethers.provider.send("evm_increaseTime", [5000]);
         await ethers.provider.send("evm_mine");
      }});
   it(' - should clean unfinished games', async function () {
      await mastermind.connect(addr1).createGame({ value: ethers.parseEther("1") });

      activeGames = await mastermind.getActiveGames()
      expect(activeGames.length).to.equal(0);

   });

   // Add more test cases as needed
});

async function playGame(mastermind, addr1, addr2){
   await mastermind.connect(addr1).createGame({ value: ethers.parseEther("1") });
   gID = await mastermind.getNGames();
   gID = Number(gID) - 1;
   await mastermind.connect(addr2).joinGame(gID, { value: ethers.parseEther("1") });
   
   NUM_GUESSES = Number(await mastermind.NUM_GUESSES());
   NUM_TURNS = Number(await mastermind.NUM_TURNS());
   
   breaker = await mastermind.getCurrentBreaker(gID);
   breaker = await ethers.provider.getSigner(breaker);
   for (let i = 0; i <= NUM_TURNS; i++) {
   
      await mastermind.connect(breaker).startTurn(gID);
      breaker = await mastermind.getCurrentBreaker(gID);
      breaker = await ethers.provider.getSigner(breaker);
      maker = await mastermind.getCurrentMaker(gID);
      maker = await ethers.provider.getSigner(maker);

      seed = generateRandomString();
      await mastermind.connect(maker).submitCodeHash(gID, computeHash([1, 2, 3, 4, 5, 6],seed));
      for (let j = 0; j < NUM_GUESSES; j++) {
         await mastermind.connect(breaker).makeGuess(gID, [1, 1, 1, 1, 1, 1]);
         await mastermind.connect(maker).provideFeedback(gID, 1, 0);
      }
      await mastermind.connect(maker).publishCodeSecret(gID, [1, 2, 3, 4, 5, 6],seed);
      if (genRandomInteger(0,100) < 10) {
         await mastermind.connect(breaker).disputeFeedback(gID, [1, 2]);
         break;
      }
   }
   
}

function genRandomInteger (min,max) {
   return Math.floor(Math.random() * (max - min + 1)) + min;
}