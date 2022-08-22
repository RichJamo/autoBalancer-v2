/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */
require('dotenv').config();

const HDWalletProvider = require('@truffle/hdwallet-provider');
// const infuraKey = "fj4jll3k.....";

const fs = require('fs');
const mnemonic = fs.readFileSync(".secret").toString().trim();

const api_key = fs.readFileSync(".env").toString().trim();

module.exports = {
  /**
* Networks define how you connect to your ethereum client and let you set the
* defaults web3 uses to send transactions. If you don't specify one truffle
* will spin up a development blockchain for you on port 9545 when you
* run `develop` or `test`. You can ask a truffle command to use a specific
* network from the command line, e.g
*
* $ truffle test --network <network-name>
*/

  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    develop: {
      port: 8545
    },
    polygon: {
      provider: () => new HDWalletProvider(mnemonic, 'https://polygon-mainnet.g.alchemy.com/v2/nW4WNtS3FPnPLA01urA7QQFccgjppV8F'),
      network_id: 137,
      // gasPrice: 135000000000,
      // gas: 27000000,
      maxFeePerGas: 100000000000,
      maxPriorityFeePerGas: 80000000000,
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
    // harmony: {
    //   provider: () => {
    //     return new HDWalletProvider({
    //       mnemonic,
    //       providerOrUrl: 'https://api.s0.b.hmny.io', // https://api.s0.t.hmny.io for mainnet
    //       derivationPath: `m/44'/1023'/0'/0/`
    //     });
    //   },
    //   network_id: 1666600000 //1666700000 for testnet
    // },
    // testnetHar: {
    //   provider: () => {
    //     if (!privateKeyTest.trim()) {
    //       throw new Error(
    //         'Please enter a private key with funds, you can use the default one'
    //       );
    //     }
    //     return new HDWalletProvider({
    //       privateKeys: [privateKeyTest],
    //       providerOrUrl: 'https://api.s0.b.hmny.io',
    //     });
    //   },
    //   network_id: 1666700000, //do i have to change this to mainnet too?
    // }
  },
  contracts_directory: './contracts/',
  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "^0.8.0",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    },

  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    polygonscan: process.env.MY_API_KEY
  },
  // Truffle DB is currently disabled by default; to enable it, change enabled: false to enabled: true
  //
  // Note: if you migrated your contracts prior to enabling this field in your Truffle project and want
  // those previously migrated contracts available in the .db directory, you will need to run the following:
  // $ truffle migrate --reset --compile-all

  db: {
    enabled: false
  }
};
