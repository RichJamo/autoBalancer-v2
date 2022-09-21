import { ethers } from "hardhat";
import { expect } from "chai";
import { tokens, accounts, lps, routers } from "../configs/addresses";
import { advanceBlock, advanceBlockTo, advanceBlockNumber } from "./utils";
const { WMATIC, CRYSTL, DAI } = tokens.polygon;
const { MATIC_CRYSTL_APE_LP } = lps.polygon;
const { APESWAP_ROUTER } = routers.polygon;
const { FEE_ADDRESS, BURN_ADDRESS, ZERO_ADDRESS } = accounts.polygon;
import { IUniRouter02_abi } from './abi_files/IUniRouter02_abi';
import { token_abi } from './abi_files/token_abi';
import { IWETH_abi } from './abi_files/IWETH_abi';
import { Contract } from "ethers";

// const { IMasterchef_abi } = require('./IMasterchef_abi.js');
const { IUniswapV2Pair_abi } = require('./abi_files/IUniswapV2Pair_abi.js');


describe(`Testing Custom Bond`, () => {
    let LPtoken:any;
    let customBond:any;
    let user1:any, user2:any, user3:any, _:any;
    let crystlToken:Contract;
    before(async () => {
        [user1, user2, user3, _] = await ethers.getSigners();

        const CustomTreasury = await ethers.getContractFactory("CustomTreasury", {
        });

        const customTreasury = await CustomTreasury.deploy(
            CRYSTL, //address _payoutToken,  todo - what should this be? we bond crystl and pay out in?
            user1.address, //address _initialOwner
        );

        const CustomBond = await ethers.getContractFactory("CustomBond", {
        });
        
        customBond = await CustomBond.deploy(        
            customTreasury.address, //address _customTreasury, 
            MATIC_CRYSTL_APE_LP, //address _principalToken, CRYSTL-CRO LP
            user1.address, //address _initialOwner
        );
        
        customTreasury.toggleBondContract(customBond.address);
        
        customBond.setBondTerms(0, 46200); //PARAMETER = { VESTING, PAYOUT, DEBT }

        customBond.initializeBond(
            250000, //uint _controlVariable, 
            46200, //uint _vestingTerm,
            0, //1351351, //uint _minimumPrice,
            100000000000, //uint _maxPayout,
            "100000000000000000000000", //uint _maxDebt,
            "690000000000000000000", //uint _initialDebt
        )
        
        // console.log("await customBond.bondPrice()");
        // console.log(await customBond.bondPrice());

        // console.log("await customBond.trueBondPrice()");
        // console.log(await customBond.trueBondPrice());

        // console.log("await customBond.maxPayout()");
        // console.log(await customBond.maxPayout());



        // console.log("await customBond.debtRatio()");
        // console.log(await customBond.debtRatio());

        // console.log("await customBond.currentDebt()");
        // console.log(await customBond.currentDebt());

        // console.log("await customBond.debtDecay()");
        // console.log(await customBond.debtDecay());

        // console.log("await customBond.percentVestedFor(user1.address)");
        // console.log(await customBond.percentVestedFor(user1.address));

        // console.log("await customBond.pendingPayoutFor(user1.address)");
        // console.log(await customBond.pendingPayoutFor(user1.address));


        LPtoken = await ethers.getContractAt(IUniswapV2Pair_abi, MATIC_CRYSTL_APE_LP);
        const TOKEN0ADDRESS = await LPtoken.token0()
        const TOKEN1ADDRESS = await LPtoken.token1()
    
        const uniswapRouter = await ethers.getContractAt(IUniRouter02_abi, APESWAP_ROUTER);

        await ethers.provider.send("hardhat_setBalance", [
            user1.address,
            "0x21E19E0C9BAB2400000", //amount of 1000 in hex
        ]);

        await ethers.provider.send("hardhat_setBalance", [
            user2.address,
            "0x84595161401484A000000", //amount of 1000 in hex
        ]);

        //fund the treasury with reward token, Crystl 
        crystlToken = await ethers.getContractAt(token_abi, CRYSTL);
        //  await setTokenBalanceInStorage(crystlToken, customTreasury.address, "10000");

        await uniswapRouter.connect(user2).swapExactETHForTokens(0, [WMATIC, CRYSTL], customTreasury.address, Date.now() + 900, { value: ethers.utils.parseEther("9900000") })
        // I think I'm losing out massively to slippage here...
        var wmatic_token;
        if (TOKEN0ADDRESS == ethers.utils.getAddress(WMATIC) ){
            wmatic_token = await ethers.getContractAt(IWETH_abi, TOKEN0ADDRESS); 
            await wmatic_token.deposit({ value: ethers.utils.parseEther("4500") });
        } else {
            await uniswapRouter.swapExactETHForTokens(0, [WMATIC, TOKEN0ADDRESS], user1.address, Date.now() + 900, { value: ethers.utils.parseEther("4500") })
        }
        if (TOKEN1ADDRESS == ethers.utils.getAddress(WMATIC)) {
            wmatic_token = await ethers.getContractAt(IWETH_abi, TOKEN1ADDRESS); 
            await wmatic_token.deposit({ value: ethers.utils.parseEther("4500") });
        } else {
            await uniswapRouter.swapExactETHForTokens(0, [WMATIC, TOKEN1ADDRESS], user1.address, Date.now() + 900, { value: ethers.utils.parseEther("4500") })
        }
 
        //create instances of token0 and token1
        const token0 = await ethers.getContractAt(token_abi, TOKEN0ADDRESS);
        const token1 = await ethers.getContractAt(token_abi, TOKEN1ADDRESS);
        
        //user 1 adds liquidity to get LP tokens
        var token0BalanceUser1 = await token0.balanceOf(user1.address);
        await token0.approve(uniswapRouter.address, token0BalanceUser1);
        
        var token1BalanceUser1 = await token1.balanceOf(user1.address);
        await token1.approve(uniswapRouter.address, token1BalanceUser1);
        
        await uniswapRouter.addLiquidity(TOKEN0ADDRESS, TOKEN1ADDRESS, token0BalanceUser1, token1BalanceUser1, 0, 0, user1.address, Date.now() + 900);
    });

    describe(`Testing depositing into the bond, running through some of the vesting period, redeeming CRYSTL from the bond:
    `, () => {
        it('Should deposit user1\'s LP tokens into the bond, increasing the bonds currentDebt by the amount of LP tokens deposited', async () => {
            const initialLPtokenBalance = "1000000000000000000";

            const initialDebtBeforeDeposit = await customBond.currentDebt();
            
            console.log(`       Initial Debt for the bond is ${ethers.utils.formatEther(initialDebtBeforeDeposit)} LP tokens`);

            await LPtoken.connect(user1).approve(customBond.address, initialLPtokenBalance);

            await customBond.deposit(initialLPtokenBalance, 1000000000000000, user1.address); //uint _maxPrice

            console.log(`       User1 has deposited ${ethers.utils.formatEther(initialLPtokenBalance)} LP tokens`)
            console.log(`       Total payout for this deposit is ${ethers.utils.formatEther(await customBond.payoutFor(initialLPtokenBalance))} CRYSTL`);

            const debtAfterDeposit = await customBond.currentDebt();
            console.log(`       Current Debt for the bond after the deposit is ${ethers.utils.formatEther(debtAfterDeposit)} LP tokens`);

            expect(debtAfterDeposit).to.be.gt(initialDebtBeforeDeposit);
        });


        it('Should wait 1000 blocks and then check payout amount, which should have grown', async () => {
            const userPendingPayoutAtStart = await customBond.pendingPayoutFor(user1.address);
            console.log(`       Pending payout for User1 straight after deposit is ${ethers.utils.formatEther(userPendingPayoutAtStart)} CRYSTL`)
            console.log(`       ${await ethers.provider.getBlockNumber()}`);
            await advanceBlockNumber(462)
            // for (let i=0; i<462;i++) { //minBlocksBetweenSwaps
            //     await ethers.provider.send("evm_mine", []); //creates a delay of minBlocksBetweenSwaps+1 blocks
            // }
            console.log(`       ${await ethers.provider.getBlockNumber()}`);
            
            const userPendingPayoutAfterTime = await customBond.pendingPayoutFor(user1.address);
            console.log(`       Pending payout for User1 462 blocks after deposit is ${ethers.utils.formatEther(userPendingPayoutAfterTime)} CRYSTL`)

            expect(userPendingPayoutAfterTime).to.be.gt(userPendingPayoutAtStart); //will only be true on first deposit?
        });

        it('Should redeem the outstanding payout amount', async () => {
            const userPendingPayoutBeforeRedemption = await customBond.pendingPayoutFor(user1.address);
            const userCrystlBalanceBeforeRedemption = await crystlToken.balanceOf(user1.address);

            console.log(`       Pending payout for User1 before redemption is ${ethers.utils.formatEther(userPendingPayoutBeforeRedemption)} CRYSTL`)
            console.log(`       CRYSTL balance for User1 before redemption is ${ethers.utils.formatEther(userCrystlBalanceBeforeRedemption)} CRYSTL`)

            await customBond.redeem(user1.address);
            
            const userPendingPayoutAfterRedemption = await customBond.pendingPayoutFor(user1.address);
            const userCrystlBalanceAfterRedemption = await crystlToken.balanceOf(user1.address);
            console.log(`       Pending payout for User1 after redemption is ${ethers.utils.formatEther(userPendingPayoutAfterRedemption)} CRYSTL`)
            console.log(`       CRYSTL balance for User1 after redemption is ${ethers.utils.formatEther(userCrystlBalanceAfterRedemption)} CRYSTL`)

            expect(userPendingPayoutBeforeRedemption).to.be.gt(userPendingPayoutAfterRedemption); //will only be true on first deposit?
            expect(userPendingPayoutBeforeRedemption).to.equal(userCrystlBalanceAfterRedemption); //will only be true on first deposit?
        });
        
    })
})

