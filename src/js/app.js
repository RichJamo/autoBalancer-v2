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

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

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
  const ApproveMasterContractButton = document.getElementById('ApproveMasterContract') //ok to have same name for id and variable?
  const depositButton = document.getElementById('depositButton');
  const approveButton = document.getElementById('approveButton');

  const withdrawToDappButton = document.getElementById('withdrawToDapp');
  const swapFourTokensButton = document.getElementById('swapFourTokens');
  const DepositFromDappButton = document.getElementById('DepositFromDapp');

  const withdrawToUserButton = document.getElementById('withdraw_BB_to_user');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

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
    await giveApprovalFromDapp(USDC_ADDRESS, SUSHISWAP_ROUTER, ethers.utils.parseUnits(depositAmountUSDC.toString(), 6));;
  })

  depositButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    console.log(`Depositing ${depositAmountUSDC} of USDC to the BentoBox SMEB account`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Depositing ${depositAmountUSDC} of USDC to the BentoBox SMEB account`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.depositToBento(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user, BENTOBOX_BALANCER_DAPP_ADDRESS);
    await dappContract_signer.depositToBento(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
    
    // update share of user for new deposit and update existing shares
    await updateSharesForDeposit(depositAmountUSDC);

    //LISTEN FOR DEPOSIT EVENT TO BE EMITTED
    var depositFilter = BentoMasterContract_provider.filters.LogDeposit(USDC_ADDRESS, user, BENTOBOX_BALANCER_DAPP_ADDRESS); //very specific filter
    BentoMasterContract_provider.once(depositFilter, async (token, from, to, event) => {
      console.log(`${from} sent ${token} to ${to}`);
      $("#swapStarted").css("display", "block");
      $("#swapStarted").text(`Funds landed in Bentobox`);
    })
    //THEN WITHDRAW FROM BENTOBOX TO DAPP
    if (window.confirm("Funds landed in Bentobox? Ready to move them to mixing pool?")) await withdrawNewDepositFromBentoBoxToDapp(depositAmountUSDC * 10 ** 6) //need to change this to withdraw all available balance?

    //LISTEN FOR THAT EVENT TO BE EMITTED
    var withdrawFilter = BentoMasterContract_provider.filters.LogWithdraw(USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS); //very specific filter
    BentoMasterContract_provider.once(withdrawFilter, async (token, from, to, event) => {
      console.log(`${from} sent ${token} to ${to}`);
      $("#swapStarted").css("display", "block");
      $("#swapStarted").text(`Deposit landed in mixing pool.`);
    })
    //THEN SWAP
    if (window.confirm("Deposit landed in mixing pool? Commence with swaps?")) await swapUSDCintoFourTokens(depositAmountUSDC);

  // THEN DEPOSIT THOSE FOUR CRYPTOS BACK INTO THE BENTOBOX DAPP ACCOUNT
  if (window.confirm("Swaps all completed? Move tokens back to Bentobox?")) await depositFourTokensBackIntoBentoBox();
  })
  
  // withdrawToDappButton.addEventListener('click', async () => {
  //   var _depositAmountUSDC = $("#depositAmountUSDC").val();
  //   await withdrawNewDepositFromBentoBoxToDapp(_depositAmountUSDC * 10 ** 6) //need to change this to withdraw all available balance?
  // })
  
  // swapFourTokensButton.addEventListener('click', async () => {
  //   var _depositAmountUSDC = $("#depositAmountUSDC").val();
  //   await swapUSDCintoFourTokens(_depositAmountUSDC);
  // })

  // DepositFromDappButton.addEventListener('click', async () => {
  //   depositFourTokensBackIntoBentoBox();
  // })

  // withdrawToUserButton.addEventListener('click', async () => {
  //   depositUSDCBackIntoBentoBox()
  // })

  withdrawToUserButton.addEventListener('click', async () => {
    //calculate the user's share and convert into USDC
    var userShareOfIndex = await dappContract_provider.getUserShares(user);
    var totalNumberOfShares = await dappContract_provider.totalNumberOfShares();
    
    var array_coins = await getTokenInfoViaBentobox(BENTOBOX_BALANCER_DAPP_ADDRESS);
    var USD_total = array_coins[0].usd_balance + array_coins[1].usd_balance + array_coins[2].usd_balance + array_coins[3].usd_balance;
    var userShareInUSDC = userShareOfIndex / totalNumberOfShares * USD_total;

    var WMATIC_share = ethers.BigNumber.from(parseInt(array_coins[0].usd_balance / USD_total * userShareInUSDC*10**8)).mul(ethers.BigNumber.from("1000000000000000000")).div(array_coins[0].usd_exchange_rate);

    var SUSHI_share = ethers.BigNumber.from(parseInt(array_coins[1].usd_balance / USD_total * userShareInUSDC*10**8)).mul(ethers.BigNumber.from("1000000000000000000")).div(array_coins[1].usd_exchange_rate);

    var WBTC_share = ethers.BigNumber.from(parseInt(array_coins[2].usd_balance / USD_total * userShareInUSDC*10**8)).mul(ethers.BigNumber.from("100000000")).div(array_coins[2].usd_exchange_rate);

    var WETH_share = ethers.BigNumber.from(parseInt(array_coins[3].usd_balance / USD_total * userShareInUSDC*10**8)).mul(ethers.BigNumber.from("1000000000000000000")).div(array_coins[3].usd_exchange_rate);

    //withdraw all four tokens into dapp contract (TO DO - change to FOR Loop?)
    await withdrawUserShareFromBentoBoxToDapp(WMATIC_ADDRESS, WMATIC_share); 
    await withdrawUserShareFromBentoBoxToDapp(SUSHI_ADDRESS, SUSHI_share); //only withdraw if the balance is not zero...
    await withdrawUserShareFromBentoBoxToDapp(WBTC_ADDRESS, WBTC_share);
    await withdrawUserShareFromBentoBoxToDapp(WETH_ADDRESS, WETH_share);

    //swap all four back into USDC 
    if (window.confirm("Ready to proceed to swaps?")) await swapFourTokensIntoUSDC();

    if (window.confirm("All swaps done? Ready to move funds back on to Bentobox?")) await depositUSDCBackIntoBentoBox();
    //TO DO - put in a check here - perhaps wait to see if total amount back in USDC?
    if (window.confirm("Funds back on Bentobox? Ready to withdraw to your account?")) await withdrawUSDCtoUserAccount(); //could this be a transfer as well? better that way, keep it in bentobox? or need to give them choice to do both...
    
    if (window.confirm("Funds returned? Update Share status (WILL REMOVE THIS IN FUTURE!)")) await updateSharesForWithdrawal();
  })
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
    coin.usd_balance = parseFloat((parseFloat(ethers.utils.formatUnits(coin.balance, coin.decimals))*parseFloat(ethers.utils.formatUnits(coin.usd_exchange_rate,8))).toFixed(6));
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }

  return array_coins;
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

  var total_in_usd = wmatic_usd + sushi_usd + wbtc_usd + weth_usd;
  TotalInUSD.innerHTML = total_in_usd.toFixed(2);
  
  var userShares = (await dappContract_provider.getUserShares(user)).toNumber()
  var totalShares = (await dappContract_provider.totalNumberOfShares()).toNumber() //lesson here - overwriting public variable getter function??
  UserShareInPerc.innerHTML = (userShares/totalShares*100).toFixed(1); //can add a percentage thingie here!
  USERshareInUSD.innerHTML = (userShares / totalShares * total_in_usd).toFixed(2); //TODO - neaten up this fix
}

async function updateSharesForDeposit(depositAmountUSDC) {
  var array_coins = await getTokenInfoViaBentobox(BENTOBOX_BALANCER_DAPP_ADDRESS);
  var totalinUSD = array_coins[0].usd_balance + array_coins[1].usd_balance + array_coins[2].usd_balance + array_coins[3].usd_balance;
  if (totalinUSD > 0) {
    var totalNumberOfShares = await dappContract_provider.totalNumberOfShares();
    var newSharesForUser = parseInt(depositAmountUSDC / totalinUSD * totalNumberOfShares);
    totalNumberOfShares = totalNumberOfShares.add(newSharesForUser);
  } else {
    var newSharesForUser = 100000000;
    totalNumberOfShares = newSharesForUser;
  }
  console.log(`Setting share of user to ${newSharesForUser} and updating total shares to ${totalNumberOfShares}`);
  $("#swapStarted").css("display", "block");
  $("#swapStarted").text(`Setting share of user to ${newSharesForUser} and updating total shares to ${totalNumberOfShares}`);
  await dappContract_signer.updateSharesOnDeposit(user, newSharesForUser); //RENAME modifyUserShare??
}

async function withdrawNewDepositFromBentoBoxToDapp(depositAmount) { //need to change this to withdraw all available balance?
  try {
    console.log(`Moving ${depositAmount} of USDC into the Index mixing pool`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Moving ${depositAmount} of USDC into the Index mixing pool`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.withdraw(depositAmount, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
    await dappContract_signer.withdraw(depositAmount, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  } catch (error) {
    console.log(error);
  }
}

async function withdrawUserShareFromBentoBoxToDapp(token_address, user_share) { //need to change this to withdraw all available balance?
  try {
    var token_balance = await dappContract_provider.BentoTokenBalanceOf(token_address, BENTOBOX_BALANCER_DAPP_ADDRESS); //TO DO - this is where we need to plug in user share!!
    if (token_balance > 0) {
      console.log(`Moving ${user_share} of ${token_address} from BentoBox to mixing pool`);
      $("#swapStarted").css("display", "block");
      $("#swapStarted").text(`Moving ${user_share} of ${token_address} from BentoBox to mixing pool`);
      var estimatedGasLimit = await dappContract_signer.estimateGas.withdraw(user_share, token_address, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
      await dappContract_signer.withdraw(user_share, token_address, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
    }
  } catch (error) {
    console.log(error);
  }
}

async function swapUSDCintoFourTokens(_depositAmountUSDC) {
  //CALCULATE THE PROPORTIONS OF WHAT"S CURRENTLY IN THE DAPP ON BB
  var array_coins = await getTokenInfoViaBentobox(BENTOBOX_BALANCER_DAPP_ADDRESS); //of tokens in the BentoBox!

  var USD_total = array_coins[0].usd_balance + array_coins[1].usd_balance + array_coins[2].usd_balance + array_coins[3].usd_balance

  if (USD_total > 0) { 
    var WMATIC_share = parseInt(array_coins[0].usd_balance / USD_total * (_depositAmountUSDC * 10 ** 6)); // replace with await getBalance(USDC_ADDRESS)
    var SUSHI_share = parseInt(array_coins[1].usd_balance / USD_total * (_depositAmountUSDC * 10 ** 6));
    var WBTC_share = parseInt(array_coins[2].usd_balance / USD_total * (_depositAmountUSDC * 10 ** 6));
    var WETH_share = parseInt(array_coins[3].usd_balance / USD_total * (_depositAmountUSDC * 10 ** 6));
  } else { //in case there's nothing in the Bentobox SMEB account yet...
    var WMATIC_share = 0.25 * _depositAmountUSDC * 10 ** 6;
    var SUSHI_share = 0.25 * _depositAmountUSDC * 10 ** 6;
    var WBTC_share = 0.25 * _depositAmountUSDC * 10 ** 6;
    var WETH_share = 0.25 * _depositAmountUSDC * 10 ** 6;
  }
  //SWAP USDC INTO THE FOUR CRYPTOS - have disabled the listeners for now as I suspected they were causing RPC errors that were throwing off other functions
  // I've commented out the listeners here till I figure out whether they've creating problems!
  // var _tokenToBeSwappedContract = new ethers.Contract(USDC_ADDRESS, token_abi, provider)
  // var tokenTransferredFilter = _tokenToBeSwappedContract.filters.Transfer(BENTOBOX_BALANCER_DAPP_ADDRESS, null);
  if (await getBalance(WMATIC_ADDRESS) == 0) {
    await executeDappSwap(WMATIC_share, ethers.utils.parseUnits((WMATIC_share / array_coins[0].usd_exchange_rate * 0.75).toFixed(8), array_coins[0].decimals), [USDC_ADDRESS, WMATIC_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  }
  // _tokenToBeSwappedContract.once(tokenTransferredFilter, async (from, to, amount, event) => {
  //   console.log(`${from} sent ${amount} to ${to}`);
  // })
  if (await getBalance(SUSHI_ADDRESS) == 0) {
    await executeDappSwap(SUSHI_share, ethers.utils.parseUnits((SUSHI_share / array_coins[1].usd_exchange_rate * 0.75).toFixed(8), array_coins[1].decimals), [USDC_ADDRESS, SUSHI_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  }
  // _tokenToBeSwappedContract.once(tokenTransferredFilter, async (from, to, amount, event) => {
  //   console.log(`${from} sent ${amount} to ${to}`);
  // })
  if (await getBalance(WBTC_ADDRESS) == 0) {
  await executeDappSwap(WBTC_share, ethers.utils.parseUnits((WBTC_share / array_coins[2].usd_exchange_rate * 0.75).toFixed(8), array_coins[2].decimals), [USDC_ADDRESS, WBTC_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  }
  // _tokenToBeSwappedContract.once(tokenTransferredFilter, async (from, to, amount, event) => {
  //   console.log(`${from} sent ${amount} to ${to}`);
  // })
  if (await getBalance(WETH_ADDRESS) == 0) {
    await executeDappSwap(WETH_share, ethers.utils.parseUnits((WETH_share / array_coins[3].usd_exchange_rate * 0.75).toFixed(8), array_coins[3].decimals), [USDC_ADDRESS, WETH_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  }
  // _tokenToBeSwappedContract.once(tokenTransferredFilter, async (from, to, amount, event) => {
  //   console.log(`${from} sent ${amount} to ${to}`);
  // })
}

async function swapFourTokensIntoUSDC() {
  var array_coins = await getTokenInfoViaTokenContract(); 

  if(array_coins[0].balance > 0) await executeDappSwap (array_coins[0].balance , parseInt(array_coins[0].usd_balance * 0.75/100), [WMATIC_ADDRESS, USDC_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  if(array_coins[1].balance > 0) await executeDappSwap (array_coins[1].balance , parseInt(array_coins[1].usd_balance * 0.75/100), [SUSHI_ADDRESS, USDC_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  if(array_coins[2].balance > 0) await executeDappSwap (array_coins[2].balance , parseInt(array_coins[2].usd_balance * 0.75/100), [WBTC_ADDRESS, USDC_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);
  if(array_coins[3].balance > 0) await executeDappSwap (array_coins[3].balance , parseInt(array_coins[3].usd_balance * 0.75/100), [WETH_ADDRESS, USDC_ADDRESS], BENTOBOX_BALANCER_DAPP_ADDRESS, Date.now() + 1111111111111);  
  console.log("all four swaps submitted")
}

async function depositUSDCBackIntoBentoBox() { //could I deposit straight into the user's account at this point?
  var USDC_balance = await getBalance(USDC_ADDRESS);
  if (USDC_balance > 0) {
    console.log(`Moving ${USDC_balance} of USDC back on to Bentobox`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Moving ${USDC_balance} of USDC back on to Bentobox`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.depositToBento(USDC_balance, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS);
    await dappContract_signer.depositToBento(USDC_balance, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  }
}

async function depositUSDCstraightBackToUser() { //could I deposit straight into the user's account at this point?
  var USDC_balance = await getBalance(USDC_ADDRESS);
  if (USDC_balance > 0) {
    console.log(`Moving ${USDC_balance} of USDC back on to Bentobox`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Moving ${USDC_balance} of USDC back on to Bentobox`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.depositToBento(USDC_balance, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, user);

    await dappContract_signer.depositToBento(USDC_balance, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, user, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  }
}

async function withdrawUSDCtoUserAccount() {
  //could this be a transfer as well? better that way, keep it in bentobox? or need to give them choice to do both...
  var amountAvailableToWithdraw = await getBentoBoxBalance(USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS); //TO DO modify this to be just their share!!
  if (amountAvailableToWithdraw > 0) {
    console.log(`Withdrawing ${amountAvailableToWithdraw} of USDC back to ${user}`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Withdrawing ${amountAvailableToWithdraw} of USDC back into ${user}`);
    var estimatedGasLimit = await dappContract_signer.estimateGas.withdraw(amountAvailableToWithdraw, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, user);
    await dappContract_signer.withdraw(amountAvailableToWithdraw, USDC_ADDRESS, BENTOBOX_BALANCER_DAPP_ADDRESS, user, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  } else {
    console.log(`No USDC available to withdraw at this point`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`No USDC available to withdraw at this point`);
  }
}

async function updateSharesForWithdrawal() {
  console.log(`Setting shares of ${user} to zero`);
  $("#swapStarted").css("display", "block");
  $("#swapStarted").text(`Setting shares of ${user} to zero`);
  await dappContract_signer.updateSharesOnWithdrawal(user); //RENAME modifyUserShare??
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





