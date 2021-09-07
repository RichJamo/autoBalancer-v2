pragma solidity ^0.6.12;

//import statements go here
import "./interfaces/IBentoBoxV1.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract bentoboxDapp {
    using SafeMath for uint256;

    address public constant BENTOBOX_MASTER_CONTRACT_ADDRESS = 0x0319000133d3AdA02600f0875d2cf03D442C3367;

    address public constant USDC_ADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    
    address public constant WMATIC_ADDRESS = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant SUSHI_ADDRESS = 0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a;
    address public constant WETH_ADDRESS = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address public constant WBTC_ADDRESS = 0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6;

    address public constant MATIC_USD_ORACLE = 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0;
    address public constant BTC_USD_ORACLE = 0xc907E116054Ad103354f2D350FD2514433D57F6f;
    address public constant ETH_USD_ORACLE = 0xF9680D99D6C9589e2a93a78A04A279e509205945;
    address public constant SUSHI_USD_ORACLE = 0x49B0c695039243BBfEb8EcD054EB70061fd54aa0;

    address[] public USDCToWMATICPath = [USDC_ADDRESS, WMATIC_ADDRESS];
    address[] public USDCToSUSHIPath = [USDC_ADDRESS, SUSHI_ADDRESS];
    address[] public USDCToWETHPath = [USDC_ADDRESS, WETH_ADDRESS];
    address[] public USDCToWBTCPath = [USDC_ADDRESS, WBTC_ADDRESS];

    address[] public WMATICToUSDCPath = [WMATIC_ADDRESS, USDC_ADDRESS];
    address[] public SUSHIToUSDCPath = [SUSHI_ADDRESS, USDC_ADDRESS];
    address[] public WETHToUSDCPath = [WETH_ADDRESS, USDC_ADDRESS];
    address[] public WBTCToUSDCPath = [WBTC_ADDRESS, USDC_ADDRESS];

    address public constant SUSHISWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    
    AggregatorV3Interface internal priceFeed;

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
    
    /**
     * Returns the latest price
     */
    function getLatestPrice(address token_address) public returns (int) {
        priceFeed = AggregatorV3Interface(token_address);
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return price;
    }

    function updateSharesOnWithdrawal(address user) public { //make this ownable - only contract itself can update this?
        require (userNumberOfShares[user] > 0, "Error - This user has no shares");
        totalNumberOfShares -= userNumberOfShares[user];
        userNumberOfShares[user] = 0;
    }

    function getUserShares(address user) public view returns (uint256 userShares) {
        return userNumberOfShares[user];
    }

    function approve_spending (address token_address, address spender_address, uint256 amount_to_approve) public {
            IERC20(token_address).approve(spender_address, amount_to_approve);
    }
    
     receive() external payable {
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

    function depositUserFunds (uint256 amount_, address token_address, address address_from, address address_to) public  {
        IERC20 token_ = IERC20(token_address);

        BentoMasterContract.deposit(
        token_, //IERC20 token_ what is this? USDC contract address? no, I think it's the instantiation of an ERC20...
        address_from, //from - this would be from the dapp
        address_to, //to - this would be to bentobox?
        amount_, //10USDC?
        0 //leave blank I think...
        );

        withdraw(amount_, token_address, address(this), address(this));

        approve_spending(USDC_ADDRESS, SUSHISWAP_ROUTER, amount_);

        uint256 WMATIC_balanceInUSD = getUSDBentoTokenBalanceOf(WMATIC_ADDRESS, 18);
        uint256 SUSHI_balanceInUSD = getUSDBentoTokenBalanceOf(SUSHI_ADDRESS, 18);
        uint256 WETH_balanceInUSD = getUSDBentoTokenBalanceOf(WETH_ADDRESS, 18);
        uint256 WBTC_balanceInUSD = getUSDBentoTokenBalanceOf(WBTC_ADDRESS, 8);

        uint256 Total_in_USD = WMATIC_balanceInUSD.add(SUSHI_balanceInUSD).add(WETH_balanceInUSD).add(WBTC_balanceInUSD);
        
        if (Total_in_USD > 0) {
            swapProportionately(WMATIC_balanceInUSD, SUSHI_balanceInUSD, WETH_balanceInUSD, WBTC_balanceInUSD, Total_in_USD, amount_);
        } else {
            swapIntoFourEqualParts(amount_);
        }
        
        depositAllFourTokensBackToBento();

        if (Total_in_USD > 0) {
            updateSharesOnDeposit(address_from, Total_in_USD, amount_);
        } else {
            setSharesFirstTime(address_from);
        }
    }
    function getUSDBentoTokenBalanceOf(address token_address, uint256 token_decimals) public returns (uint256) {
        return BentoTokenBalanceOf(token_address, address(this))
        .mul(uint256(getLatestPrice(token_address)))
        .div(10**(token_decimals+2));
    }

    function swapProportionately(uint256 WMATIC_amount, uint256 SUSHI_amount, uint256 WETH_amount, uint256 WBTC_amount, uint256 totalUSDAmount, uint256 depositAmount) public {
        uint256 WMATIC_share = WMATIC_amount.div(totalUSDAmount).mul(depositAmount); 
        uint256 SUSHI_share = SUSHI_amount.div(totalUSDAmount).mul(depositAmount);
        uint256 WETH_share = WETH_amount.div(totalUSDAmount).mul(depositAmount);
        uint256 WBTC_share = WBTC_amount.div(totalUSDAmount).mul(depositAmount);

        swap(WMATIC_share, uint256(0), USDCToWMATICPath, address(this), uint256(-1));
        swap(SUSHI_share, uint256(0), USDCToSUSHIPath, address(this), uint256(-1));
        swap(WETH_share, uint256(0), USDCToWETHPath, address(this), uint256(-1));
        swap(WBTC_share, uint256(0), USDCToWBTCPath, address(this), uint256(-1));
    }

    function swapIntoFourEqualParts(uint256 amount) public {
        swap(amount.div(4), uint256(0), USDCToWMATICPath, address(this), uint256(-1));
        swap(amount.div(4), uint256(0), USDCToSUSHIPath, address(this), uint256(-1));
        swap(amount.div(4), uint256(0), USDCToWETHPath, address(this), uint256(-1));
        swap(amount.div(4), uint256(0), USDCToWBTCPath, address(this), uint256(-1));
    }

    function depositAllFourTokensBackToBento() public {
        approve_spending(WMATIC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, 9999999999999999999999999);
        depositTokenBalanceToBento(WMATIC_ADDRESS, address(this), address(this));
        approve_spending(SUSHI_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, 9999999999999999999999999);
        depositTokenBalanceToBento(SUSHI_ADDRESS, address(this), address(this));
        approve_spending(WETH_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, 9999999999999999999999999);
        depositTokenBalanceToBento(WETH_ADDRESS, address(this), address(this));
        approve_spending(WBTC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, 9999999999999999999999999);
        depositTokenBalanceToBento(WBTC_ADDRESS, address(this), address(this));
    }

    function setSharesFirstTime(address user) public {
        userNumberOfShares[user] = 100000000;
        totalNumberOfShares = userNumberOfShares[user];
    }

    function updateSharesOnDeposit(address user, uint256 total_in_USD, uint256 deposit_amount) public { //make this ownable - only contract itself can update this?
        uint256 newSharesForUser = deposit_amount.div(total_in_USD).mul(totalNumberOfShares);
        totalNumberOfShares = totalNumberOfShares.add(newSharesForUser);
        if (userNumberOfShares[user] > 0) {
            userNumberOfShares[user] = userNumberOfShares[user].add(newSharesForUser);
        } else {
            userNumberOfShares[user] = newSharesForUser;
        }
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
    function withdrawUserFunds(address user, uint256 WMATIC_amount, uint256 SUSHI_amount,uint256 WETH_amount,uint256 WBTC_amount) public {
        //do I need an approval here?
        withdrawAllFourTokensFromBento(WMATIC_amount, SUSHI_amount, WETH_amount, WBTC_amount);

        approveSpendingWholeBalance(WMATIC_ADDRESS, SUSHISWAP_ROUTER);
        approveSpendingWholeBalance(SUSHI_ADDRESS, SUSHISWAP_ROUTER);
        approveSpendingWholeBalance(WETH_ADDRESS, SUSHISWAP_ROUTER);
        approveSpendingWholeBalance(WBTC_ADDRESS, SUSHISWAP_ROUTER);

        swapWholeBalanceBackToUSDC(WMATIC_ADDRESS);
        swapWholeBalanceBackToUSDC(SUSHI_ADDRESS);
        swapWholeBalanceBackToUSDC(WETH_ADDRESS);
        swapWholeBalanceBackToUSDC(WBTC_ADDRESS);

        approve_spending(USDC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS, 9999999999999999999999999);
        
        depositTokenBalanceToBento(USDC_ADDRESS, address(this), address(this));

        uint256 USDC_amount = BentoTokenBalanceOf(USDC_ADDRESS, address(this));
        withdraw(USDC_amount, USDC_ADDRESS, address(this), user);

        updateSharesOnWithdrawal(user);
    }

    function withdrawAllFourTokensFromBento(uint256 _WMATIC_amount, uint256 _SUSHI_amount, uint256 _WETH_amount, uint256 _WBTC_amount) public {
        withdraw(_WMATIC_amount, WMATIC_ADDRESS, address(this), address(this));
        withdraw(_SUSHI_amount, SUSHI_ADDRESS, address(this), address(this));
        withdraw(_WETH_amount, WETH_ADDRESS, address(this), address(this));
        withdraw(_WBTC_amount, WBTC_ADDRESS, address(this), address(this));
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

    function approveSpendingWholeBalance(address _token, address _spender) public {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        approve_spending(_token, _spender, tokenBalance);
    }

    function swapWholeBalanceBackToUSDC(address _token) public {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        address[] memory path = new address[](2);
        path[0] = _token;
        path[1] = USDC_ADDRESS;
        swap(tokenBalance, uint256(0), path, address(this), uint256(-1));
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
    
    function swap(uint256 _amountIn, uint256 _amountOutMin, address[] memory _path, address _acct, uint256 _deadline) public {
        
       sushiSwapRouter.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _acct,
            _deadline);
        }
    }
    

    