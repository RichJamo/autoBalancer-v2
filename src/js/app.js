// var web3 = new Web3(Web3.givenProvider);

var contract;
var user;
var contractAddress = "0xc7a395E3bf8c1ED2e6121aC6cB80271f89c7B219"; //need to put contract address here

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

// import detectEthereumProvider from '@metamask/detect-provider';

// this returns the provider, or null if it wasn't detected
const provider = await detectEthereumProvider();

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
  console.log("hello and welcome")
  //Basic Actions Section
  // const onboardButton = document.getElementById('connectButton'); - come back to this later - for checking if metamask installed
  const getAccountsButton = document.getElementById('getAccounts');
  const getAccountsResult = document.getElementById('getAccountsResult');
  const getBalanceResult = document.getElementById('getBalanceResult');

  //Eth_Accounts-getAccountsButton
  getAccountsButton.addEventListener('click', async () => {
        //we use eth_accounts because it returns a list of addresses owned by us.
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        //create a window.web3 object with our own version of web3, using the window.ethereum object as the input provider
        window.web3 = new Web3(window.ethereum);
        web3.eth.getBalance(accounts[0], function(err, result) {
            console.log(result) });
        // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
        var usdc = new web3.eth.Contract(abi, "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", {from: accounts[0]}); //USDC address
        var usdc_bal = await usdc.methods.balanceOf(accounts[0]).call((error, result) => {});
        getUSDCResult.innerHTML = usdc_bal || 'Not able to get accounts';

        var wbtc = new web3.eth.Contract(abi, "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", {from: accounts[0]}); //WBTC address
        var wbtc_bal = await wbtc.methods.balanceOf(accounts[0]).call((error, result) => {});
        getWBTCResult.innerHTML = wbtc_bal || 'Not able to get accounts';

        var wmatic = new web3.eth.Contract(abi, "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", {from: accounts[0]}); //WMATIC address
        var wmatic_bal = await wmatic.methods.balanceOf(accounts[0]).call((error, result) => {});
        getWMATICResult.innerHTML = wmatic_bal || 'Not able to get accounts';

        //We take the first address in the array of addresses and display it
        getAccountsResult.innerHTML = accounts[0] || 'Not able to get accounts';
        
        const balance = await ethereum.request({ method: 'eth_getBalance', params: [accounts[0], 'latest']});        
        getBalanceResult.innerHTML = parseInt(balance,16) || 'Not able to get balance';
  });
//   contractAddress = 
//   instance = new web3.eth.Contract(token_abi, contractAddress, {from: accounts[0]});
//   user = accounts[0];
//   web3 = new Web3 //create a web3 instance
//   contract = new contract //create a contract instance

  console.log("hello");
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
// document.getElementById('connectButton', connect);

// // While you are awaiting the call to eth_requestAccounts, you should disable
// // any buttons the user can click to initiate the request.
// // MetaMask will reject any additional requests while the first is still
// // pending.
// function connect() {
//   ethereum
//     .request({ method: 'eth_requestAccounts' })
//     .then(handleAccountsChanged)
//     .catch((err) => {
//       if (err.code === 4001) {
//         // EIP-1193 userRejectedRequest error
//         // If this happens, the user rejected the connection request.
//         console.log('Please connect to MetaMask.');
//       } else {
//         console.error(err);
//       }
//     });
// }
// $(document).ready(function(){ //when the document loads
//     // window.ethereum.enable().then(function(accounts){ //this should cause a metamask popup
//     //     // instance = new web3.eth.Contract(abi, contractAddress, {from: accounts[0]}); //creates an instance of the smart contract we want to interact with
//     //     user = accounts[0];
//     //     var accounts = web3.eth.getAccounts(); //this gets a list of the accounts in the Metamask wallet
//     //     console.log(accounts)
//     //     web3.eth.getBalance(user).then(console.log); //Get the balance of an address at a given block
//         // console.log(instance);

//     // }) //call metamask enable function
// })