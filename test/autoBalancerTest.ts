import { expect } from 'chai';
import { ethers } from 'hardhat';
import { IUniRouter02_abi } from './abi_files/IUniRouter02_abi.js';
import { token_abi } from './abi_files/token_abi.js';
import { Contract } from "ethers";
// const { getContractAddress } = require('@ethersproject/address')

const ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";

describe(`Testing AutoBalancer contract`, () => {
    let users: any;
    let user1: any, user2: any, user3: any, user4: any, _: any;
    let usdc: any;
    let router: any;
    let WNATIVE: any;
    let autoBalancer: Contract;
    let receiptToken: any;
    before(async () => {
        [user1, user2, user3, user4, _] = await ethers.getSigners();
        const autoBalancer_instance = await ethers.getContractFactory("autoBalancer");
        autoBalancer = await autoBalancer_instance.deploy();

        // fund users 1 through 4 with MATIC
        users = [user1, user2, user3, user4]
        for (let x of users) {
            await ethers.provider.send("hardhat_setBalance", [
                x.address,
                "0x21E19E0C9BAB240000000", //amount of 2560000*10^18 in hex
            ]);
        }

        //create a router to swap into USDC
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
            expect(receiptTokenBalanceAfterDeposit - receiptTokenBalanceBeforeDeposit).to.equal(usdcBalance);
        })
        it('Should leave user 1 with a USDC balance = 0 after deposit', async () => {
            var usdcBalance2 = await usdc.balanceOf(user1.address);

            expect(usdcBalance2).to.equal(0);
        })
        it('Should withdraw USDC from autoBalancer - resulting in receipt token balance returning to zero', async () => {
            await autoBalancer.withdrawUserFunds(user1.address);

            const receiptTokenBalanceAfterWithdrawal = await receiptToken.balanceOf(user1.address);

            expect(receiptTokenBalanceAfterWithdrawal).to.equal(0);
        })
        it('Should return USDC to user 1, resulting in their USDC balance > 0', async () => {
            var usdcBalance3 = await usdc.balanceOf(user1.address);

            expect(usdcBalance3).to.be.gt(0);
        })
    })
})

