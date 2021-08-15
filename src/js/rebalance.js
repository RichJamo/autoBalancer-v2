const SUSHI_ADDRESS = "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a"
const WBTC_ADDRESS = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
const WMATIC_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
const BENTOBOX_MASTER_CONTRACT_ADDRESS = "0x0319000133d3AdA02600f0875d2cf03D442C3367";
const BENTOBOX_BALANCER_DAPP_ADDRESS = "0xa681de8A2824Cfc945f62cD131BcbD541D59741E"; //insert the address I deployed to

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"
const SUSHI_USD_ORACLE = "0x49b0c695039243bbfeb8ecd054eb70061fd54aa0"

var user;

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/
const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const dappContract_signer = new ethers.Contract(BENTOBOX_BALANCER_DAPP_ADDRESS, bento_dapp_abi, signer);
const dappContract_provider = new ethers.Contract(BENTOBOX_BALANCER_DAPP_ADDRESS, bento_dapp_abi, provider);

//check that we are connected to Polygon/Matic network
var chainId = await checkNetworkId(provider)
if (chainId !== 137) {
  console.log("Please change to Matic network") //TODO make this an alert to the user...
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], //137 in 0x padded hexadecimal form is 0x89
    });
    window.location.reload();
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (error.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0x89', rpcUrl: 'https://rpc-mainnet.maticvigil.com/' /* ... */ }],
        });
      } catch (addError) {
        // handle "add" error
      }
    }
    // handle other "switch" errors
  }
}

if (provider) {
  startApp(provider); // Initialize your app
} else {
  console.log('Please install MetaMask!');
}

async function checkNetworkId(_provider) {
  try {
    var network = await provider.getNetwork();
    return network["chainId"];
  }
  catch (error) {
    console.log(error);
  }
}

