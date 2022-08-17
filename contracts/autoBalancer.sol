pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
//import statements go here
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "./interfaces/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
// KeeperCompatible.sol imports the functions from both ./KeeperBase.sol and
// ./interfaces/KeeperCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

contract autoBalancer is KeeperCompatibleInterface {
    address public constant USDC_ADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    
    address public constant WMATIC_ADDRESS = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant LINK_ADDRESS = 0xb0897686c545045aFc77CF20eC7A532E3120E0F1;
    address public constant WETH_ADDRESS = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address public constant WBTC_ADDRESS = 0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6;

    address public constant MATIC_USD_ORACLE = 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0;
    address public constant BTC_USD_ORACLE = 0xc907E116054Ad103354f2D350FD2514433D57F6f;
    address public constant ETH_USD_ORACLE = 0xF9680D99D6C9589e2a93a78A04A279e509205945;
    address public constant LINK_USD_ORACLE = 0xd9FFdb71EbE7496cC440152d43986Aae0AB76665;

    address[] public USDCToWMATICPath = [USDC_ADDRESS, WMATIC_ADDRESS];
    address[] public USDCToLINKPath = [USDC_ADDRESS, LINK_ADDRESS];
    address[] public USDCToWETHPath = [USDC_ADDRESS, WETH_ADDRESS];
    address[] public USDCToWBTCPath = [USDC_ADDRESS, WBTC_ADDRESS];

    address[] public WMATICToUSDCPath = [WMATIC_ADDRESS, USDC_ADDRESS];
    address[] public LINKToUSDCPath = [LINK_ADDRESS, USDC_ADDRESS];
    address[] public WETHToUSDCPath = [WETH_ADDRESS, USDC_ADDRESS];
    address[] public WBTCToUSDCPath = [WBTC_ADDRESS, USDC_ADDRESS];

    address public constant QUICKSWAP_ROUTER = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff;
    
    uint256 public totalNumberOfShares;
    uint256 public lastTimeStamp;
    uint256 public interval;
    uint256 public counter;

    mapping(address => uint256) public userNumberOfShares; 

    IUniswapV2Router02 public quickSwapRouter = IUniswapV2Router02(QUICKSWAP_ROUTER);

    struct Coin {
        string symbol;
        address tokenAddress;
        address oracleAddress;
        // uint256 decimals;
        int256 balance;
        int256 usd_balance;
        int256 diff_from_average;
        int256 usd_exchange_rate;
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice(address _oracle_address) public view returns (int) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = AggregatorV3Interface(_oracle_address).latestRoundData();
        return price;
    }

    function checkUpkeep(bytes calldata /* checkData */) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
        // this is where I need to do off chain calcs to be fed into the rebalance
        Coin[] memory array_coins = new Coin[](4);
    
        Coin memory wmatic;
        wmatic.tokenAddress = WMATIC_ADDRESS;
        wmatic.oracleAddress = MATIC_USD_ORACLE;
        Coin memory link;
        link.tokenAddress = LINK_ADDRESS;
        link.oracleAddress = LINK_USD_ORACLE;
        Coin memory wbtc;
        wbtc.tokenAddress = WBTC_ADDRESS;
        wbtc.oracleAddress = BTC_USD_ORACLE;
        Coin memory weth;
        weth.tokenAddress = WETH_ADDRESS;
        weth.oracleAddress = ETH_USD_ORACLE;

        array_coins[0] = wmatic;
        array_coins[1] = link;
        array_coins[2] = wbtc;
        array_coins[3] = weth;
        
        int256 total_in_usd = 0;
        int no_of_assets = int256(array_coins.length);

        for (uint i = 0; i < array_coins.length; i++) {
            IERC20 coin_instance = IERC20(array_coins[i].tokenAddress);
            array_coins[i].balance = int256(coin_instance.balanceOf(address(this)));
            array_coins[i].usd_exchange_rate = getLatestPrice(array_coins[i].oracleAddress);
            // array_coins[i].decimals = getDecimals(array_coins[i].address);
            array_coins[i].usd_balance = array_coins[i].balance * array_coins[i].usd_exchange_rate / (10 ** 8); //do I need to reintroduce decimals here?
            total_in_usd += array_coins[i].usd_balance;
        }

        int256 target_per_asset = total_in_usd / no_of_assets;

        for (uint i = 0; i < array_coins.length; i++) {
            array_coins[i].diff_from_average = array_coins[i].usd_balance - target_per_asset;
        }

        // Coin memory max_coin = find_max(array_coins);
        int256 maxDiff; // default 0, the lowest value of `uint256`
        uint8 maxCoin_index;
        for (uint8 i = 0; i < array_coins.length; i++) {
            if (array_coins[i].diff_from_average > maxDiff) {
                maxCoin_index = i;
            }
        }
        // Coin memory min_coin = find_min(array_coins);
        int256 minDiff = type(int256).max; // the highest value of int256
        uint8 minCoin_index;
        for (uint8 i = 0; i < array_coins.length; i++) {
            if (array_coins[i].diff_from_average < minDiff) {
                minCoin_index = i;
            }
        }

        address[] memory path1 = new address[](2);
        path1[0] = array_coins[maxCoin_index].tokenAddress;
        path1[1] = array_coins[minCoin_index].tokenAddress;
        int256 amount1;
        if (array_coins[maxCoin_index].diff_from_average > abs(array_coins[minCoin_index].diff_from_average)) {
            amount1 = abs(array_coins[minCoin_index].diff_from_average);
            amount1 = amount1 * (10 ** 8) / array_coins[minCoin_index].usd_exchange_rate;
        } else {
            amount1 = array_coins[maxCoin_index].diff_from_average;
            amount1 = amount1 * (10 ** 8) / array_coins[maxCoin_index].usd_exchange_rate;
        }

        performData = abi.encode(path1, amount1); //, path2, amount2, path3, amount3
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
        return (upkeepNeeded, performData);
    }

    function performUpkeep(bytes calldata performData) external override {
        //We highly recommend revalidating the upkeep in the performUpkeep function
        if ((block.timestamp - lastTimeStamp) > interval ) {
            lastTimeStamp = block.timestamp;
            counter = counter + 1;
            // this is where I actually do the rebalance on chain
            address[] memory path1 = new address[](2);
            uint256 amount1;
            (path1, amount1)= abi.decode(performData, (address[], uint256)); //, path2, amount2, path3, amount3
            swap(amount1, uint256(0), path1, address(this), 99999999999);
            }
            // The performData is generated by the Keeper's call to your checkUpkeep function
    }

    function find_max(Coin[] memory coin_array) internal pure returns (Coin memory maxCoin) {
                require(coin_array.length > 0); // throw an exception if the condition is not met
                int256 maxDiff; // default 0, the lowest value of `uint256`

                for (uint256 i = 0; i < coin_array.length; i++) {
                    if (coin_array[i].diff_from_average > maxDiff) {
                        maxCoin = coin_array[i];
                    }
                }
                return maxCoin;
            }

    function find_min(Coin[] memory coin_array) internal pure returns (Coin memory minCoin) {
                require(coin_array.length > 0); // throw an exception if the condition is not met
                int256 minDiff = type(int256).max; // default 0, the lowest value of `uint256`

                for (uint256 i = 0; i < coin_array.length; i++) {
                    if (coin_array[i].diff_from_average < minDiff) {
                        minCoin = coin_array[i];
                    }
                }
                return minCoin;
            }

    function abs(int x) private pure returns (int) {
        return x >= 0 ? x : -x;
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

    function depositUserFunds (uint256 amount_) public  {
        IERC20(USDC_ADDRESS).transferFrom(msg.sender, address(this), amount_);

        uint256 WMATIC_balanceInUSD = getUSDTokenBalanceOf(WMATIC_ADDRESS, MATIC_USD_ORACLE, 18);
        uint256 LINK_balanceInUSD = getUSDTokenBalanceOf(LINK_ADDRESS, LINK_USD_ORACLE, 18);
        uint256 WETH_balanceInUSD = getUSDTokenBalanceOf(WETH_ADDRESS, ETH_USD_ORACLE, 18);
        uint256 WBTC_balanceInUSD = getUSDTokenBalanceOf(WBTC_ADDRESS, BTC_USD_ORACLE, 8);

        uint256 Total_in_USD = WMATIC_balanceInUSD + LINK_balanceInUSD + WETH_balanceInUSD + WBTC_balanceInUSD;
        
        approve_spending(USDC_ADDRESS, QUICKSWAP_ROUTER, amount_);

        if (Total_in_USD > 0) {
            swapProportionately(WMATIC_balanceInUSD, LINK_balanceInUSD, WETH_balanceInUSD, WBTC_balanceInUSD, Total_in_USD, amount_);
        } else {
            swapIntoFourEqualParts(amount_);
        }
        
        if (Total_in_USD > 0) {
            updateSharesOnDeposit(msg.sender, Total_in_USD, amount_);
        } else {
            setSharesFirstTime(msg.sender);
        }
    }

    function getUSDTokenBalanceOf(address token_address, address oracle_address, uint256 token_decimals) public view returns (uint256) {
        // uint256 token_decimals = ERC20(token_address).decimals();
        return tokenBalanceOf(token_address, address(this))
         * (uint256(getLatestPrice(oracle_address)))
         / (10**(token_decimals+2));
    }

    function swapProportionately(uint256 WMATIC_amount, uint256 LINK_amount, uint256 WETH_amount, uint256 WBTC_amount, uint256 totalUSDAmount, uint256 depositAmount) public {
        uint256 WMATIC_share = WMATIC_amount * (depositAmount) / (totalUSDAmount); 
        uint256 LINK_share = LINK_amount * (depositAmount) / (totalUSDAmount);
        uint256 WETH_share = WETH_amount * (depositAmount) / (totalUSDAmount);
        uint256 WBTC_share = WBTC_amount * (depositAmount) / (totalUSDAmount);

        swap(WMATIC_share, uint256(0), USDCToWMATICPath, address(this), 99999999999);
        swap(LINK_share, uint256(0), USDCToLINKPath, address(this), 99999999999);
        swap(WETH_share, uint256(0), USDCToWETHPath, address(this), 99999999999);
        swap(WBTC_share, uint256(0), USDCToWBTCPath, address(this), 99999999999);
    }

    function swapIntoFourEqualParts(uint256 amount) public {
        swap(amount / 4, uint256(0), USDCToWMATICPath, address(this), 99999999999);
        swap(amount / 4, uint256(0), USDCToLINKPath, address(this), 99999999999);
        swap(amount / 4, uint256(0), USDCToWETHPath, address(this), 99999999999);
        swap(amount / 4, uint256(0), USDCToWBTCPath, address(this), 99999999999);
    }

    function setSharesFirstTime(address user) public {
        userNumberOfShares[user] = 100000000;
        totalNumberOfShares = userNumberOfShares[user];
    }

    function updateSharesOnDeposit(address user, uint256 total_in_USD, uint256 deposit_amount) public { //make this ownable - only contract itself can update this?
        uint256 newSharesForUser = deposit_amount * (totalNumberOfShares) / (total_in_USD);
        totalNumberOfShares = totalNumberOfShares + newSharesForUser;
        if (userNumberOfShares[user] > 0) {
            userNumberOfShares[user] = userNumberOfShares[user] + newSharesForUser;
        } else {
            userNumberOfShares[user] = newSharesForUser;
        }
    }

    function withdrawUserFunds(address user) public {
        //do I need an approval here?

        uint256 WMATIC_amount = userNumberOfShares[user] * (tokenBalanceOf(WMATIC_ADDRESS, address(this))) / (totalNumberOfShares);
        uint256 LINK_amount = userNumberOfShares[user] * (tokenBalanceOf(LINK_ADDRESS, address(this))) / (totalNumberOfShares);
        uint256 WETH_amount = userNumberOfShares[user] * (tokenBalanceOf(WETH_ADDRESS, address(this))) / (totalNumberOfShares);
        uint256 WBTC_amount = userNumberOfShares[user] * (tokenBalanceOf(WBTC_ADDRESS, address(this))) / (totalNumberOfShares);

        approve_spending(WMATIC_ADDRESS, QUICKSWAP_ROUTER, WMATIC_amount);
        approve_spending(LINK_ADDRESS, QUICKSWAP_ROUTER, LINK_amount);
        approve_spending(WETH_ADDRESS, QUICKSWAP_ROUTER, WETH_amount);
        approve_spending(WBTC_ADDRESS, QUICKSWAP_ROUTER, WBTC_amount);

        swapBackToUSDC(WMATIC_ADDRESS, WMATIC_amount);
        swapBackToUSDC(LINK_ADDRESS, LINK_amount);
        swapBackToUSDC(WETH_ADDRESS, WETH_amount);
        swapBackToUSDC(WBTC_ADDRESS, WBTC_amount);

        // approveSpendingWholeBalance(USDC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS);

        uint256 USDC_amount = tokenBalanceOf(USDC_ADDRESS, address(this));
        withdraw(USDC_amount, USDC_ADDRESS, user);

        updateSharesOnWithdrawal(user);
    }

    function withdraw(uint256 amount_, address token_address, address address_to) public  {
        IERC20 token_ = IERC20(token_address); //is this right?

        token_.transfer(address_to, amount_);
    }

    function approveSpendingWholeBalance(address _token, address _spender) public {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        approve_spending(_token, _spender, tokenBalance);
    }

    function swapBackToUSDC(address _token, uint256 _amount) public {
        address[] memory path = new address[](2);
        path[0] = _token;
        path[1] = USDC_ADDRESS;
        swap(_amount, uint256(0), path, address(this), 99999999999);
    }
    
    // function withdraw_matic(uint256 amount_) public payable {
    //     transfer(msg.sender, amount_);
    // }

    function tokenBalanceOf(address token_address, address user_address) public view returns (uint256 token_balance) {
        IERC20 _token = IERC20(token_address);
        token_balance = _token.balanceOf(user_address);
        return token_balance;
    }
    
    function swap(uint256 _amountIn, uint256 _amountOutMin, address[] memory _path, address _acct, uint256 _deadline) public {
        
       quickSwapRouter.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _acct,
            _deadline);
        }
        
    }
    

    