// const { ethers } = require("hardhat");
const {
   loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

const crypto = require('crypto');
const seed = generateRandomString();

describe.only('Mastermind - Looped', function () {
   let mastermind, addr1, addr2, addr3;

   before(async function () {
      [addr1, addr2, addr3] = await ethers.getSigners();
      mastermind = await ethers.deployContract("Mastermind");
   });

   // Run each test 5 times
   for (let i = 0; i < 10; i++) {
      runTests();
   }

   async function runTests() {
      it('should reset', async function () {
         [addr1, addr2, addr3] = await ethers.getSigners();
         mastermind = await ethers.deployContract("Mastermind");
      });

      it('should have an initial state', async function () {
         const state = await mastermind.getNGames();
         expect(state).to.equal(0);
      });

      it('should allow player to create and join a game', async function () {
         await mastermind.connect(addr1).createGame({ value: ethers.parseEther("1") });
         await mastermind.connect(addr2).joinGame(0, { value: ethers.parseEther("1") });
         const gameDetails = await mastermind.getGameDetails(0);
         expect(await gameDetails.creator).to.equal(addr1.address);
         expect(await gameDetails.joiner).to.equal(addr2.address);
      });

      it('should allow maker to publish a code hash', async function () {
         // const seed = generateRandomString();
         const intArray = [1, 2, 3, 4, 5, 6];
         const hashedValue = computeHash(intArray, seed);
         gameDetails = await mastermind.getGameDetails(0);
         breaker = await mastermind.getCurrentBreaker(0);
         breaker = await ethers.provider.getSigner(breaker);
         await mastermind.connect(breaker).startTurn(0);
         breaker = await mastermind.getCurrentBreaker(0);
         breaker = await ethers.provider.getSigner(breaker);
         maker = await mastermind.getCurrentMaker(0);
         maker = await ethers.provider.getSigner(maker);
         await mastermind.connect(maker).submitCodeHash(0, hashedValue);
         gameDetails = await mastermind.getGameDetails(0);
         expect(await gameDetails.codeHash).to.equal(hashedValue);
      });

      it('should allow player to make a guess', async function () {
         await mastermind.connect(breaker).makeGuess(0, [1, 2, 4, 5, 7, 9]);
         const gameDetails = await mastermind.getGameDetails(0);
         expect(await gameDetails.guessesLength).to.equal(1);
      });

      it('should allow maker to publish a feedback', async function () {
         await mastermind.connect(maker).provideFeedback(0, 2, 4);
         const gameDetails = await mastermind.getGameDetails(0);
         expect(await gameDetails.feedbacksLength).to.equal(1);
      });

      it('should allow players to make other guesses and feedbacks', async function () {
         await mastermind.connect(breaker).makeGuess(0, [1, 2, 3, 4, 7, 9]);
         await mastermind.connect(maker).provideFeedback(0, 4, 0);
         await mastermind.connect(breaker).makeGuess(0, [1, 2, 3, 4, 5, 9]);
         await mastermind.connect(maker).provideFeedback(0, 5, 0);
      });

      it('should allow players to end a turn by guessing the code', async function () {
         await mastermind.connect(breaker).makeGuess(0, [1, 2, 3, 4, 5, 6]);
         await expect(mastermind.connect(maker).provideFeedback(0, 6, 0)).to.emit(mastermind, 'TurnEnded').withArgs(0, true);
         await expect(mastermind.connect(maker).publishCodeSecret(0, [1, 2, 3, 4, 5, 6], seed)).to.emit(mastermind, 'CodeSecretPublished').withArgs(0, [1, 2, 3, 4, 5, 6]);
      });

      it('should allow ex breaker to start a new turn', async function () {
         const gameDetails = await mastermind.getGameDetails(0);
         expect(await mastermind.connect(breaker).startTurn(0)).to.emit(mastermind, 'TurnStarted').withArgs(0);
      });

      it('should allow players to end a turn by reaching the maximum number of guesses', async function () {
         breaker = await mastermind.getCurrentBreaker(0);
         breaker = await ethers.provider.getSigner(breaker);
         maker = await mastermind.getCurrentMaker(0);
         maker = await ethers.provider.getSigner(maker);
         const intArray = [1, 2, 3, 4, 5, 6];
         // const seed = generateRandomString();
         const hashedValue = computeHash(intArray, seed);
         await mastermind.connect(maker).submitCodeHash(0, hashedValue);
         const MAX_GUESSES = Number(await mastermind.NUM_GUESSES());
         for (let i = 0; i < MAX_GUESSES - 1; i++) {
            await mastermind.connect(breaker).makeGuess(0, [1, 1, 1, 1, 1, 1]);
            await mastermind.connect(maker).provideFeedback(0, 1, 0);
         }
         await mastermind.connect(breaker).makeGuess(0, [1, 1, 1, 1, 1, 1]);
         const gameDetails = await mastermind.getGameDetails(0);
         await expect(mastermind.connect(maker).provideFeedback(0, 1, 0)).to.emit(mastermind, 'TurnEnded').withArgs(0, false);
      });

      it('should allow breaker to dispute the feedback', async function () {
         const gameDetails = await mastermind.getGameDetails(0);
         await expect(mastermind.connect(maker).publishCodeSecret(0, [1, 2, 3, 4, 5, 6], seed)).to.emit(mastermind, 'CodeSecretPublished').withArgs(0, [1, 2, 3, 4, 5, 6])
         await expect(mastermind.connect(breaker).disputeFeedback(0, [1, 2]))
            .to.emit(mastermind, 'Dispute').withArgs(0, [1, 2])
            .and.to.emit(mastermind, 'ResolveDispute').withArgs(0, breaker.address)
            .and.to.emit(mastermind, 'GameEnded').withArgs(0, maker.address, 1, 0);
      });

      it('should allow to create a game and specify a joiner', async function () {
         await mastermind.connect(addr1).createGameWithJoiner(addr2.address, { value: ethers.parseEther("1") });
         const gameDetails = await mastermind.getGameDetails(1);
         expect(await gameDetails.creator).to.equal(addr1.address);
         expect(await gameDetails.joiner).to.equal(addr2.address);
         await mastermind.connect(addr2).joinGame(1, { value: ethers.parseEther("1") });
      });

      it('should allow to accuse an opponent of being AFK and if necessary punish him', async function () {
         try {
            await mastermind.connect(breaker).accuseAFK(1);
         } catch (error) {
            expect(error.message).to.equal("VM Exception while processing transaction: reverted with reason string 'It must be the turn of the accused'");
         }
         breaker = await mastermind.getCurrentBreaker(1);
         breaker = await ethers.provider.getSigner(breaker);
         await mastermind.connect(breaker).startTurn(1);
         breaker = await mastermind.getCurrentBreaker(1);
         breaker = await ethers.provider.getSigner(breaker);
         maker = await mastermind.getCurrentMaker(1);
         maker = await ethers.provider.getSigner(maker);
         let tmp_seed = generateRandomString();
         await mastermind.connect(maker).submitCodeHash(1, computeHash([1, 2, 3, 4, 5, 6], tmp_seed));
         await mastermind.connect(breaker).makeGuess(1, [1, 1, 1, 1, 1, 1]);
         await mastermind.connect(breaker).accuseAFK(1);
         for (let i = 0; i < 8; i++) {
            await ethers.provider.send("evm_mine");
         }
         try {
            await mastermind.connect(breaker).verifyAFKAccusation(1);
         } catch (error) {
            expect(error.message).to.equal("VM Exception while processing transaction: reverted with reason string 'AFK accusation time has not expired'");
         }
         await mastermind.connect(maker).provideFeedback(1, 1, 0);
         await mastermind.connect(breaker).makeGuess(1, [1, 1, 1, 1, 1, 1]);
         await mastermind.connect(breaker).accuseAFK(1);
         const afkBlocks = await mastermind.B_AFKBLOCKS();
         for (let i = 0; i < afkBlocks; i++) {
            await ethers.provider.send("evm_mine");
         }
         expect(await mastermind.connect(breaker).verifyAFKAccusation(1)).to.emit(mastermind, 'GameEnded').withArgs(1, breaker.address, 1, 0);
      });

      it('should allow to create multiple games and get the joinable ones', async function () {
         [p1, p2, p3] = await ethers.getSigners();
         mastermind2 = await ethers.deployContract("Mastermind");
         await mastermind2.connect(p1).createGameWithJoiner(p3, { value: ethers.parseEther("1") });
         await mastermind2.connect(p1).createGameWithJoiner(p3, { value: ethers.parseEther("1") });
         await mastermind2.connect(p1).createGameWithJoiner(p2, { value: ethers.parseEther("1") });
         await mastermind2.connect(p1).createGame({ value: ethers.parseEther("1") });
         await mastermind2.connect(p1).createGame({ value: ethers.parseEther("1") });
         const p2joinableGames = await mastermind2.getJoinableGames(p2.address);
         expect(p2joinableGames.length).to.equal(3);
      });
   }
});

function hashArrayOfIntegers(intArray) {
   const types = new Array(intArray.length).fill('uint256');
   const hash = ethers.solidityPackedKeccak256(types, intArray);
   return hash;
}

function generateRandomString() {
   const array = new Uint8Array(32);
   crypto.getRandomValues(array);
   return array;
}

function computeHash(intArray, seed) {
   const abiCoder = ethers.AbiCoder.defaultAbiCoder();
   const types = new Array(intArray.length).fill('uint256');
   const serializedArray = abiCoder.encode(types, intArray);
   const combined = ethers.concat([seed, serializedArray]);
   return ethers.keccak256(combined);
}
module.exports = {
   generateRandomString,
   computeHash
};