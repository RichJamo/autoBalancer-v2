
async function withdrawBalanceFromBentoBoxToDapp(token_address) { //need to change this to withdraw all available balance?
    try {
  
      var token_balance = await dappContract_provider.BentoTokenBalanceOf(token_address, BENTOBOX_BALANCER_DAPP_ADDRESS); //TO DO - this is where we need to plug in user share!!
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