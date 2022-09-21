import { HardhatUserConfig } from "hardhat/config";
import '@nomiclabs/hardhat-waffle';
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });
// const { accounts } = import './configs/addresses.js';
// const { ethers } = import 'hardhat';

const chainIds = {
  hardhat: 31337,
};
/////////////////////////////////////////////////////////////////
/// Ensure that we have all the environment variables we need.///
/////////////////////////////////////////////////////////////////

// Ensure that we have mnemonic phrase set as an environment variable
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}
// Ensure that we have archive mainnet node URL set as an environment variable
const archiveMainnetNodeURL = process.env.PRIVATE_RPC;
if (!archiveMainnetNodeURL) {
  throw new Error("Please set your PRIVATE_RPC in a .env file");
}

const myPrivateKey = process.env.MY_PRIVATE_KEY;
if (!myPrivateKey) {
  throw new Error("Please set your MY_PRIVATE_KEY in a .env file");
}

const polygonScanApiKey = process.env.POLYGONSCAN_API_KEY;
if (!polygonScanApiKey) {
  throw new Error("Please set your POLYGONSCAN_API_KEY in a .env file");
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      initialBaseFeePerGas: 1_00_000_000,
      gasPrice: "auto",
      allowUnlimitedContractSize: true,
      accounts: {
        initialIndex: 0,
        count: 20,
        mnemonic,
        path: "m/44'/60'/0'/0",
        accountsBalance: "10000000000000000000000",
      },
      forking: {
        url: archiveMainnetNodeURL,
        blockNumber: 25326200,
      },
      chainId: chainIds.hardhat,
      hardfork: "london",
    },
    polygon: {
      url: archiveMainnetNodeURL,
      accounts: [`0x${myPrivateKey}`], //do I really need to put my private key in here?
    },
  },
  solidity: {
    compilers: [{
      version: "0.8.13",
      settings: {
        viaIR: true,
        optimizer: {
          enabled: true,
          runs: 1000000,
          details: {
            peephole: true,
            inliner: true,
            jumpdestRemover: true,
            orderLiterals: true,
            deduplicate: true,
            cse: true,
            constantOptimizer: true,
            yul: true
          }
        },
      },
    }],
    overrides: {
      "contracts/VaultHealer.sol": {
        version: "0.8.13",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1,
            details: {
              peephole: true,
              inliner: true,
              jumpdestRemover: true,
              orderLiterals: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
              yul: true
            }
          },
        },
      }
    },
  },
  mocha: {
    timeout: 90000,
  },
  etherscan: {
    apiKey: {
      polygon: polygonScanApiKey,
    }
  }
};

export default config;
