// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.

const path = require("path");
const hre = require("hardhat")

async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
      "gets automatically created and destroyed every time. Use the Hardhat" +
      " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  //console.log("Account balance:", (await deployer.getBalance()).toString());

  const Mastermind = await hre.ethers.getContractFactory("Mastermind");
  const mastermind = await Mastermind.deploy();
  await mastermind.waitForDeployment();

  console.log("Mastermind address:", await mastermind.getAddress());

  // We also save the contract's artifacts and address in the frontend directory
  await saveFrontendFiles(mastermind);
}

async function saveFrontendFiles(mastermind) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({Mastermind: await mastermind.getAddress() }, undefined, 2)
  );

  const MastermindArtifact = artifacts.readArtifactSync("Mastermind");

  fs.writeFileSync(
    path.join(contractsDir, "Mastermind.json"),
    JSON.stringify(MastermindArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
