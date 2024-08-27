FROM node:current-bullseye

COPY . /usr/src/app
WORKDIR /usr/src/app

# Update and install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends libc6

# Install dependencies with legacy-peer-deps flag to avoid conflicts
RUN npm install --legacy-peer-deps

# Install additional dependencies required by hardhat-toolbox
RUN npm install --save-dev --legacy-peer-deps \
    "@nomicfoundation/hardhat-chai-matchers@^2.0.0" \
    "@nomicfoundation/hardhat-ethers@^3.0.0" \
    "@nomicfoundation/hardhat-ignition-ethers@^0.15.0" \
    "@nomicfoundation/hardhat-network-helpers@^1.0.0" \
    "@nomicfoundation/hardhat-verify@^2.0.0" \
    "@typechain/ethers-v6@^0.5.0" \
    "@typechain/hardhat@^9.0.0" \
    "@types/chai@^4.2.0" \
    "@types/mocha@>=9.1.0" \
    "chai@^4.2.0" \
    "ethers@^6.4.0" \
    "solidity-coverage@^0.8.1" \
    "ts-node@>=8.0.0" \
    "typechain@^8.3.0" \
    "typescript@>=4.5.0" \
    "@nomicfoundation/hardhat-ignition@^0.15.5" \
    "@nomicfoundation/ignition-core@^0.15.5"

# Expose the port that Hardhat uses
EXPOSE 8545

# Start the Hardhat node in the foreground and deploy the contracts
CMD ["sh", "-c", "npx hardhat node & sleep 5 && npx hardhat run scripts/deploy.js --network localhost && tail -f /dev/null"]
