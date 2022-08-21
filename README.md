# AutoBalancer BEMS Index
BTC, ETH, MATIC and SAND in an equally weighted, periodically rebalanced index.
Deposit USDC to participate in the index. Withdraw anytime, also in USDC. Fee of 0.3% on deposit (TBC).
Index is 100% composed of the four crypto assets (wrapped versions of MATIC, ETH and BTC).
Ensure that you have metamask installed and that you are using the Polygon Mainnet.
Please note that this dapp is still under development, exercise caution.

Main contract: autoBalancer.sol
Main js file: app.js

The smart contract makes use of Quickswap DEX for swaps, of Chainlink price oracles for USD prices of the four tokens, and Chainlink keepers to automate the rebalancing process. User shares are kept track of via a mapping in the smart contract.

On the front-end, the dapp relies on metamask for user interaction. It will automatically request a network change if the user is connected to the wrong chain. 

The smart contract is deployed and verified on the polygon mainnet, polygonscan link here. https://polygonscan.com/address/0xa0301c291272ab3bd10aef5b50e618fb7033e97f

The Chainlink price oracles use the basic interface (AggregatorV3Interface) to get price feeds.

The Chainlink Keeper setup is a custom trigger set up, which can be set to a range of different intervals (in seconds), via a public funtion on the smart contract called setInterval. The CheckUpKeep function contains the logic for determining the swap parameters for the n-1 swaps that need to be made to keep the portfolio of n tokens rebalanced. This logic is performed off-chain, so doesn't chew up gas. This function generates n-1 swap paths, and n-1 swap amounts, which are returned as encoded performData. This performData is then passed to the performUpkeep function by the Chainlink Keeper node, and it is performUpkeep which actually implements the swaps on-chain.

Live demo version here: https://richjamo.github.io/BentoBoxBalancer/


