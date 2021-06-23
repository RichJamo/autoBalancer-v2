const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
const WBTC_ADDRESS = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
const WMATIC_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"

var contract;
var user;
var total_in_usd;
/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

// import detectEthereumProvider from '@metamask/detect-provider';

// this returns the provider, or null if it wasn't detected
// const provider = await detectEthereumProvider();
const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

if (provider) {
  startApp(provider); // Initialize your app
} else {
  console.log('Please install MetaMask!');
}

function startApp(provider) {
  // If the provider returned by detectEthereumProvider is not the same as
  // window.ethereum, something is overwriting it, perhaps another wallet.
  if (provider !== window.ethereum) {
    console.error('Do you have multiple wallets installed?');
  }
  //Basic Actions Section
  // const onboardButton = document.getElementById('connectButton'); - come back to this later - for checking if metamask installed
  const getAccountsButton = document.getElementById('getAccounts');
  const getBalancesButton = document.getElementById('getBalances');
  const getUSDBalancesButton = document.getElementById('getUSDBalances');
  const rebalanceButton = document.getElementById('rebalance');

  const getAccountsResult = document.getElementById('getAccountsResult');
  // const getBalanceResult = document.getElementById('getBalanceResult');

  // var balance;
  var usdc_bal;
  var wbtc_bal;
  var weth_bal;
  var wmatic_bal;
  var _wmatic_in_usd;
  var _wbtc_in_usd;
  var _weth_in_usd;
  var eth_usd_rate;
  var wbtc_usd_rate;
  var matic_usd_rate;
  var usdc_usd_rate = 1;
  var array_coins;


  //Eth_Accounts-getAccountsButton
  getAccountsButton.addEventListener('click', async () => {
    //we use eth_accounts because it returns a list of addresses owned by us.
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    user = accounts[0]; //should I declare this here or lower down as current account?
    //We take the first address in the array of addresses and display it
    getAccountsResult.innerHTML = user || 'Not able to get accounts';
  });

  getBalancesButton.addEventListener('click', async () => {
    // balance = await provider.getBalance(user); //returns a BigNumber
    // console.log(balance.toString());

    wmatic_bal = await getBalance(WMATIC_ADDRESS);
    getWMATICResult.innerHTML = wmatic_bal.toFixed(5) || 'Not able to get accounts'; //what if wmatic_bal undefined?

    usdc_bal = await getBalance(USDC_ADDRESS);
    getUSDCResult.innerHTML = usdc_bal.toFixed(5) || 'Not able to get accounts';

    wbtc_bal = await getBalance(WBTC_ADDRESS);
    getWBTCResult.innerHTML = wbtc_bal.toFixed(5) || 'Not able to get accounts';

    weth_bal = await getBalance(WETH_ADDRESS);
    getWETHResult.innerHTML = weth_bal.toFixed(5) || 'Not able to get accounts';
  });

  getUSDBalancesButton.addEventListener('click', async () => {
    matic_usd_rate = await getExchangeRate(MATIC_USD_ORACLE) //assume for now matic = wmatic 1:1
    _wmatic_in_usd = wmatic_bal * matic_usd_rate
    WMATICInUsd.innerHTML = _wmatic_in_usd.toFixed(2) || 'Not able to get accounts';

    wbtc_usd_rate = await getExchangeRate(BTC_USD_ORACLE)
    _wbtc_in_usd = wbtc_bal * wbtc_usd_rate
    WBTCInUsd.innerHTML = _wbtc_in_usd.toFixed(2) || 'Not able to get accounts'

    eth_usd_rate = await getExchangeRate(ETH_USD_ORACLE)
    _weth_in_usd = weth_bal * eth_usd_rate
    WETHInUsd.innerHTML = _weth_in_usd.toFixed(2) || 'Not able to get accounts'

    total_in_usd = _wmatic_in_usd + _wbtc_in_usd + _weth_in_usd + usdc_bal
    TOTALInUsd.innerHTML = total_in_usd.toFixed(2) || 'Not able to get accounts'
  })

  rebalanceButton.addEventListener('click', async () => {
    var no_of_assets = 4;
    var target_per_asset = total_in_usd / no_of_assets;
    // console.log(target_per_asset)

    function Coin(symbol, address, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
      this.symbol = symbol;
      this.address = address;
      this.decimals = decimals;
      this.balance = balance;
      this.usd_balance = usd_balance;
      this.diff_from_average = diff_from_average;
      this.usd_exchange_rate = usd_exchange_rate;
    }
    // calculate how far each coin is from the average USD value
    var diff_wmatic = _wmatic_in_usd - target_per_asset
    var diff_wbtc = _wbtc_in_usd - target_per_asset
    var diff_weth = _weth_in_usd - target_per_asset
    var diff_usdc = usdc_bal - target_per_asset

    var usdc_decimals = await getDecimals(USDC_ADDRESS)
    var wmatic_decimals = await getDecimals(WMATIC_ADDRESS)
    var wbtc_decimals = await getDecimals(WBTC_ADDRESS)
    var weth_decimals = await getDecimals(WETH_ADDRESS)

    //create a coin object for each of our 4 assets - NOTE have to fix MATIC somehow...
    var USDC = new Coin("USDC", USDC_ADDRESS, usdc_decimals, usdc_bal, usdc_bal, diff_usdc, usdc_usd_rate);
    var WMATIC = new Coin("WMATIC", WMATIC_ADDRESS, wmatic_decimals, wmatic_bal, _wmatic_in_usd, diff_wmatic, matic_usd_rate); //this one will have to be different somehow
    var WBTC = new Coin("WBTC", WBTC_ADDRESS, wbtc_decimals, wbtc_bal, _wbtc_in_usd, diff_wbtc, wbtc_usd_rate);
    var WETH = new Coin("WETH", WETH_ADDRESS, weth_decimals, weth_bal, _weth_in_usd, diff_weth, eth_usd_rate);

    //put our 4 coin objects into an array
    array_coins = [USDC, WMATIC, WBTC, WETH];

    //sort the coins by how far they are from the average
    array_coins.sort((a, b) => {
      return b.diff_from_average - a.diff_from_average;
    });
    console.log(array_coins);
    do {
      var inputs = getSwapInputs(array_coins); //balances 1 coin to the portfolio dollar average, and returns the remaining coins as an array
      var swap_result = await swap(inputs[0], inputs[1], inputs[2]);
      if (swap_result) {
        array_coins = updateArray(array_coins);
      }
    }
    while (array_coins.length > 1) //we repeat the above until we're down to just one coin in the array
  })
}



