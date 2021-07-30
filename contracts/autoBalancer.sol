pragma solidity 0.5.16;

//import statements go here
// import "../../interfaces/IBentoMasterContract.sol";
//do I need to import the interface for the bentobox contracT?

contract autoBalancer {
    address public constant BENTOBOX_MASTER_CONTRACT_ADDRESS = 0x0319000133d3ada02600f0875d2cf03d442c3367;
    address public constant USDC_ADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant WETH_ADDRESS = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;


    //more variables here
    constructor() autoBalancer public {
        BentoMasterContract = IBentoBoxV1(BENTOBOX_MASTER_CONTRACT_ADDRESS);
        BentoMasterContract.registerProtocol();
    } 


    function setAsApprovedMasterContractByUser () public {
        BentoMasterContract.setMasterContractApproval(
        msg.sender, //user
        address(this), //master contract - 
        true //isApproved
        // uint8 v,
        // bytes32 r,
        // bytes32 s
    );
    }

    function deposit(amount_) {
        token_ = IERC20(USDC_ADDRESS); //or is it ERC20(USDC_ADDRESS)?

        BentoMasterContract.deposit(
        token_, //IERC20 token_ what is this? USDC contract address? no, I think it's the instantiation of an ERC20...
        msg.sender, //from
        address(this), //to
        amount_, //10USDC?
        uint256 share //leave blank I think...
    ) external payable returns (uint256 amountOut, uint256 shareOut);
    }

function transfer(){
    // I could maybe just do a transfer from my one account to my other account? But this won't let me swap...
    BentoMasterContract.transfer(
        IERC20 token,
        address from,
        address to,
        uint256 share
        );
    }

function rebalanceCoins()  {
    //I would have to do a swap here - do I just do a normal sushiswap swap?
    }


}

// File @sushiswap/bentobox-sdk/contracts/IBentoBoxV1.sol@v1.0.1
// License-Identifier: MIT

interface IBentoBoxV1 {
    event LogDeploy(address indexed masterContract, bytes data, address indexed cloneAddress);
    event LogDeposit(address indexed token, address indexed from, address indexed to, uint256 amount, uint256 share);
    event LogFlashLoan(address indexed borrower, address indexed token, uint256 amount, uint256 feeAmount, address indexed receiver);
    event LogRegisterProtocol(address indexed protocol);
    event LogSetMasterContractApproval(address indexed masterContract, address indexed user, bool approved);
    event LogStrategyDivest(address indexed token, uint256 amount);
    event LogStrategyInvest(address indexed token, uint256 amount);
    event LogStrategyLoss(address indexed token, uint256 amount);
    event LogStrategyProfit(address indexed token, uint256 amount);
    event LogStrategyQueued(address indexed token, address indexed strategy);
    event LogStrategySet(address indexed token, address indexed strategy);
    event LogStrategyTargetPercentage(address indexed token, uint256 targetPercentage);
    event LogTransfer(address indexed token, address indexed from, address indexed to, uint256 share);
    event LogWhiteListMasterContract(address indexed masterContract, bool approved);
    event LogWithdraw(address indexed token, address indexed from, address indexed to, uint256 amount, uint256 share);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function balanceOf(IERC20, address) external view returns (uint256);

    function batch(bytes[] calldata calls, bool revertOnFail) external payable returns (bool[] memory successes, bytes[] memory results);

    function batchFlashLoan(
        IBatchFlashBorrower borrower,
        address[] calldata receivers,
        IERC20[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata data
    ) external;

    function claimOwnership() external;

    function deploy(
        address masterContract,
        bytes calldata data,
        bool useCreate2
    ) external payable;

    function deposit(
        IERC20 token_,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external payable returns (uint256 amountOut, uint256 shareOut);

    function flashLoan(
        IFlashBorrower borrower,
        address receiver,
        IERC20 token,
        uint256 amount,
        bytes calldata data
    ) external;

    function harvest(
        IERC20 token,
        bool balance,
        uint256 maxChangeAmount
    ) external;

    function masterContractApproved(address, address) external view returns (bool);

    function masterContractOf(address) external view returns (address);

    function nonces(address) external view returns (uint256);

    function owner() external view returns (address);

    function pendingOwner() external view returns (address);

    function pendingStrategy(IERC20) external view returns (IStrategy);

    function permitToken(
        IERC20 token,
        address from,
        address to,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function registerProtocol() external;

    function setMasterContractApproval(
        address user,
        address masterContract,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function setStrategy(IERC20 token, IStrategy newStrategy) external;

    function setStrategyTargetPercentage(IERC20 token, uint64 targetPercentage_) external;

    function strategy(IERC20) external view returns (IStrategy);

    function strategyData(IERC20)
        external
        view
        returns (
            uint64 strategyStartDate,
            uint64 targetPercentage,
            uint128 balance
        );

    function toAmount(
        IERC20 token,
        uint256 share,
        bool roundUp
    ) external view returns (uint256 amount);

    function toShare(
        IERC20 token,
        uint256 amount,
        bool roundUp
    ) external view returns (uint256 share);

    function totals(IERC20) external view returns (Rebase memory totals_);

    function transfer(
        IERC20 token,
        address from,
        address to,
        uint256 share
    ) external;

    function transferMultiple(
        IERC20 token,
        address from,
        address[] calldata tos,
        uint256[] calldata shares
    ) external;

    function transferOwnership(
        address newOwner,
        bool direct,
        bool renounce
    ) external;

    function whitelistMasterContract(address masterContract, bool approved) external;

    function whitelistedMasterContracts(address) external view returns (bool);

    function withdraw(
        IERC20 token_,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external returns (uint256 amountOut, uint256 shareOut);
}