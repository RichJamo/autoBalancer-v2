const AUTO_BALANCER_DAPP_ADDRESS = "0xA0301c291272ab3bd10aEf5b50E618fb7033e97f" //"0x52B8634260b461Ce27b73fC1BA29924bB51AA28d"; //insert the address I deployed to

const WMATIC_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
const SAND_ADDRESS = "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683"
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
const WBTC_ADDRESS = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"
const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const SAND_USD_ORACLE = "0x3D49406EDd4D52Fb7FFd25485f32E073b529C924"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"

var user;

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = await provider.getSigner()

const dappContract_signer = new ethers.Contract(AUTO_BALANCER_DAPP_ADDRESS, balancer_dapp_abi, signer);
const dappContract_provider = new ethers.Contract(AUTO_BALANCER_DAPP_ADDRESS, balancer_dapp_abi, provider);

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

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
let accounts = await ethereum.request({ method: 'eth_accounts' });
console.log(accounts)

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
  const connectButton = document.getElementById('connectButton');
  const depositButton = document.getElementById('depositButton');
  const approveButton = document.getElementById('approveButton');

  const withdrawToUserButton = document.getElementById('withdraw_BB_to_user');
  await walletButtonStateHandler();

  await displayBalances();
  await displayUSDBalances();

  async function walletButtonStateHandler() {
    if (accounts.length > 0) {
      user = accounts[0];
      connectButton.classList.add("btn-success");
      connectButton.innerHTML = user;
      connectButton.disabled = true;
    } else {
      connectButton.classList.remove("btn-danger");
      connectButton.innerHTML = "Connect Wallet";
    }
  }

  connectButton.addEventListener('click', async (event) => {
    connectButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span>  Connecting ...`;
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
    } catch (error) {
    }
    accounts = await ethereum.request({
      method: "eth_accounts",
    });
    await walletButtonStateHandler();
    await displayUSDBalances();

  });


  approveButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    let tx = await giveApprovalFromUser(USDC_ADDRESS, AUTO_BALANCER_DAPP_ADDRESS, ethers.utils.parseUnits(depositAmountUSDC.toString(), 6));
    let result = await tx.wait();
    if (result) {
      $("#swapStarted").css("display", "inline-block");
      $("#swapStarted").text(`Deposit approved`);
      setTimeout(function () {
        $("#swapStarted").css("display", "none");
      }, (3 * 1000));
    }
  })

  depositButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    console.log(`Depositing ${depositAmountUSDC} of USDC to the SMEB account`);
    $("#swapStarted").css("display", "inline-block");
    $("#swapStarted").text(`Depositing ${depositAmountUSDC} of USDC to the SMEB account`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.depositUserFunds(depositAmountUSDC * 10 ** 6);
    let tx = await dappContract_signer.depositUserFunds(depositAmountUSDC * 10 ** 6, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
    let result = await tx.wait();
    if (result) {
      $("#swapStarted").css("display", "inline-block");
      $("#swapStarted").text(`Deposit successful`);
      await displayBalances();
      await displayUSDBalances();
      setTimeout(function () {
        $("#swapStarted").css("display", "none");
      }, (3 * 1000));
    }
  })

  withdrawToUserButton.addEventListener('click', async () => {
    //put in gas estimation here
    var estimatedGasLimit = await dappContract_signer.estimateGas.withdrawUserFunds(user);
    let tx = await dappContract_signer.withdrawUserFunds(user, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
    let result = await tx.wait();
    if (result) {
      $("#swapStarted").css("display", "inline-block");
      $("#swapStarted").text(`Withdraw successful`);
      await displayBalances();
      await displayUSDBalances();
      setTimeout(function () {
        $("#swapStarted").css("display", "none");
      }, (3 * 1000));
    }
  })
}

async function displayBalances() {
  getWMATICResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WMATIC_ADDRESS, AUTO_BALANCER_DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getSANDResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(SAND_ADDRESS, AUTO_BALANCER_DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getWBTCResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WBTC_ADDRESS, AUTO_BALANCER_DAPP_ADDRESS), 8)).toFixed(6) || 'Not able to get accounts';

  getWETHResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WETH_ADDRESS, AUTO_BALANCER_DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';
}

async function displayUSDBalances() {
  var array_coins = await getTokenInfo(AUTO_BALANCER_DAPP_ADDRESS);
  var wmatic_usd = array_coins[0].usd_balance;
  WMATICInUsd.innerHTML = wmatic_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WMATIC
  var sand_usd = array_coins[1].usd_balance;
  SANDInUsd.innerHTML = sand_usd.toFixed(2) || 'Not able to get accounts';
  var wbtc_usd = array_coins[2].usd_balance;
  WBTCInUsd.innerHTML = wbtc_usd.toFixed(2) || 'Not able to get accounts';
  var weth_usd = array_coins[3].usd_balance;
  WETHInUsd.innerHTML = weth_usd.toFixed(2) || 'Not able to get accounts';

  var total_in_usd = wmatic_usd + sand_usd + wbtc_usd + weth_usd;
  TotalInUSD.innerHTML = '$ ' + total_in_usd.toFixed(2);
  if (user) {
    var userShares = (await dappContract_provider.getUserShares(user)).toNumber()
    var totalShares = (await dappContract_provider.totalNumberOfShares()).toNumber() //lesson here - overwriting public variable getter function??

    UserShareInPerc.innerHTML = (userShares / totalShares * 100).toFixed(1) + '%'; //can add a percentage thingie here!
    USERshareInUSD.innerHTML = '$ ' + (userShares / totalShares * total_in_usd).toFixed(2); //TODO - neaten up this fix
  } else {
    UserShareInPerc.innerHTML = "NA"
    USERshareInUSD.innerHTML = "NA"
  }

}

async function getTokenInfo(accountOrContract) {

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
  var SAND = new Coin("SAND", SAND_ADDRESS, SAND_USD_ORACLE);
  var WBTC = new Coin("WBTC", WBTC_ADDRESS, BTC_USD_ORACLE);
  var WETH = new Coin("WETH", WETH_ADDRESS, ETH_USD_ORACLE);

  var array_coins = [WMATIC, SAND, WBTC, WETH];
  var total_in_usd = 0;

  for (let coin of array_coins) {
    coin.balance = await getBalance(coin.address, accountOrContract);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat((parseFloat(ethers.utils.formatUnits(coin.balance, coin.decimals)) * parseFloat(ethers.utils.formatUnits(coin.usd_exchange_rate, 8))).toFixed(6));

    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }

  return array_coins;
}

async function giveApprovalFromUser(token_address, router_address, amountIn) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // give router_address approval to spend user's tokens
  try {
    var approved = await tokenContract.approve(router_address, amountIn);
    return approved;

  } catch (error) {
    console.log(error)
  }
}

async function getBalance(token_address, accountOrContract) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  try {
    var token_balance = await dappContract_provider.tokenBalanceOf(token_address, accountOrContract);
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