/**********************************************************/
/* Handle chain (network) and chainChanged (per EIP-1193) */
/**********************************************************/

// const chainId = await ethereum.request({ method: 'eth_chainId' });
// handleChainChanged(chainId);

// ethereum.on('chainChanged', handleChainChanged);

// function handleChainChanged(_chainId) {
//   // We recommend reloading the page, unless you must do otherwise
//   window.location.reload();
// }

/***********************************************************/
/* Handle user accounts and accountsChanged (per EIP-1193) */
/***********************************************************/

let currentAccount = null;
ethereum
  .request({ method: 'eth_accounts' })
  .then(handleAccountsChanged)
  .catch((err) => {
    // Some unexpected error.
    // For backwards compatibility reasons, if no accounts are available,
    // eth_accounts will return an empty array.
    console.error(err);
  });

// Note that this event is emitted on page load.
// If the array of accounts is non-empty, you're already
// connected.
ethereum.on('accountsChanged', handleAccountsChanged);

// For now, 'eth_accounts' will continue to always return an array
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // MetaMask is locked or the user has not connected any accounts
    console.log('Please connect to MetaMask.');
  } else if (accounts[0] !== currentAccount) {
    currentAccount = accounts[0];
    // console.log(currentAccount.balanceOf()) - I tried this here, didn't work - what CAN I do here?
  }
}

/*********************************************/
/* Access the user's accounts (per EIP-1102) */
/*********************************************/

// // You should only attempt to request the user's accounts in response to user
// // interaction, such as a button click.
// // Otherwise, you popup-spam the user like it's 1999.
// // If you fail to retrieve the user's account(s), you should encourage the user
// // to initiate the attempt.
document.getElementById('connectButton', connect);

