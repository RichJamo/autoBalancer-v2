const WMATIC_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
const SUSHI_ADDRESS = "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a"
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
const WBTC_ADDRESS = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"
const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
const BENTOBOX_MASTER_CONTRACT_ADDRESS = "0x0319000133d3AdA02600f0875d2cf03D442C3367";
const BENTOBOX_BALANCER_DAPP_ADDRESS = "0x6DbB1Ca56288eC8A16577880E03a3186F1b0eBb7" //"0x52B8634260b461Ce27b73fC1BA29924bB51AA28d"; //insert the address I deployed to

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const SUSHI_USD_ORACLE = "0x49b0c695039243bbfeb8ecd054eb70061fd54aa0"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"

var user;

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = await provider.getSigner()

// const forwarderOrigin = 'http://localhost:9010';

// const initialize = () => {
//   //Basic Actions Section
//   const onboardButton = document.getElementById('connectButton');
//   // const getAccountsButton = document.getElementById('getAccounts');
//   // const getAccountsResult = document.getElementById('getAccountsResult');

//   // //Created check function to see if the MetaMask extension is installed
//   // const isMetaMaskInstalled = () => {
//   //   //Have to check the ethereum binding on the window object to see if it's installed
//   //   const { ethereum } = window;
//   //   return Boolean(ethereum && ethereum.isMetaMask);
//   // };

//   // //We create a new MetaMask onboarding object to use in our app
//   // const onboarding = new MetaMaskOnboarding({ forwarderOrigin });

//   //This will start the onboarding proccess
//   // const onClickInstall = () => {
//   //   onboardButton.innerText = 'Onboarding in progress';
//   //   onboardButton.disabled = true;
//   //   //On this object we have startOnboarding which will start the onboarding process for our end user
//   //   onboarding.startOnboarding();
//   // };

