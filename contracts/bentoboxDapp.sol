pragma solidity ^0.6.12;

//import statements go here
import "./interfaces/IBentoBoxV1.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Router01.sol";

contract bentoboxDapp {
    address public constant BENTOBOX_MASTER_CONTRACT_ADDRESS = 0x0319000133d3AdA02600f0875d2cf03D442C3367;
    address public constant USDC_ADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant WETH_ADDRESS = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address public constant SUSHISWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    
    uint256 public totalNumberOfShares;
    mapping(address => uint256) public userNumberOfShares; 

    IBentoBoxV1 public BentoMasterContract = IBentoBoxV1(BENTOBOX_MASTER_CONTRACT_ADDRESS);
    IUniswapV2Router02 public sushiSwapRouter = IUniswapV2Router02(SUSHISWAP_ROUTER);
    //more variables here
    // constructor() autoBalancer public {
    //     // BentoMasterContract = IBentoBoxV1(BENTOBOX_MASTER_CONTRACT_ADDRESS);
    //     // BentoMasterContract.registerProtocol();
    // } 
    
    function registerProtocol () public {
        BentoMasterContract.registerProtocol();
    }
    
    function updateSharesOnDeposit(address user, uint256 newSharesToBeAdded) public { //make this ownable - only contract itself can update this?
        if (userNumberOfShares[user] ==0) {
            userNumberOfShares[user] = newSharesToBeAdded; //use SafeMath here?
        } else {
            userNumberOfShares[user] += newSharesToBeAdded;
        }
        totalNumberOfShares += newSharesToBeAdded;
    }

    function updateSharesOnWithdrawal(address user) public { //make this ownable - only contract itself can update this?
        require (userNumberOfShares[user] > 0, "Error - This user has no shares");
        totalNumberOfShares -= userNumberOfShares[user];
        userNumberOfShares[user] = 0;
    }

    function getUserShares(address user) public view returns (uint256 userShares) {
        return userNumberOfShares[user];
    }

    function getTotalShares() public view returns (uint256 totalNumberOfShares) { //do I need this, if it's a public variable should be easy to get?
        return totalNumberOfShares;
    }

    function approve_spending (address token_address, address spender_address, uint256 amount_to_approve) public {
            IERC20(token_address).approve(spender_address, amount_to_approve);
    }
    
     receive() external payable {
        uint256 value = msg.value; 
    }

    function depositToBento (uint256 amount_, address token_address, address address_from, address address_to) public  {
        IERC20 token_ = IERC20(token_address);

        BentoMasterContract.deposit(
        token_, //IERC20 token_ what is this? USDC contract address? no, I think it's the instantiation of an ERC20...
        address_from, //from - this would be from the dapp
        address_to, //to - this would be to bentobox?
        amount_, //10USDC?
        0 //leave blank I think...
        );
    }
    
    function depositTokenBalanceToBento (address token_address, address address_from, address address_to) public  {
        IERC20 token_ = IERC20(token_address);
        uint256 tokenBalance = token_.balanceOf(address_from);
        
        BentoMasterContract.deposit(
        token_, //IERC20 token_ the instantiation of an ERC20...
        address_from, //from - this would be from the dapp or the user
        address_to, //to - this would be to bentobox
        tokenBalance, //10USDC?
        0 //leave blank I think...
        );
    }
    
    function withdraw(uint256 amount_, address token_address, address address_from, address address_to) public  {
        IERC20 token_ = IERC20(token_address); //is this right?

        BentoMasterContract.withdraw(
        token_, 
        address_from, //address from - the bentobox master contract address??
        address_to, //address to - the address of the dapp itself
        amount_, //leave blank?
        0 //uint256 share
    );
    }
    
    function withdraw_matic(uint256 amount_) public {
        msg.sender.transfer(amount_);
    }
    
    function transfer(address token_address, uint256 _share, address address_from, address address_to) public  {
        IERC20 _token = IERC20(token_address);
    // do I call this on bentomastercontract? I think so. But then it's the app making the call.
    BentoMasterContract.transfer(
        _token, //IERC20 token
        address_from, //address from - a specified user address
        address_to, //address to - the dapp itself receives the funds
        _share //uint256 share
        );
    }

    function BentoTokenBalanceOf(address token_address, address user_address) public view returns (uint256 token_balance) {
        IERC20 _token = IERC20(token_address);
        token_balance = BentoMasterContract.balanceOf(_token, user_address);
        return token_balance;
    }
    
    function swap(uint256 _amountIn, uint256 _amountOutMin, address[] calldata _path, address _acct, uint256 _deadline) public {
        
       sushiSwapRouter.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _acct,
            _deadline);
        }
    }
    

    