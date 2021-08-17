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

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const dappContract_signer = new ethers.Contract(BENTOBOX_BALANCER_DAPP_ADDRESS, bento_dapp_abi, signer);
const dappContract_provider = new ethers.Contract(BENTOBOX_BALANCER_DAPP_ADDRESS, bento_dapp_abi, provider);
const BentoMasterContract_signer = new ethers.Contract(BENTOBOX_MASTER_CONTRACT_ADDRESS, bento_abi, signer);
const BentoMasterContract_provider = new ethers.Contract(BENTOBOX_MASTER_CONTRACT_ADDRESS, bento_abi, provider);

async function getBalance(token_address) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // get the balance of our user in that token
  try {
    var tokenBalance = await tokenContract.balanceOf(BENTOBOX_BALANCER_DAPP_ADDRESS);
    return tokenBalance; //I'm guessing this is a BN (or a string?)
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

async function withdrawBalanceFromBentoBoxToDapp(token_address) { //need to change this to withdraw all available balance?
  try {

    var token_balance = await dappContract_provider.BentoTokenBalanceOf(token_address, BENTOBOX_BALANCER_DAPP_ADDRESS); //TO DO - this is where we need to plug in user share!!
    if (token_balance > 0) {
      console.log(`Moving ${token_balance} of ${token_address} into mixing pool to convert back to USDC`);
      $("#swapStarted").css("display", "block");
      $("#swapStarted").text(`Moving ${token_balance} of ${token_address} into mixing pool to convert back to USDC`);
      var estimatedGasLimit = await dappContract_signer.estimateGas.withdraw(token_balance, token_address, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
      await dappContract_signer.withdraw(token_balance, token_address, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
    }
  } catch (error) {
    console.log(error);
  }
}

async function executeDappSwap(_amountIn, _amountOutMin, _path, _acct, _deadline) {
  console.log(`Swapping ${_amountIn} of ${_path[0]} into ${_path[1]}`);
  $("#swapStarted").css("display", "block");
  $("#swapStarted").text(`Swapping ${_amountIn} of ${_path[0]} into ${_path[1]}`);
  var estimatedGasLimit = await dappContract_signer.estimateGas.swap(_amountIn, _amountOutMin, _path, _acct, _deadline);
  try {
    await dappContract_signer.swap(_amountIn, _amountOutMin, _path, _acct, _deadline, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  }
  catch (error) {
    console.log(error); //can I get it to try again here??
  }
}

async function depositFourTokensBackIntoBentoBox() {
  $("#swapStarted").css("display", "block");
  $("#swapStarted").text(`Moving four tokens back into the Bentobox pool`);
  var estimatedGasLimit = await dappContract_signer.estimateGas.depositToBento(getBalance(WMATIC_ADDRESS), WMATIC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
  if(await getBalance(WMATIC_ADDRESS) > 0) dappContract_signer.depositToBento(getBalance(WMATIC_ADDRESS), WMATIC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  if(await getBalance(SUSHI_ADDRESS) > 0) dappContract_signer.depositToBento(getBalance(SUSHI_ADDRESS), SUSHI_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  if(await getBalance(WBTC_ADDRESS) > 0) dappContract_signer.depositToBento(getBalance(WBTC_ADDRESS), WBTC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  if(await getBalance(WETH_ADDRESS) > 0) dappContract_signer.depositToBento(getBalance(WETH_ADDRESS), WETH_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  // if(await getBalance(USDC_ADDRESS) > 0) dappContract_signer.depositToBento(getBalance(USDC_ADDRESS), USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
  console.log("tokens being deposited back now..."); //TODO add listener(s) to confirm this with a bit more certainty
  //TODO AND THEN REFRESH THE PAGE ONCE I'VE GOT THE CONFIRM - OR JUST RE-DISPLAY THE PRICES..
}

async function giveApprovalFromDapp(token_address, router_address, amountIn) {
  // give router_address approval to spend dapp's tokens
  try {
    var approved = await dappContract_signer.approve_spending(token_address, router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
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
    return exchangeRate; //returns in BigNumber format
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
