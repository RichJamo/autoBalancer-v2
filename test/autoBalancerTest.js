const { expect } = require('chai');
const { ethers } = require('hardhat');
const { IUniRouter02_abi } = require('./abi_files/IUniRouter02_abi.js');
const { token_abi } = require('./abi_files/token_abi.js');
// const { getContractAddress } = require('@ethersproject/address')

ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";

describe(`Testing AutoBalancer contract`, () => {
    before(async () => {
        [user1, user2, user3, user4, _] = await ethers.getSigners();
        autoBalancer_instance = await ethers.getContractFactory("autoBalancer");
        autoBalancer = await autoBalancer_instance.deploy();

        // fund users 1 through 4 with MATIC
        users = [user1, user2, user3, user4]
        for (let x of users) {
            await network.provider.send("hardhat_setBalance", [
                x.address,
                "0x21E19E0C9BAB240000000", //amount of 2560000*10^18 in hex
            ]);
        }

        //create a router to swap into the underlying tokens for the LP and then add liquidity
        router = await ethers.getContractAt(IUniRouter02_abi, ROUTER);
        WNATIVE = await router.WETH();
        await router.connect(user1).swapExactETHForTokens(0, [WNATIVE, USDC], user1.address, Date.now() + 900, { value: ethers.utils.parseEther("1000") }) //USDC 6 decimals
    });

    describe(`Testing depositing into autoBalancer, withdrawing from autoBalancer:
    `, () => {
        it('Should deposit USDC from user 1 into autoBalancer - leading to an increase in receipt tokens for user 1', async () => {
            usdc = await ethers.getContractAt(token_abi, USDC);
            var usdcBalance = await usdc.balanceOf(user1.address);
            await usdc.approve(autoBalancer.address, usdcBalance);

            receiptToken = await ethers.getContractAt(token_abi, autoBalancer.address);
            const receiptTokenBalanceBeforeDeposit = await receiptToken.balanceOf(user1.address);

            await autoBalancer.depositUserFunds(usdcBalance); //todo - change min in amount from 0

            const receiptTokenBalanceAfterDeposit = await receiptToken.balanceOf(user1.address);
            expect(receiptTokenBalanceAfterDeposit).to.be.gt(receiptTokenBalanceBeforeDeposit);
        })
        it('Should withdraw USDC from autoBalancer - resulting in receipt token balance returning to zero', async () => {
            await autoBalancer.withdrawUserFunds(user1.address);

            const receiptTokenBalanceAfterWithdrawal = await receiptToken.balanceOf(user1.address);

            expect(receiptTokenBalanceAfterWithdrawal).to.equal(0);
        })
    })
})