// While you are awaiting the call to eth_requestAccounts, you should disable
// any buttons the user can click to initiate the request.
// MetaMask will reject any additional requests while the first is still
// pending.
function connect() {
  ethereum
    .request({ method: 'eth_requestAccounts' })
    .then(handleAccountsChanged)
    .catch((err) => {
      if (err.code === 4001) {
        // EIP-1193 userRejectedRequest error
        // If this happens, the user rejected the connection request.
        console.log('Please connect to MetaMask.');
      } else {
        console.error(err);
      }
    });
}
$(document).ready(function () { //when the document loads
  window.ethereum.enable().then(function (accounts) { //this should cause a metamask popup
    // instance = new web3.eth.Contract(abi, contractAddress, {from: accounts[0]}); //creates an instance of the smart contract we want to interact with
    // user = accounts[0];
    // var accounts = web3.eth.getAccounts(); //this gets a list of the accounts in the Metamask wallet
    // console.log(accounts)
    // web3.eth.getBalance(user).then(console.log); //Get the balance of an address at a given block
    // console.log(instance);

  }) //call metamask enable function
})

async function getBalance(token_address) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  var tokenContract = new ethers.Contract(token_address, abi, signer)
  // get the balance of our user in that token
  try {
    var tokenBalance = await tokenContract.balanceOf(user);
    var decimals = await tokenContract.decimals();
    tokenBalance = tokenBalance / (10 ** decimals)
    return tokenBalance;
    } catch (error) {
      console.log(error)
    }
  }

async function getExchangeRate(oracle_address) {
  var oracle = new ethers.Contract(oracle_address, CHAINLINK_ORACLE_ABI, provider);
  try {
    var exchangeRate = await oracle.latestAnswer();
    exchangeRate = exchangeRate.div(10 ** 8);
    return exchangeRate;
    } catch (error) {
      console.log(error);
    }   
}

async function getDecimals(token_address) {
  var tokenContract = new ethers.Contract(token_address, abi, provider)
  // check how many decimals that token has
  try {
    var decimals = await tokenContract.decimals();//need to catch an error here - perhaps make this it's own function!
    return decimals;
  } catch (error) {
    console.log(error);
  }
}

function getSwapInputs(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average
    
    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address] //swap from first array item to last
    
    var amountIn = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)) //figure out how much to swap
    var amountOutMin = amountIn * array_coins[0].usd_exchange_rate / array_coins[array_coins.length-1].usd_exchange_rate *0.97;

    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length-1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    return [swap_path, amountIn_Wei, amountOutMin_Wei];
  }
  else {
    
    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address]; // swap from last array item to first
    
    var amountIn = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)); //figure out how much to swap
    var amountOutMin = amountIn * array_coins[0].usd_exchange_rate / array_coins[array_coins.length-1].usd_exchange_rate *0.97;

    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length-1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    
    return [swap_path, amountIn_Wei, amountOutMin_Wei];
  }
}

async function swap(_path, _amountIn, amountOutMin) {
  //making a swap on QUICKSWAP - first create an instance of the Quickswap router
  var router = new ethers.Contract(QUICKSWAP_ROUTER, ROUTER_ABI_QS, signer)
  //then create an instance of the token contract
  var acct = user
  var deadline = Date.now() + 1111111111111
  //perform the swap
  var _amountOutMin = 0;
  try {
    var swap = await router.swapExactTokensForTokens(_amountIn,
      _amountOutMin,
      _path,
      acct,
      deadline)
    return true;
  } catch (error) {
    console.log(error); //can I get it to try again here??
    return false;
  }
}

function updateArray(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average
    array_coins[0].diff_from_average -= Math.abs(array_coins[array_coins.length - 1].diff_from_average);
    //remove the coin that's now balanced
    array_coins.pop() //remove the last element from the array
    //re-sort the array
    array_coins.sort((a, b) => {
      return b.diff_from_average - a.diff_from_average;
    })
    return array_coins;
  }
  else {
    //decrease the diff_from_average of the coin we've just moved money out of
    array_coins[array_coins.length - 1].diff_from_average += Math.abs(array_coins[0].diff_from_average);
    //remove the coin that's now balanced
    array_coins.shift(); //remove the last element from the array
    //re-sort the array
    array_coins.sort((a, b) => {
      return b.diff_from_average - a.diff_from_average;
    })
    return array_coins;
  } 
}