async function startApp(provider) {
  //Basic Actions Section
  const rebalanceOneButton = document.getElementById('rebalance_1');
  const rebalanceTwoButton = document.getElementById('rebalance_2');
  const rebalanceThreeButton = document.getElementById('rebalance_3');

  const approveDepositButton = document.getElementById('approveDeposit');
  const approveSwapsButton = document.getElementById('approveSwaps');
  const approveSpendUSDCButton = document.getElementById('approveSpendUSDC');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

  rebalanceOneButton.addEventListener('click', async () => {
    //pull coins back into the dapp from bentobox, before we start analysing them (use bentobox.withdraw, don't need approval)
    withdrawBalanceFromBentoBoxToDapp(WMATIC_ADDRESS) 
    withdrawBalanceFromBentoBoxToDapp(SUSHI_ADDRESS)
    withdrawBalanceFromBentoBoxToDapp(WBTC_ADDRESS)
    withdrawBalanceFromBentoBoxToDapp(WETH_ADDRESS)
  })

  rebalanceTwoButton.addEventListener('click', async () => {
    var array_coins = await getTokenInfoViaTokenContract();

    sortCoinsDescendingByDiffFromAvg(array_coins);

    await balanceAndRemoveOneCoin(array_coins);
  })

  rebalanceThreeButton.addEventListener('click', async () => {
    //need to get approval here - for bentobox to spend dapp's tokens - all four types
    dappContract_signer.depositToBento(getBalance(WMATIC_ADDRESS), WMATIC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
    dappContract_signer.depositToBento(getBalance(SUSHI_ADDRESS), SUSHI_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
    dappContract_signer.depositToBento(getBalance(WBTC_ADDRESS), WBTC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
    dappContract_signer.depositToBento(getBalance(WETH_ADDRESS), WETH_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
  })

  approveDepositButton.addEventListener('click', async () => {
    var amountToApprove = $("#approveAmountBento4tokens").val();

    giveApprovalFromDapp(WMATIC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, ethers.utils.parseUnits(amountToApprove, 18)); //getBalance(WMATIC_ADDRESS))
    giveApprovalFromDapp(SUSHI_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, ethers.utils.parseUnits(amountToApprove, 18)); //getBalance(SUSHI_ADDRESS));
    giveApprovalFromDapp(WBTC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, ethers.utils.parseUnits(amountToApprove, 8)); //getBalance(WBTC_ADDRESS));
    giveApprovalFromDapp(WETH_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, ethers.utils.parseUnits(amountToApprove, 18)); //getBalance(WETH_ADDRESS));
  })

  approveSwapsButton.addEventListener('click', async () => {
    var amountToApprove = $("#approveAmountSushiSwap4tokens").val();

    giveApprovalFromDapp(WMATIC_ADDRESS, SUSHISWAP_ROUTER, ethers.utils.parseUnits(amountToApprove, 18));//getBalance(WMATIC_ADDRESS));
    giveApprovalFromDapp(SUSHI_ADDRESS, SUSHISWAP_ROUTER, ethers.utils.parseUnits(amountToApprove, 18));//etBalance(SUSHI_ADDRESS));
    giveApprovalFromDapp(WBTC_ADDRESS, SUSHISWAP_ROUTER, ethers.utils.parseUnits(amountToApprove, 8));//getBalance(WBTC_ADDRESS));
    giveApprovalFromDapp(WETH_ADDRESS, SUSHISWAP_ROUTER, ethers.utils.parseUnits(amountToApprove, 18));//getBalance(WETH_ADDRESS));
  })

  approveSpendUSDCButton.addEventListener('click', async () => {
    var amountToApprove = $("#approveAmountBentoUSDC").val(); 

    giveApprovalFromDapp(USDC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, ethers.utils.parseUnits(amountToApprove, 6));//getBalance(USDC_ADDRESS));
  })
}

async function balanceAndRemoveOneCoin(array_coins) {

  var swapInputs = getSwapInputs(array_coins);
  var token_to_be_swapped_address = swapInputs[2][0];
  var amount_to_be_swapped = swapInputs[0];

  var isApprovedForAmount = await checkIfApprovedForAmount(token_to_be_swapped_address, amount_to_be_swapped);
  var tokenToBeSwappedContract = new ethers.Contract(token_to_be_swapped_address, token_abi, signer);

  if (isApprovedForAmount) {
    console.log("token already approved");
    confirmAndExecuteSwapAndUpdateArrayAndDoNextSwap(amount_to_be_swapped, swapInputs, array_coins, tokenToBeSwappedContract)
  }

  else {
    console.log("token not already approved");

    askUserForApproval(token_to_be_swapped_address, amount_to_be_swapped);
    //create a listener for the approval confirmation
    var filterForApprovalEvent = tokenToBeSwappedContract.filters.Approval(BENTOBOX_BALANCER_DAPP_ADDRESS, null);
    tokenToBeSwappedContract.once(filterForApprovalEvent, async (owner, spender, value, event) => {
      console.log('Tokens approved');
      confirmAndExecuteSwapAndUpdateArrayAndDoNextSwap(amount_to_be_swapped, swapInputs, array_coins, tokenToBeSwappedContract)
    })
  }
}

async function getBalance(token_address) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // get the balance of our user in that token
  try {
    var tokenBalance = await tokenContract.balanceOf(BENTOBOX_BALANCER_DAPP_ADDRESS);
    return tokenBalance;
  } catch (error) {
    console.log(error)
  }
}

async function getTokenInfoViaTokenContract() {
  
  function Coin(symbol, address, oracleAddress, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
    this.symbol = symbol;
    this.address = address;
    this.oracleAddress = oracleAddress;
    this.decimals = decimals;
    this.balance = balance;
    this.usd_balance = usd_balance;
    this.diff_from_average = diff_from_average;
    this.usd_exchange_rate = usd_exchange_rate;
  }

  //create a coin object for each of our 4 assets
  var WMATIC = new Coin("WMATIC", WMATIC_ADDRESS, MATIC_USD_ORACLE); 
  var SUSHI = new Coin("SUSHI", SUSHI_ADDRESS, SUSHI_USD_ORACLE); 
  var WBTC = new Coin("WBTC", WBTC_ADDRESS, BTC_USD_ORACLE); 
  var WETH = new Coin("WETH", WETH_ADDRESS, ETH_USD_ORACLE);

  var array_coins = [WMATIC, SUSHI, WBTC, WETH];
  var total_in_usd = 0;

  for (let coin of array_coins) {
    coin.balance = await getBalance(coin.address);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat(ethers.utils.formatUnits(coin.balance, coin.decimals)) * coin.usd_exchange_rate;
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }
  return array_coins;
}

async function getBentoBoxBalance(token_address, accountOrContract) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  try {
    var token_balance = await dappContract_provider.BentoTokenBalanceOf(token_address, accountOrContract);
    return token_balance;
  } catch (error) {
    console.log(error)
  }
}

async function getExchangeRate(oracle_address) {
  var oracle = new ethers.Contract(oracle_address, CHAINLINK_ORACLE_ABI, provider);
  try {
    var exchangeRate = await oracle.latestAnswer();
    return exchangeRate;
  } catch (error) {
    console.log(error);
  }
}

async function getDecimals(token_address) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  // check how many decimals that token has
  try {
    var decimals = await tokenContract.decimals();//need to catch an error here - perhaps make this it's own function!
    return decimals;
  } catch (error) {
    console.log(error);
  }
}

async function withdrawBalanceFromBentoBoxToDapp(token_address) { 
  try {
    var token_balance = await dappContract_provider.BentoTokenBalanceOf(token_address, BENTOBOX_BALANCER_DAPP_ADDRESS); 
    if (token_balance > 0) {
      console.log(`Moving ${token_balance} of ${token_address} into mixing pool to convert back to USDC`);
      $("#swapStarted").css("display", "block");
      $("#swapStarted").text(`Moving ${token_balance} of ${token_address} into mixing pool to convert back to USDC`);
      await dappContract_signer.withdraw(token_balance, token_address, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
    }
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
  if (approvedAmount.lt(_amount)) return false;
  else return true;
}

async function getAllowance(token_address, router_address) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // check what amount of user's tokens the spender is approved to use
  try {
    var approvedAmount = await tokenContract.allowance(BENTOBOX_BALANCER_DAPP_ADDRESS, router_address); //allowance(owner_address, spender_address)
    return approvedAmount;
  } catch (error) {
    console.log(error)
  }
}

async function giveApprovalFromDapp(token_address, router_address, amountIn) {
  // create a new instance of a contract
  // give router_address approval to spend dapp's tokens
  try {
    var approved = await dappContract_signer.approve_spending(token_address, router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

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
    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
}

async function askUserForApproval(_token_address, _amount) {
  if (window.confirm("Time to get approval!")) {
    //ask for approval
    await giveApprovalFromDapp(_token_address, SUSHISWAP_ROUTER, _amount); //token_address, router_address, amountIn
  }
}

async function confirmAndExecuteSwapAndUpdateArrayAndDoNextSwap(_amount_to_be_swapped, _swapInputs, _array_coins, _tokenToBeSwappedContract) {

  if (window.confirm("Confirm Swap")) {
    await executeDappSwap(_amount_to_be_swapped, _swapInputs[1], _swapInputs[2], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);

    updateArray(_array_coins);
    if (_array_coins.length > 1) {
      executeNextSwapOnceLastOneConfirms(_tokenToBeSwappedContract, _array_coins);
    }
  }
}

async function executeDappSwap(_amountIn, _amountOutMin, _path, _acct, _deadline) { //TODO does this even need to be in a function?
  try {
    await dappContract_signer.swap (_amountIn, _amountOutMin, _path, _acct, _deadline);
  }
  catch (error) {
    console.log(error); //can I get it to try again here??
  }
}

async function executeNextSwapOnceLastOneConfirms(_tokenToBeSwappedContract, _array_coins) {
  // var tokenTransferredFilter = _tokenToBeSwappedContract.filters.Transfer(BENTOBOX_BALANCER_DAPP_ADDRESS, null);
  // _tokenToBeSwappedContract.once(tokenTransferredFilter, async (from, to, amount, event) => {
  if (window.confirm("Swap Completed? Ready for next one?")) {
    // console.log(`${from} sent ${amount} to ${to}`);
    await balanceAndRemoveOneCoin(_array_coins);
  }
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