pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
//import statements go here
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
// KeeperCompatible.sol imports the functions from both ./KeeperBase.sol and
// ./interfaces/KeeperCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

contract autoBalancer is ERC20, KeeperCompatibleInterface {
    address public constant USDC_ADDRESS =
        0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;

    address public constant WMATIC_ADDRESS =
        0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant SAND_ADDRESS =
        0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683;
    address public constant WETH_ADDRESS =
        0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address public constant WBTC_ADDRESS =
        0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6;

    address public constant MATIC_USD_ORACLE =
        0xAB594600376Ec9fD91F8e885dADF0CE036862dE0;
    address public constant BTC_USD_ORACLE =
        0xc907E116054Ad103354f2D350FD2514433D57F6f;
    address public constant ETH_USD_ORACLE =
        0xF9680D99D6C9589e2a93a78A04A279e509205945;
    address public constant SAND_USD_ORACLE =
        0x3D49406EDd4D52Fb7FFd25485f32E073b529C924;

    address[] public USDCToWMATICPath = [USDC_ADDRESS, WMATIC_ADDRESS];
    address[] public USDCToSANDPath = [USDC_ADDRESS, SAND_ADDRESS];
    address[] public USDCToWETHPath = [USDC_ADDRESS, WETH_ADDRESS];
    address[] public USDCToWBTCPath = [USDC_ADDRESS, WBTC_ADDRESS];

    address[] public WMATICToUSDCPath = [WMATIC_ADDRESS, USDC_ADDRESS];
    address[] public SANDToUSDCPath = [SAND_ADDRESS, USDC_ADDRESS];
    address[] public WETHToUSDCPath = [WETH_ADDRESS, USDC_ADDRESS];
    address[] public WBTCToUSDCPath = [WBTC_ADDRESS, USDC_ADDRESS];

    address public constant QUICKSWAP_ROUTER =
        0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff;

    uint256 public totalNumberOfShares;

    uint256 public lastTimeStamp;
    uint256 public interval = 3600;

    mapping(address => uint256) public userNumberOfShares;

    IUniswapV2Router02 public quickSwapRouter =
        IUniswapV2Router02(QUICKSWAP_ROUTER);

    struct Coin {
        string symbol;
        address tokenAddress;
        address oracleAddress;
        uint256 decimals;
        uint256 balance;
        uint256 usd_balance;
        int256 diff_from_average;
        uint256 usd_exchange_rate;
    }

    constructor() ERC20("autoBalancer", "ABA") {}

    function setInterval(uint256 new_interval) public {
        interval = new_interval;
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice(address _oracle_address)
        public
        view
        returns (int256)
    {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = AggregatorV3Interface(_oracle_address).latestRoundData();
        return price;
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
        //we create the coin array and coin objects
        Coin[] memory array_coins = new Coin[](4);

        Coin memory wmatic;
        wmatic.tokenAddress = WMATIC_ADDRESS;
        wmatic.oracleAddress = MATIC_USD_ORACLE;
        Coin memory sand;
        sand.tokenAddress = SAND_ADDRESS;
        sand.oracleAddress = SAND_USD_ORACLE;
        Coin memory wbtc;
        wbtc.tokenAddress = WBTC_ADDRESS;
        wbtc.oracleAddress = BTC_USD_ORACLE;
        Coin memory weth;
        weth.tokenAddress = WETH_ADDRESS;
        weth.oracleAddress = ETH_USD_ORACLE;

        array_coins[0] = wmatic;
        array_coins[1] = sand;
        array_coins[2] = wbtc;
        array_coins[3] = weth;

        uint256 total_in_usd = 0;

        for (uint8 i = 0; i < array_coins.length; i++) {
            ERC20 coin_instance = ERC20(array_coins[i].tokenAddress);
            array_coins[i].balance = coin_instance.balanceOf(address(this));
            array_coins[i].usd_exchange_rate = uint256(
                getLatestPrice(array_coins[i].oracleAddress)
            );
            array_coins[i].decimals = uint256(coin_instance.decimals());
            uint256 decimal_conversion = 18 - array_coins[i].decimals;
            array_coins[i].usd_balance =
                (uint256(
                    array_coins[i].balance * array_coins[i].usd_exchange_rate
                ) * (10**decimal_conversion)) /
                (10**8);
            total_in_usd += array_coins[i].usd_balance;
        }

        for (uint8 i = 0; i < array_coins.length; i++) {
            array_coins[i].diff_from_average =
                int256(array_coins[i].usd_balance) -
                int256(total_in_usd / (array_coins.length));
        }

        int256 comparison_variable; // default 0, the lowest value of `uint256`
        uint8 maxCoin_index;
        uint8 minCoin_index;
        int256[] memory amounts = new int256[](array_coins.length - 1);
        address[] memory paths = new address[](2 * (array_coins.length - 1)); //this will take all n-1 paths eventually

        for (uint8 j = 0; j < array_coins.length - 1; j++) {
            // Coin memory max_coin = find_max(array_coins);
            for (uint8 i = 0; i < array_coins.length; i++) {
                if (
                    array_coins[i].diff_from_average != 0 &&
                    array_coins[i].diff_from_average > comparison_variable
                ) {
                    maxCoin_index = i;
                    comparison_variable = array_coins[i].diff_from_average;
                }
            }
            // Coin memory min_coin = find_min(array_coins);
            comparison_variable = type(int256).max; // the highest value of int256
            for (uint8 i = 0; i < array_coins.length; i++) {
                if (
                    array_coins[i].diff_from_average != 0 &&
                    array_coins[i].diff_from_average < comparison_variable
                ) {
                    minCoin_index = i;
                    comparison_variable = array_coins[i].diff_from_average;
                }
            }
            // we calculate the amount to be swapped, depending on which coin is further from average
            if (
                array_coins[maxCoin_index].diff_from_average >
                abs(array_coins[minCoin_index].diff_from_average) //maxCoin is further from average than minCoin
            ) {
                // so the amount we swap is minCoin's diff_from_average
                amounts[j] = abs(array_coins[minCoin_index].diff_from_average);
                // so we decrease maxCoin's average by that amount
                array_coins[maxCoin_index].diff_from_average -= amounts[j];
                // and set minCoin's diff to zero, so that it will be excluded from future loops
                array_coins[minCoin_index].diff_from_average = 0;
                // then we convert amounts[j] from usd to maxCoin currency (because we're always swapping from maxCoin)
                amounts[j] =
                    (amounts[j] * int256(10**8)) /
                    int256(array_coins[maxCoin_index].usd_exchange_rate) /
                    int256(
                        10**(18 - uint256(array_coins[maxCoin_index].decimals))
                    );
            } else {
                amounts[j] = abs(array_coins[maxCoin_index].diff_from_average);
                array_coins[minCoin_index].diff_from_average += amounts[j];
                array_coins[maxCoin_index].diff_from_average = 0;

                amounts[j] =
                    (amounts[j] * int256(10**8)) /
                    int256(array_coins[maxCoin_index].usd_exchange_rate) /
                    int256(
                        10**(18 - uint256(array_coins[maxCoin_index].decimals))
                    );
            }

            //we determine the paths that the swap will take (beginning and end)
            paths[2 * j] = array_coins[maxCoin_index].tokenAddress;
            paths[2 * j + 1] = array_coins[minCoin_index].tokenAddress;
        }

        performData = abi.encode(paths, amounts);
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
        return (upkeepNeeded, performData);
    }

    function performUpkeep(bytes calldata performData) external override {
        //We highly recommend revalidating the upkeep in the performUpkeep function
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            address[] memory paths;
            uint256[] memory amounts;
            address[] memory path_short = new address[](2);
            address[] memory path_long = new address[](3);

            (paths, amounts) = abi.decode(performData, (address[], uint256[]));
            for (uint8 i = 0; i < amounts.length; i++) {
                approve_spending(paths[2 * i], QUICKSWAP_ROUTER, amounts[i]);
                if (
                    paths[2 * i] == WMATIC_ADDRESS ||
                    paths[2 * i + 1] == WMATIC_ADDRESS
                ) {
                    path_short[0] = paths[2 * i];
                    path_short[1] = paths[2 * i + 1];
                    swap(
                        amounts[i],
                        uint256(0),
                        path_short,
                        address(this),
                        99999999999
                    );
                } else {
                    path_long[0] = paths[2 * i];
                    path_long[1] = WMATIC_ADDRESS;
                    path_long[2] = paths[2 * i + 1];
                    swap(
                        amounts[i],
                        uint256(0),
                        path_long,
                        address(this),
                        99999999999
                    );
                }
            }
        }
        // The performData is generated by the Keeper's call to your checkUpkeep function
    }

    function find_max(Coin[] memory coin_array)
        internal
        pure
        returns (Coin memory maxCoin)
    {
        require(coin_array.length > 0); // throw an exception if the condition is not met
        int256 maxDiff; // default 0, the lowest value of `uint256`

        for (uint256 i = 0; i < coin_array.length; i++) {
            if (coin_array[i].diff_from_average > maxDiff) {
                maxCoin = coin_array[i];
            }
        }
        return maxCoin;
    }

    function find_min(Coin[] memory coin_array)
        internal
        pure
        returns (Coin memory minCoin)
    {
        require(coin_array.length > 0); // throw an exception if the condition is not met
        int256 minDiff = type(int256).max; // default 0, the lowest value of `uint256`

        for (uint256 i = 0; i < coin_array.length; i++) {
            if (coin_array[i].diff_from_average < minDiff) {
                minCoin = coin_array[i];
            }
        }
        return minCoin;
    }

    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }

    function updateSharesOnWithdrawal(address user) public {
        //make this ownable - only contract itself can update this?
        _burn(user, balanceOf(user));
    }

    function getUserShares(address user)
        public
        view
        returns (uint256 userShares)
    {
        return userNumberOfShares[user];
    }

    function approve_spending(
        address token_address,
        address spender_address,
        uint256 amount_to_approve
    ) public {
        ERC20(token_address).approve(spender_address, amount_to_approve);
    }

    receive() external payable {}

    function depositUserFunds(uint256 amount_) public {
        ERC20(USDC_ADDRESS).transferFrom(msg.sender, address(this), amount_);

        uint256 WMATIC_balanceInUSD = getUSDTokenBalanceOf(
            WMATIC_ADDRESS,
            MATIC_USD_ORACLE,
            18
        );
        uint256 SAND_balanceInUSD = getUSDTokenBalanceOf(
            SAND_ADDRESS,
            SAND_USD_ORACLE,
            18
        );
        uint256 WETH_balanceInUSD = getUSDTokenBalanceOf(
            WETH_ADDRESS,
            ETH_USD_ORACLE,
            18
        );
        uint256 WBTC_balanceInUSD = getUSDTokenBalanceOf(
            WBTC_ADDRESS,
            BTC_USD_ORACLE,
            8
        );

        uint256 Total_in_USD = WMATIC_balanceInUSD +
            SAND_balanceInUSD +
            WETH_balanceInUSD +
            WBTC_balanceInUSD;

        approve_spending(USDC_ADDRESS, QUICKSWAP_ROUTER, amount_);

        if (Total_in_USD > 0) {
            swapProportionately(
                WMATIC_balanceInUSD,
                SAND_balanceInUSD,
                WETH_balanceInUSD,
                WBTC_balanceInUSD,
                Total_in_USD,
                amount_
            );
        } else {
            swapIntoFourEqualParts(amount_);
        }

        if (Total_in_USD > 0) {
            updateSharesOnDeposit(msg.sender, Total_in_USD, amount_);
        } else {
            setSharesFirstTime(msg.sender, amount_);
        }
    }

    function getUSDTokenBalanceOf(
        address token_address,
        address oracle_address,
        uint256 token_decimals
    ) public view returns (uint256) {
        // uint256 token_decimals = ERC20(token_address).decimals();
        return
            (tokenBalanceOf(token_address, address(this)) *
                (uint256(getLatestPrice(oracle_address)))) /
            (10**(token_decimals + 2));
    }

    function swapProportionately(
        uint256 WMATIC_amount,
        uint256 SAND_amount,
        uint256 WETH_amount,
        uint256 WBTC_amount,
        uint256 totalUSDAmount,
        uint256 depositAmount
    ) public {
        uint256 WMATIC_share = (WMATIC_amount * (depositAmount)) /
            (totalUSDAmount);
        uint256 SAND_share = (SAND_amount * (depositAmount)) / (totalUSDAmount);
        uint256 WETH_share = (WETH_amount * (depositAmount)) / (totalUSDAmount);
        uint256 WBTC_share = (WBTC_amount * (depositAmount)) / (totalUSDAmount);

        swap(
            WMATIC_share,
            uint256(0),
            USDCToWMATICPath,
            address(this),
            99999999999
        );
        swap(
            SAND_share,
            uint256(0),
            USDCToSANDPath,
            address(this),
            99999999999
        );
        swap(
            WETH_share,
            uint256(0),
            USDCToWETHPath,
            address(this),
            99999999999
        );
        swap(
            WBTC_share,
            uint256(0),
            USDCToWBTCPath,
            address(this),
            99999999999
        );
    }

    function swapIntoFourEqualParts(uint256 amount) public {
        swap(
            amount / 4,
            uint256(0),
            USDCToWMATICPath,
            address(this),
            99999999999
        );
        swap(
            amount / 4,
            uint256(0),
            USDCToSANDPath,
            address(this),
            99999999999
        );
        swap(
            amount / 4,
            uint256(0),
            USDCToWETHPath,
            address(this),
            99999999999
        );
        swap(
            amount / 4,
            uint256(0),
            USDCToWBTCPath,
            address(this),
            99999999999
        );
    }

    function setSharesFirstTime(address user, uint256 deposit_amount) public {
        _mint(user, deposit_amount);
    }

    function updateSharesOnDeposit(
        address user,
        uint256 total_in_USD,
        uint256 deposit_amount
    ) public {
        //make this ownable - only contract itself can update this?
        uint256 newSharesForUser = (deposit_amount * (totalSupply())) /
            (total_in_USD);
        _mint(user, newSharesForUser);
    }

    function withdrawUserFunds(address user) public {
        //do I need an approval here?

        uint256 WMATIC_amount = (userNumberOfShares[user] *
            (tokenBalanceOf(WMATIC_ADDRESS, address(this)))) /
            (totalNumberOfShares);
        uint256 SAND_amount = (userNumberOfShares[user] *
            (tokenBalanceOf(SAND_ADDRESS, address(this)))) /
            (totalNumberOfShares);
        uint256 WETH_amount = (userNumberOfShares[user] *
            (tokenBalanceOf(WETH_ADDRESS, address(this)))) /
            (totalNumberOfShares);
        uint256 WBTC_amount = (userNumberOfShares[user] *
            (tokenBalanceOf(WBTC_ADDRESS, address(this)))) /
            (totalNumberOfShares);

        approve_spending(WMATIC_ADDRESS, QUICKSWAP_ROUTER, WMATIC_amount);
        approve_spending(SAND_ADDRESS, QUICKSWAP_ROUTER, SAND_amount);
        approve_spending(WETH_ADDRESS, QUICKSWAP_ROUTER, WETH_amount);
        approve_spending(WBTC_ADDRESS, QUICKSWAP_ROUTER, WBTC_amount);

        swapBackToUSDC(WMATIC_ADDRESS, WMATIC_amount);
        swapBackToUSDC(SAND_ADDRESS, SAND_amount);
        swapBackToUSDC(WETH_ADDRESS, WETH_amount);
        swapBackToUSDC(WBTC_ADDRESS, WBTC_amount);

        // approveSpendingWholeBalance(USDC_ADDRESS, BENTOBOX_MASTER_CONTRACT_ADDRESS);

        uint256 USDC_amount = tokenBalanceOf(USDC_ADDRESS, address(this));
        withdraw(USDC_amount, USDC_ADDRESS, user);

        updateSharesOnWithdrawal(user);
    }

    function withdraw(
        uint256 amount_,
        address token_address,
        address address_to
    ) public {
        ERC20 token_ = ERC20(token_address); //is this right?

        token_.transfer(address_to, amount_);
    }

    function approveSpendingWholeBalance(address _token, address _spender)
        public
    {
        uint256 tokenBalance = ERC20(_token).balanceOf(address(this));
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

    function tokenBalanceOf(address token_address, address user_address)
        public
        view
        returns (uint256 token_balance)
    {
        ERC20 _token = ERC20(token_address);
        token_balance = _token.balanceOf(user_address);
        return token_balance;
    }

    function swap(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] memory _path,
        address _acct,
        uint256 _deadline
    ) public {
        quickSwapRouter.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _acct,
            _deadline
        );
    }

    // function _mint(address account, uint256 amount) internal override {
    //     require(account != address(0), "ERC20: mint to the zero address");

    //     _beforeTokenTransfer(address(0), account, amount);

    //     _totalSupply = _totalSupply.add(amount);
    //     _balances[account] = _balances[account].add(amount);
    //     emit Transfer(address(0), account, amount);
    // }

    // function _burn(address account, uint256 amount) internal override {
    //     require(account != address(0), "ERC20: burn from the zero address");

    //     _beforeTokenTransfer(account, address(0), amount);

    //     _balances[account] = _balances[account].sub(
    //         amount,
    //         "ERC20: burn amount exceeds balance"
    //     );
    //     _totalSupply = _totalSupply.sub(amount);
    //     emit Transfer(account, address(0), amount);
    // }
}
