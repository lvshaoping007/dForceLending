require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("@symfoni/hardhat-react");
require("hardhat-typechain");
require("typechain-target-ethers-v5");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("solidity-coverage");

const privateKey = process.env.PRIVATE_KEY;
const infuraKey = process.env.INFURA_KEY;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  mocha: { timeout: 2000000 },
  networks: {
    hardhat: { allowUnlimitedContractSize: true },
    kovan: {
      url: `https://kovan.infura.io/v3/${infuraKey}`,
      accounts: [`0x${privateKey}`],
      gas: 8000000,
    },
  },
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
    },
  },
  // TODO: there is an unexpected case when tries to verify contracts, so do not use it at now!!!
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
  react: {
    providerPriority: ["hardhat", "web3modal"],
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: process.env.COINMARKET_API,
  },
};
