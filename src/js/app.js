const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
const WBTC_ADDRESS = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
const WMATIC_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"

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
const confirmSwapButton = document.getElementById('confirmSwap');
const confirmApprovalButton = document.getElementById('confirmApprove')

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
  var swapInputs;


  //Eth_Accounts-getAccountsButton
  getAccountsButton.addEventListener('click', async () => {
    //we use eth_accounts because it returns a list of addresses owned by us.
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    user = accounts[0]; //should I declare this here or lower down as current account?
    //We take the first address in the array of addresses and display it
    getAccountsResult.innerHTML = user || 'Not able to get accounts';
  });

  // var tokenlist = (wmatic, usdc, wbtc, weth);
  // for (token in tokenlist) {
  //   getBalance(token)
  //   displayResult(token)
  // };

  getBalancesButton.addEventListener('click', async () => {
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

    array_coins = [USDC, WMATIC, WBTC, WETH];

    sortCoinsDescendingByDiffFromAvg(array_coins);

    await balanceAndRemoveOneCoin(array_coins);
  })
}

async function balanceAndRemoveOneCoin(array_coins) {

  var swapInputs = getSwapInputs(array_coins);
  var token_to_be_swapped_address = swapInputs[2][0];
  var amount_to_be_swapped = swapInputs[0];

  var isApprovedForAmount = await checkIfApprovedForAmount(token_to_be_swapped_address, amount_to_be_swapped);
  var tokenToBeSwappedContract = new ethers.Contract(token_to_be_swapped_address, abi, signer);

  if (isApprovedForAmount) {
    console.log("token already approved");
    confirmAndExecuteSwapAndUpdateArrayAndDoNextSwap(amount_to_be_swapped, swapInputs, array_coins, tokenToBeSwappedContract)
  }

  else {
    console.log("token not already approved");

    askUserForApproval(token_to_be_swapped_address, amount_to_be_swapped);
    //create a listener for the approval confirmation
    var filterForApprovalEvent = tokenToBeSwappedContract.filters.Approval(user, null);
    tokenToBeSwappedContract.once(filterForApprovalEvent, async (owner, spender, value, event) => {
      console.log('Tokens approved');
      confirmAndExecuteSwapAndUpdateArrayAndDoNextSwap(amount_to_be_swapped, swapInputs, array_coins, tokenToBeSwappedContract)
    })
  }
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
    exchangeRate = exchangeRate.toNumber() //converts from BigNumber
    exchangeRate = exchangeRate / (10 ** 8);
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

function sortCoinsDescendingByDiffFromAvg(_array_coins) {
  _array_coins.sort((a, b) => {
    return b.diff_from_average - a.diff_from_average;
  });
}

async function checkIfApprovedForAmount(_token_address, _amount) {
  var approvedAmount = await getAllowance(_token_address, SUSHISWAP_ROUTER) //input token and router addresses
  console.log(approvedAmount); //293
  console.log(_amount); //9907
  if (approvedAmount.lt(_amount)) return false;
  else return true;
}

async function getAllowance(token_address, router_address) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, abi, signer)
  // check what amount of user's tokens the spender is approved to use
  try {
    var approvedAmount = await tokenContract.allowance(user, router_address); //allowance(owner_address, spender_address)
    return approvedAmount;
  } catch (error) {
    console.log(error)
  }
}

async function giveApproval(token_address, router_address, amountIn) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, abi, signer)
  // give router_address approval to spend user's tokens
  try {
    var approved = await tokenContract.approve(router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

// async function approvalConfirmed() {
//   var approvalconfirmed = await tokenContract.once("Approval", (owner, spender, value, event) => {
//     console.log('Tokens approved');
//   }

function getSwapInputs(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average

    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address] //swap from first array item to last

    var amountIn = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)) //figure out how much to swap
    var amountOutMin = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[array_coins.length - 1].usd_exchange_rate)) * 0.75;

    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
  else {

    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address]; // swap from last array item to first

    var amountIn = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)); //figure out how much to swap
    var amountOutMin = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[array_coins.length - 1].usd_exchange_rate)) * 0.75;
    console.log(array_coins[array_coins.length - 1].usd_exchange_rate);
    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()
    console.log(amountOutMin_Wei);

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
}

async function askUserForApproval(_token_address, _amount) {
  if (window.confirm("Time to get approval!")) {
    //ask for approval
    await giveApproval(_token_address, SUSHISWAP_ROUTER, _amount); //token_address, router_address, amountIn
  }
}

async function confirmAndExecuteSwapAndUpdateArrayAndDoNextSwap(_amount_to_be_swapped, _swapInputs, _array_coins, _tokenToBeSwappedContract) {

  if (window.confirm("Confirm Swap")) {
    await executeSwap(_amount_to_be_swapped, _swapInputs[1], _swapInputs[2], user, Date.now() + 1111111111111);

    updateArray(_array_coins);
    if (_array_coins.length > 1) {
      executeNextSwapOnceLastOneConfirms(_tokenToBeSwappedContract, _array_coins);
    }
  }
}

async function executeSwap(_amountIn, _amountOutMin, _path, _acct, _deadline) {
  var router = new ethers.Contract(SUSHISWAP_ROUTER, ROUTER_ABI, signer)
  try {
    var swap = await router.swapExactTokensForTokens(_amountIn,
      _amountOutMin,
      _path,
      _acct,
      _deadline)
  }
  catch (error) {
    console.log(error); //can I get it to try again here??
  }
}

async function executeNextSwapOnceLastOneConfirms(_tokenToBeSwappedContract, _array_coins) {
  var tokenTransferredFilter = _tokenToBeSwappedContract.filters.Transfer(user, null);
  _tokenToBeSwappedContract.once(tokenTransferredFilter, async (from, to, amount, event) => {
    console.log(`${from} sent ${amount} to ${to}`);
    await balanceAndRemoveOneCoin(_array_coins);
  })
}

function updateArray(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average
    decreaseFirstCoinDiffFromAverage(array_coins);
    removeFirstCoinAndReSort(array_coins);
  }
  else {
    decreaseLastCoinDiffFromAverage(array_coins)
    removeLastCoinAndReSort(array_coins);
  }
}

function decreaseFirstCoinDiffFromAverage(_array_coins) {
  _array_coins[0].diff_from_average -= Math.abs(_array_coins[_array_coins.length - 1].diff_from_average);
}

function decreaseLastCoinDiffFromAverage(_array_coins) {
  _array_coins[_array_coins.length - 1].diff_from_average += Math.abs(_array_coins[0].diff_from_average);
}

function removeFirstCoinAndReSort(_array_coins) {
  _array_coins.pop() //removes the last element from the array

  sortCoinsDescendingByDiffFromAvg(_array_coins);
}

function removeLastCoinAndReSort(_array_coins) {
  _array_coins.shift(); //remove the first element from the array

  sortCoinsDescendingByDiffFromAvg(_array_coins);
}