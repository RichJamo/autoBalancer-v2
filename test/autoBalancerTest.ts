import { expect } from 'chai';
import { ethers } from 'hardhat';
import { IUniRouter02_abi } from './abi_files/IUniRouter02_abi.js';
import { token_abi } from './abi_files/token_abi.js';
import { Contract } from "ethers";
// const { getContractAddress } = require('@ethersproject/address')

const ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const WMATIC_ADDRESS =
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const SAND_ADDRESS =
    "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683";
const WETH_ADDRESS =
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const WBTC_ADDRESS =
    "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";

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
        await router.swapExactETHForTokens(0, [WNATIVE, USDC], user1.address, Date.now() + 900, { value: ethers.utils.parseEther("1000") }) //USDC 6 decimals
        await router.connect(user2).swapExactETHForTokens(0, [WNATIVE, USDC], user2.address, Date.now() + 900, { value: ethers.utils.parseEther("1000") }) //USDC 6 decimals
        usdc = await ethers.getContractAt(token_abi, USDC);
        receiptToken = await ethers.getContractAt(token_abi, autoBalancer.address);
    });

    describe(`Testing depositing into autoBalancer, withdrawing from autoBalancer:
    `, () => {
        it('Should deposit USDC from user 1 into autoBalancer - leading to an increase in receipt tokens for user 1', async () => {
            var usdcBalance = await usdc.balanceOf(user1.address);
            await usdc.approve(autoBalancer.address, usdcBalance);

            const receiptTokenBalanceBeforeDeposit = await receiptToken.balanceOf(user1.address);

            await autoBalancer.depositUserFunds(usdcBalance); //todo - change min in amount from 0

            const receiptTokenBalanceAfterDeposit = await receiptToken.balanceOf(user1.address);
            expect(receiptTokenBalanceAfterDeposit - receiptTokenBalanceBeforeDeposit).to.equal(usdcBalance);
        })
        it('Should leave user 1 with a USDC balance = 0 after deposit', async () => {
            var usdcBalance2 = await usdc.balanceOf(user1.address);

            expect(usdcBalance2).to.equal(0);
        })
        it('Should give portfolio a non-zero wmatic balance', async () => {
            var wmatic = await ethers.getContractAt(token_abi, WMATIC_ADDRESS);
            var wmaticBalance = await wmatic.balanceOf(autoBalancer.address);

            expect(wmaticBalance).to.be.gt(0);
        })
        it('Should give portfolio a non-zero sand balance', async () => {
            var sand = await ethers.getContractAt(token_abi, SAND_ADDRESS);
            var sandBalance = await sand.balanceOf(autoBalancer.address);

            expect(sandBalance).to.be.gt(0);
        })
        it('Should give portfolio a non-zero weth balance', async () => {
            var weth = await ethers.getContractAt(token_abi, WETH_ADDRESS);
            var wethBalance = await weth.balanceOf(autoBalancer.address);

            expect(wethBalance).to.be.gt(0);
        })
        it('Should give portfolio a non-zero wbtc balance', async () => {
            var wbtc = await ethers.getContractAt(token_abi, WBTC_ADDRESS);
            var wbtcBalance = await wbtc.balanceOf(autoBalancer.address);

            expect(wbtcBalance).to.be.gt(0);
        })
        it('Should deposit USDC from user 2 into autoBalancer - leading to an increase in receipt tokens for user 2', async () => {
            var usdcBalance = await usdc.balanceOf(user2.address);
            await usdc.connect(user2).approve(autoBalancer.address, usdcBalance);

            const receiptTokenBalanceBeforeDeposit = await receiptToken.balanceOf(user2.address);

            await autoBalancer.connect(user2).depositUserFunds(usdcBalance); //todo - change min in amount from 0
            var supply = await autoBalancer.totalSupply();
            const receiptTokenBalanceAfterDeposit = await receiptToken.balanceOf(user2.address);
            console.log(receiptTokenBalanceAfterDeposit / supply);
            expect(receiptTokenBalanceAfterDeposit).to.be.gt(receiptTokenBalanceBeforeDeposit);
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
        it('Should be the case that user 2 now holds all receipt tokens', async () => {
            var supply = await autoBalancer.totalSupply()
            const receiptTokenBalanceAfterWithdrawal = await receiptToken.balanceOf(user2.address);
            expect(receiptTokenBalanceAfterWithdrawal).to.equal(supply);
        })
    })
})