//   const onClickConnect = async () => {
//     try {
//       // Will open the MetaMask UI
//       // You should disable this button while the request is pending!
//       await ethereum.request({ method: 'eth_requestAccounts' });
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   const MetaMaskClientCheck = () => {
//     //Now we check to see if Metmask is installed
//     if (!isMetaMaskInstalled()) {
//       //If it isn't installed we ask the user to click to install it
//       onboardButton.innerText = 'Click here to install MetaMask!';
//       //When the button is clicked we call th is function
//       onboardButton.onclick = onClickInstall;
//       //The button is now disabled
//       onboardButton.disabled = false;
//     } else {
//       //If MetaMask is installed we ask the user to connect to their wallet
//       onboardButton.innerText = 'Connect';
//       //When the button is clicked we call this function to connect the users MetaMask Wallet
//       onboardButton.onclick = onClickConnect;
//       //The button is now disabled
//       onboardButton.disabled = false;
//     }
//   };

//   //Eth_Accounts-getAccountsButton
//   getAccountsButton.addEventListener('click', async () => {
//     //we use eth_accounts because it returns a list of addresses owned by us.
//     const accounts = await ethereum.request({ method: 'eth_accounts' });
//     //We take the first address in the array of addresses and display it
//     getAccountsResult.innerHTML = accounts[0] || 'Not able to get accounts';
//   });

//   MetaMaskClientCheck();
// };

// window.addEventListener('DOMContentLoaded', initialize);

// console.log(signer)
// user = await signer.getAddress()
// console.log(user)
const dappContract_signer = new ethers.Contract(BENTOBOX_BALANCER_DAPP_ADDRESS, bento_dapp_abi, signer);
const dappContract_provider = new ethers.Contract(BENTOBOX_BALANCER_DAPP_ADDRESS, bento_dapp_abi, provider);
const BentoMasterContract_signer = new ethers.Contract(BENTOBOX_MASTER_CONTRACT_ADDRESS, bento_abi, signer);
const BentoMasterContract_provider = new ethers.Contract(BENTOBOX_MASTER_CONTRACT_ADDRESS, bento_abi, provider);

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
  // const RegisterProtocolButton = document.getElementById('RegisterProtocol');
  const ApproveMasterContractButton = document.getElementById('ApproveMasterContract'); //ok to have same name for id and variable?
  const depositButton = document.getElementById('depositButton');
  const approveButton = document.getElementById('approveButton');

  const withdrawToUserButton = document.getElementById('withdraw_BB_to_user');

  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  user = accounts[0];
  console.log(user)
  await displayBalances();

  await displayUSDBalances();

  ApproveMasterContractButton.addEventListener('click', async () => {
    const masterContract = BENTOBOX_BALANCER_DAPP_ADDRESS;
    const approved = true;
    const chainId = 137;

    const warning = approved ? 'Give FULL access to funds in (and approved to) BentoBox?' : 'Revoke access to BentoBox?';
    const nonce = await BentoMasterContract_provider.nonces(user);

    const message = {
      warning,
      user,
      masterContract,
      approved,
      nonce,
    };

    const domain = {
      name: 'BentoBox V1',
      chainId: chainId,
      verifyingContract: BENTOBOX_MASTER_CONTRACT_ADDRESS
    };

    const types = {
      SetMasterContractApproval: [
        { name: 'warning', type: 'string' },
        { name: 'user', type: 'address' },
        { name: 'masterContract', type: 'address' },
        { name: 'approved', type: 'bool' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    const signature = await signer._signTypedData(domain, types, message);
    const { r, s, v } = ethers.utils.splitSignature(signature);

    await BentoMasterContract_signer.setMasterContractApproval(
      user, //user
      BENTOBOX_BALANCER_DAPP_ADDRESS, //master contract - 
      true, //isApproved
      v,// uint8 v
      r,// bytes32 r
      s // bytes32 s
    );
  })

  approveButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    await giveApprovalFromUser(USDC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, ethers.utils.parseUnits(depositAmountUSDC.toString(), 6));
  })

  depositButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    console.log(`Depositing ${depositAmountUSDC} of USDC to the BentoBox SMEB account`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Depositing ${depositAmountUSDC} of USDC to the BentoBox SMEB account`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.depositUserFunds(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user, BENTOBOX_BALANCER_DAPP_ADDRESS);
    await dappContract_signer.depositUserFunds(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  })

  withdrawToUserButton.addEventListener('click', async () => {
    //put in gas estimation here
    await dappContract_signer.withdrawUserFunds(user);
  })
}

async function displayBalances() {
  getWMATICResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBentoBoxBalance(WMATIC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getSUSHIResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBentoBoxBalance(SUSHI_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getWBTCResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBentoBoxBalance(WBTC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS), 8)).toFixed(6) || 'Not able to get accounts';

  getWETHResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBentoBoxBalance(WETH_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';
}

async function displayUSDBalances() {
  var array_coins = await getTokenInfoViaBentobox(BENTOBOX_BALANCER_DAPP_ADDRESS);
  var wmatic_usd = array_coins[0].usd_balance;
  WMATICInUsd.innerHTML = wmatic_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WMATIC
  var sushi_usd = array_coins[1].usd_balance;
  SUSHIInUsd.innerHTML = sushi_usd.toFixed(2) || 'Not able to get accounts';
  var wbtc_usd = array_coins[2].usd_balance;
  WBTCInUsd.innerHTML = wbtc_usd.toFixed(2) || 'Not able to get accounts';
  var weth_usd = array_coins[3].usd_balance;
  WETHInUsd.innerHTML = weth_usd.toFixed(2) || 'Not able to get accounts';
  console.log('got here 1')

  var total_in_usd = wmatic_usd + sushi_usd + wbtc_usd + weth_usd;
  TotalInUSD.innerHTML = '$ ' + total_in_usd.toFixed(2);
  console.log('got here 2')
  var userShares = (await dappContract_provider.getUserShares(user)).toNumber()
  console.log('got here 3')

  var totalShares = (await dappContract_provider.totalNumberOfShares()).toNumber() //lesson here - overwriting public variable getter function??
  console.log('got here 4')

  UserShareInPerc.innerHTML = (userShares / totalShares * 100).toFixed(1) + '%'; //can add a percentage thingie here!
  USERshareInUSD.innerHTML = '$ ' + (userShares / totalShares * total_in_usd).toFixed(2); //TODO - neaten up this fix
}

async function getTokenInfoViaBentobox(accountOrContract) {

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
    coin.balance = await getBentoBoxBalance(coin.address, accountOrContract);
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
    var approved = await tokenContract.approve(router_address, amountIn); //approve(spender, amount)
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





