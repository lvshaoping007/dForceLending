// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {_setPendingOwner} and {_acceptOwner}.
 */
contract Ownable {
    /**
     * @dev Returns the address of the current owner.
     */
    address payable public owner;

    /**
     * @dev Returns the address of the current pending owner.
     */
    address payable public pendingOwner;

    event NewOwner(address indexed previousOwner, address indexed newOwner);
    event NewPendingOwner(
        address indexed oldPendingOwner,
        address indexed newPendingOwner
    );

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner == msg.sender, "onlyOwner: caller is not the owner");
        _;
    }

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function __Ownable_init() internal {
        owner = msg.sender;
        emit NewOwner(address(0), msg.sender);
    }

    /**
     * @dev Transfer contract control to a new owner. The newPendingOwner must call `_acceptOwner` to finish the transfer.
     * @param newPendingOwner New pending owner.
     *
     * TODO: Maybe the new pending owenr should not be the current owner at the same time.
     */
    function _setPendingOwner(address payable newPendingOwner)
        external
        onlyOwner
    {
        require(
            newPendingOwner != address(0),
            "_setPendingOwner: New owenr can not be zero address!"
        );
        require(
            newPendingOwner != pendingOwner,
            "_setPendingOwner: This owner has been set!"
        );

        // Gets current owner.
        address oldPendingOwner = pendingOwner;

        // Sets new pending owner.
        pendingOwner = newPendingOwner;

        emit NewPendingOwner(oldPendingOwner, newPendingOwner);
    }

    /**
     * @dev Accepts the admin rights, but only for pendingOwenr.
     */
    function _acceptOwner() external {
        require(
            msg.sender == pendingOwner,
            "_acceptOwner: Only for pending owner!"
        );

        // Gets current values for events.
        address oldOwner = owner;
        address oldPendingOwner = pendingOwner;

        // Set the new contract owner.
        owner = pendingOwner;

        // Clear the pendingOwner.
        pendingOwner = address(0);

        emit NewOwner(oldOwner, owner);
        emit NewPendingOwner(oldPendingOwner, pendingOwner);
    }
}

library SafeMath {
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x, "ds-math-add-overflow");
    }

    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x, "ds-math-sub-underflow");
    }

    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-mul-overflow");
    }

    function div(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y > 0, "ds-math-div-overflow");
        z = x / y;
    }
}

/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see {ERC20Detailed}.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external;

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external;

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external;

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    // This function is not a standard ERC20 interface, just for compitable with market.
    function decimals() external view returns (uint8);
}

interface IPriceOracle {
    /**
     * @notice Get the underlying price of a iToken asset
     * @param iToken The iToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18).
     *  Zero means the price is unavailable.
     */
    function getUnderlyingPrice(address iToken)
        external
        view
        returns (uint256);
}

interface IController {
    function getAlliTokens() external view returns (address[] memory);

    function getEnteredMarkets(address _account)
        external
        view
        returns (address[] memory);

    function hasEnteredMarket(address _account, address _iToken)
        external
        view
        returns (bool);

    function hasBorrowed(address _account, address _iToken)
        external
        view
        returns (bool);

    function priceOracle() external view returns (address);

    function markets(address _asset)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        );

    function calcAccountEquity(address _account)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        );

    function beforeRedeem(
        address iToken,
        address redeemer,
        uint256 redeemAmount
    ) external returns (bool);
}

interface IiToken {
    function decimals() external view returns (uint8);
    function balanceOf(address _account) external view returns (uint256);
    function totalSupply() external view returns (uint256);

    function isSupported() external view returns (bool);

    function underlying() external view returns (address);

    function getCash() external view returns (uint256);

    function supplyRatePerBlock() external view returns (uint256);

    function borrowRatePerBlock() external view returns (uint256);

    function balanceOfUnderlying(address _account) external returns (uint256);

    function borrowBalanceStored(address _account) external returns (uint256);
    function borrowBalanceCurrent(address _account) external returns (uint256);

    function totalBorrowsCurrent() external returns (uint256);
    function totalBorrows() external returns (uint256);

    function exchangeRateStored() external returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
}

contract LendingData is Ownable {
    using SafeMath for uint256;
    uint256 constant BASE = 1e18;

    uint256 constant blocksPerDay = 4 * 60 * 24;
    uint256 constant daysPerYear = 365;

    IController public controller;
    address public priceToken;
    address public iETH;

    constructor(
        address _controller,
        address _priceToken,
        address _iETH
    ) public {
        __Ownable_init();
        controller = IController(_controller);
        priceToken = _priceToken;
        iETH = _iETH;
    }

    function setController(IController _newController) external onlyOwner {
        // Sets to new controller.
        controller = _newController;
    }

    function setPriceToken(address _newAsset) external onlyOwner {
        priceToken = _newAsset;
    }

    function setiETH(address _newiETH) external onlyOwner {
        iETH = _newiETH;
    }

    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x.mul(y).div(BASE);
    }

    function rdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x.mul(BASE).div(y);
    }

    function rpow(
        uint256 x,
        uint256 n,
        uint256 base
    ) public pure returns (uint256 z) {
        assembly {
            switch x
                case 0 {
                    switch n
                        case 0 {
                            z := base
                        }
                        default {
                            z := 0
                        }
                }
                default {
                    switch mod(n, 2)
                        case 0 {
                            z := base
                        }
                        default {
                            z := x
                        }
                    let half := div(base, 2) // for rounding.

                    for {
                        n := div(n, 2)
                    } n {
                        n := div(n, 2)
                    } {
                        let xx := mul(x, x)
                        if iszero(eq(div(xx, x), x)) {
                            revert(0, 0)
                        }
                        let xxRound := add(xx, half)
                        if lt(xxRound, xx) {
                            revert(0, 0)
                        }
                        x := div(xxRound, base)
                        if mod(n, 2) {
                            let zx := mul(z, x)
                            if and(
                                iszero(iszero(x)),
                                iszero(eq(div(zx, x), z))
                            ) {
                                revert(0, 0)
                            }
                            let zxRound := add(zx, half)
                            if lt(zxRound, zx) {
                                revert(0, 0)
                            }
                            z := div(zxRound, base)
                        }
                    }
                }
        }
    }

    struct totalValueLocalVars {
        address[] iTokens;
        IController controller;
        IPriceOracle priceOracle;
        uint256 assetPrice;
        uint256 collateralFactor;
        uint256 supplyValue;
        uint256 collateralVaule;
        uint256 borrowValue;
        uint256 collateraRatio;
    }

    function getAccountTotalValue(address _account)
        external
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        totalValueLocalVars memory _var;
        _var.controller = controller;
        _var.iTokens = _var.controller.getAlliTokens();
        _var.priceOracle = IPriceOracle(_var.controller.priceOracle());
        for (uint256 i = 0; i < _var.iTokens.length; i++) {
            _var.assetPrice = _var.priceOracle.getUnderlyingPrice(
                _var.iTokens[i]
            );
            _var.supplyValue = _var.supplyValue.add(
                IiToken(_var.iTokens[i]).balanceOfUnderlying(_account).mul(
                    _var.assetPrice
                )
            );
            (_var.collateralFactor, , ,) = controller.markets(_var.iTokens[i]);
            if (_var.controller.hasEnteredMarket(_account, _var.iTokens[i]) && _var.collateralFactor > 0)
                _var.collateralVaule = _var.collateralVaule.add(
                    IiToken(_var.iTokens[i])
                        .balanceOfUnderlying(_account)
                        .mul(_var.assetPrice)
                );

            if (_var.controller.hasBorrowed(_account, _var.iTokens[i]))
                _var.borrowValue = _var.borrowValue.add(
                    IiToken(_var.iTokens[i])
                        .borrowBalanceCurrent(_account)
                        .mul(_var.assetPrice)
                );
        }
        _var.assetPrice = _var.priceOracle.getUnderlyingPrice(priceToken);
        if (_var.assetPrice == 0) return (0, 0, 0, 0);

        _var.supplyValue = _var.supplyValue.div(_var.assetPrice);
        _var.collateralVaule = _var.collateralVaule.div(_var.assetPrice);
        _var.borrowValue = _var.borrowValue.div(_var.assetPrice);
        return (
            _var.supplyValue,
            _var.collateralVaule,
            _var.borrowValue,
            _var.borrowValue == 0
                ? 0
                : rdiv(_var.collateralVaule, _var.borrowValue)
        );
    }

    struct supplyTokenLocalVars {
        address[] iTokens;
        address[] supplyTokens;
        uint256[] amounts;
        uint8[] decimals;
        uint256 supplyUnderlyingBalance;
        uint256 length;
        uint256 index;
    }

    function getAccountSupplyTokens(address _account)
        public
        returns (
            address[] memory,
            uint256[] memory,
            uint8[] memory
        )
    {
        supplyTokenLocalVars memory _var;
        _var.iTokens = controller.getAlliTokens();
        for (uint256 i = 0; i < _var.iTokens.length; i++)
            if (IiToken(_var.iTokens[i]).balanceOfUnderlying(_account) > 0)
                _var.length++;

        _var.supplyTokens = new address[](_var.length);
        _var.amounts = new uint256[](_var.length);
        _var.decimals = new uint8[](_var.length);
        // if (_var.length == 0)
        //     return (_var.supplyTokens, _var.amounts, _var.decimals);

        for (uint256 i = 0; i < _var.iTokens.length; i++) {
            _var.supplyUnderlyingBalance = IiToken(_var.iTokens[i])
                .balanceOfUnderlying(_account);
            if (_var.supplyUnderlyingBalance > 0) {
                _var.supplyTokens[_var.index] = _var.iTokens[i];
                _var.amounts[_var.index] = _var.supplyUnderlyingBalance;
                _var.decimals[_var.index] = IiToken(_var.iTokens[i])
                    .decimals();
                _var.index++;
            }
        }
        return (_var.supplyTokens, _var.amounts, _var.decimals);
    }

    struct borrowTokenLocalVars {
        address[] iTokens;
        address[] borrowTokens;
        uint256[] amounts;
        uint8[] decimals;
        uint256 borrowBalance;
        uint256 length;
        uint256 index;
    }

    function getAccountBorrowTokens(address _account)
        public
        returns (
            address[] memory,
            uint256[] memory,
            uint8[] memory
        )
    {
        borrowTokenLocalVars memory _var;
        _var.iTokens = controller.getAlliTokens();
        for (uint256 i = 0; i < _var.iTokens.length; i++)
            if (IiToken(_var.iTokens[i]).borrowBalanceCurrent(_account) > 0)
                _var.length++;

        _var.borrowTokens = new address[](_var.length);
        _var.amounts = new uint256[](_var.length);
        _var.decimals = new uint8[](_var.length);
        // if (_var.length == 0)
        //     return (_var.borrowTokens, _var.amounts, _var.decimals);

        for (uint256 i = 0; i < _var.iTokens.length; i++) {
            _var.borrowBalance = IiToken(_var.iTokens[i])
                .borrowBalanceCurrent(_account);
            if (_var.borrowBalance > 0) {
                _var.borrowTokens[_var.index] = _var.iTokens[i];
                _var.amounts[_var.index] = _var.borrowBalance;
                _var.decimals[_var.index] = IiToken(_var.iTokens[i])
                    .decimals();
                _var.index++;
            }
        }
        return (_var.borrowTokens, _var.amounts, _var.decimals);
    }

    struct tokenLocalVars {
        address[] supplyTokens;
        uint256[] supplyAmounts;
        uint8[] supplyDecimals;
        address[] borrowTokens;
        uint256[] borrowAmounts;
        uint8[] borrowDecimals;
    }

    function getAccountTokens(address _account)
        external
        returns (
            address[] memory,
            uint256[] memory,
            uint8[] memory,
            address[] memory,
            uint256[] memory,
            uint8[] memory
        )
    {
        tokenLocalVars memory _var;
        (
            _var.supplyTokens,
            _var.supplyAmounts,
            _var.supplyDecimals
        ) = getAccountSupplyTokens(_account);
        (
            _var.borrowTokens,
            _var.borrowAmounts,
            _var.borrowDecimals
        ) = getAccountBorrowTokens(_account);
        return (
            _var.supplyTokens,
            _var.supplyAmounts,
            _var.supplyDecimals,
            _var.borrowTokens,
            _var.borrowAmounts,
            _var.borrowDecimals
        );
    }

    function getAssetUSDPrice(address _asset) public view returns (uint256) {
        uint256 _USDPrice =
            IPriceOracle(controller.priceOracle()).getUnderlyingPrice(
                priceToken
            );
        if (_USDPrice == 0) return 0;

        uint256 _assetUSDPrice =
            rdiv(
                IPriceOracle(controller.priceOracle()).getUnderlyingPrice(
                    _asset
                ),
                _USDPrice
            );
        uint8 _assetDecimals = IiToken(_asset).decimals();
        uint8 _priceTokenDecimals = IiToken(priceToken).decimals();

        return
            _assetDecimals > _priceTokenDecimals
                ? _assetUSDPrice.mul(
                    10**(uint256(_assetDecimals - _priceTokenDecimals))
                )
                : _assetUSDPrice.div(
                    10**(uint256(_priceTokenDecimals - _assetDecimals))
                );
    }

    function getSupplyTokenData(address _asset)
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        if (IiToken(_asset).isSupported()) {
            (uint256 _collateralFactor, , , ) = controller.markets(_asset);
            uint256 _supplyRatePerBlock =
                IiToken(_asset).totalSupply() == 0
                    ? 0
                    : IiToken(_asset).supplyRatePerBlock();
            return (
                rpow(
                    (_supplyRatePerBlock * blocksPerDay + BASE),
                    daysPerYear,
                    BASE
                ) - BASE,
                _collateralFactor,
                getAssetUSDPrice(_asset)
            );
        }
        return (0, 0, 0);
    }

    function getAccountSupplyInfo(address _asset, address _account, uint256 _safeMaxFactor)
        public
        returns (uint256, bool, bool)
    {
        bool _asCollateral = controller.hasEnteredMarket(_account, _asset);
        bool _executed;
        if (!_asCollateral) {
            (uint256 _collateralFactor, , ,) = controller.markets(_asset);
            _executed = _collateralFactor > 0 ? true : false;
        } else {
            _executed = canAccountRemoveFromCollateral(_asset, _account, _safeMaxFactor);
        }
        return (
            rmul(getBalance(_asset, _account), getAssetUSDPrice(_asset)),
            _asCollateral,
            _executed
        );
    }

    struct removeFromCollateralLocalVars {
        uint256 assetPrice;
        uint256 collateralFactor;
        uint256 accountEuqity;
        uint256 sumCollateral;
        uint256 sumBorrowed;
        uint256 safeAvailableToken;
    }

    function canAccountRemoveFromCollateral(address _asset, address _account, uint256 _safeMaxFactor)
        public
        returns (bool)
    {
        if (getAccountBorrowStatus(_account)) {

            removeFromCollateralLocalVars memory _var;

            (_var.collateralFactor, , ,) = controller.markets(_asset);
            (_var.accountEuqity, , _var.sumCollateral, _var.sumBorrowed) = controller.calcAccountEquity(_account);
            if (_var.collateralFactor == 0 && _var.accountEuqity > 0)
                return true;

            _var.assetPrice = IPriceOracle(controller.priceOracle()).getUnderlyingPrice(_asset);
            if (_var.assetPrice == 0 || _var.collateralFactor == 0 || _var.accountEuqity == 0)
                return false;

            _var.safeAvailableToken = _var.sumCollateral > rdiv(_var.sumBorrowed, _safeMaxFactor) ? _var.sumCollateral.sub(rdiv(_var.sumBorrowed, _safeMaxFactor)) : 0;
            _var.safeAvailableToken = rdiv(_var.safeAvailableToken.div(_var.assetPrice), _var.collateralFactor);

            return _var.safeAvailableToken >= IiToken(_asset).balanceOfUnderlying(_account);
        }

        return true;
    }

    struct supplyLocalVars {
        uint256 cash;
        uint256 assetPrice;
        uint256 collateralFactor;
        uint256 supplyCapacity;
        uint256 totalUnderlying;
        uint256 accountEuqity;
        uint256 sumCollateral;
        uint256 sumBorrowed;
        uint256 availableToken;
        uint256 safeAvailableToken;
        uint256 suppliedBalance;
        uint256 accountBalance;
        uint256 maxMintAmount;
        uint256 availableToWithdraw;
        uint256 safeAvailableToWithdraw;
        uint256 iTokenBalance;
        uint8 decimals;
    }

    function getAccountSupplyData(
        address _asset,
        address _account,
        uint256 _safeMaxFactor
    )
        public
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint8
        )
    {
        supplyLocalVars memory _var;
        _var.suppliedBalance = IiToken(_asset).balanceOfUnderlying(_account);
        _var.accountBalance = getBalance(_asset, _account);
        _var.iTokenBalance = IiToken(_asset).balanceOf(_account);
        _var.decimals = IiToken(_asset).decimals();

        _var.maxMintAmount = 0;
        (_var.collateralFactor, , , _var.supplyCapacity) = controller.markets(_asset);
        _var.totalUnderlying = rmul(IiToken(_asset).totalSupply(), IiToken(_asset).exchangeRateStored());
        if (_var.supplyCapacity > _var.totalUnderlying) {
            _var.maxMintAmount = _var.supplyCapacity.sub(_var.totalUnderlying);
            _var.maxMintAmount = _var.maxMintAmount > _var.accountBalance ? _var.accountBalance : _var.maxMintAmount;
        }

        _var.cash = IiToken(_asset).getCash();
        _var.availableToWithdraw = _var.cash > _var.suppliedBalance ? _var.suppliedBalance : _var.cash;
        _var.safeAvailableToWithdraw = _var.availableToWithdraw;

        if (controller.hasEnteredMarket(_account, _asset) && getAccountBorrowStatus(_account)) {
            (_var.accountEuqity, , _var.sumCollateral, _var.sumBorrowed) = controller.calcAccountEquity(_account);
            if (_var.collateralFactor == 0 && _var.accountEuqity > 0)
                return (
                    _var.suppliedBalance,
                    _var.accountBalance,
                    _var.maxMintAmount,
                    _var.availableToWithdraw,
                    _var.safeAvailableToWithdraw,
                    _var.iTokenBalance,
                    _var.decimals
                );

            _var.assetPrice = IPriceOracle(controller.priceOracle()).getUnderlyingPrice(_asset);
            if (_var.assetPrice == 0 || _var.collateralFactor == 0 || _var.accountEuqity == 0)
                return (
                    _var.suppliedBalance,
                    _var.accountBalance,
                    _var.maxMintAmount,
                    0,
                    0,
                    0,
                    _var.decimals
                );

            _var.availableToken = rdiv(_var.accountEuqity.div(_var.assetPrice), _var.collateralFactor);
            _var.availableToWithdraw = _var.availableToWithdraw > _var.availableToken ? _var.availableToken : _var.availableToWithdraw;

            _var.safeAvailableToken = _var.sumCollateral > rdiv(_var.sumBorrowed, _safeMaxFactor) ? _var.sumCollateral.sub(rdiv(_var.sumBorrowed, _safeMaxFactor)) : 0;
            _var.safeAvailableToken = rdiv(_var.safeAvailableToken.div(_var.assetPrice), _var.collateralFactor);
            _var.safeAvailableToWithdraw = _var.safeAvailableToWithdraw > _var.safeAvailableToken ? _var.safeAvailableToken : _var.safeAvailableToWithdraw;

            _var.safeAvailableToWithdraw = _var.safeAvailableToWithdraw > _var.availableToWithdraw ? _var.availableToWithdraw : _var.safeAvailableToWithdraw;
        }

        return (
            _var.suppliedBalance,
            _var.accountBalance,
            _var.maxMintAmount,
            _var.availableToWithdraw,
            _var.safeAvailableToWithdraw,
            _var.iTokenBalance,
            _var.decimals
        );
    }

    struct borrowValueLocalVars {
        address[] iTokens;
        IController controller;
        IPriceOracle priceOracle;
        uint256 assetPrice;
        uint256 borrowValue;
    }

    function getAccountBorrowValue(address _account) public returns (uint256) {
        borrowValueLocalVars memory _var;
        _var.controller = controller;
        _var.iTokens = _var.controller.getAlliTokens();
        _var.priceOracle = IPriceOracle(_var.controller.priceOracle());
        for (uint256 i = 0; i < _var.iTokens.length; i++) {
            _var.assetPrice = _var.priceOracle.getUnderlyingPrice(
                _var.iTokens[i]
            );
            if (_var.controller.hasBorrowed(_account, _var.iTokens[i]))
                _var.borrowValue = _var.borrowValue.add(
                    IiToken(_var.iTokens[i])
                        .borrowBalanceCurrent(_account)
                        .mul(_var.assetPrice)
                );
        }
        return _var.borrowValue;
    }

    function getAccountBorrowStatus(address _account) public returns (bool) {
        address[] memory _iTokens = controller.getAlliTokens();
        for (uint256 i = 0; i < _iTokens.length; i++)
            if (IiToken(_iTokens[i]).borrowBalanceStored(_account) > 0)
                return true;

        return false;
    }

    function getBorrowTokenData(address _asset)
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        if (IiToken(_asset).isSupported()) {
            (, uint256 _borrowFactor, , ) = controller.markets(_asset);
            return (
                IiToken(_asset).getCash(),
                _borrowFactor,
                rpow(
                    (IiToken(_asset).borrowRatePerBlock() *
                        blocksPerDay +
                        BASE),
                    daysPerYear,
                    BASE
                ) - BASE,
                getAssetUSDPrice(_asset)
            );
        }
        return (0, 0, 0, 0);
    }

    function getAccountBorrowInfo(
        address _asset,
        address _account,
        uint256 _safeMaxFactor
    )
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 _assetPrice =
            IPriceOracle(controller.priceOracle()).getUnderlyingPrice(_asset);
        if (_assetPrice == 0) return (0, 0, 0);

        uint256 _tokenValue =
            rmul(getBalance(_asset, _account), getAssetUSDPrice(_asset));
        (uint256 _accountEuqity, , ,) = controller.calcAccountEquity(_account);
        (, uint256 _borrowFactor, , ) = controller.markets(_asset);
        uint256 _maxBorrowValue =
            rmul(
                _accountEuqity.mul(_borrowFactor).div(_assetPrice) / BASE,
                getAssetUSDPrice(_asset)
            );

        return (
            _maxBorrowValue,
            rmul(_maxBorrowValue, _safeMaxFactor),
            _tokenValue
        );
    }

    struct borrowLocalVars {
        uint256 cash;
        uint256 assetPrice;
        uint256 borrowCapacity;
        uint256 accountEuqity;
        uint256 sumCollateral;
        uint256 sumBorrowed;
        uint256 borrowFactor;
        uint256 totalBorrows;
        uint256 canBorrows;
        uint256 borrowedBalance;
        uint256 availableToBorrow;
        uint256 safeAvailableToBorrow;
        uint256 accountBalance;
        uint256 maxRepay;
    }

    function getAccountBorrowData(
        address _asset,
        address _account,
        uint256 _safeMaxFactor
    )
        public
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint8
        )
    {
        borrowLocalVars memory _var;
        _var.borrowedBalance = IiToken(_asset).borrowBalanceCurrent(_account);
        _var.accountBalance = getBalance(_asset, _account);
        _var.maxRepay = _var.borrowedBalance > _var.accountBalance
            ? _var.accountBalance
            : _var.borrowedBalance;

        _var.assetPrice = IPriceOracle(controller.priceOracle()).getUnderlyingPrice(_asset);
        (, _var.borrowFactor, _var.borrowCapacity, ) = controller.markets(_asset);
        if (_var.assetPrice == 0 || _var.borrowCapacity == 0 || _var.borrowFactor == 0)
            return (
                _var.borrowedBalance,
                0,
                0,
                _var.accountBalance,
                _var.maxRepay,
                IiToken(_asset).decimals()
            );

        (_var.accountEuqity, , _var.sumCollateral, _var.sumBorrowed) = controller.calcAccountEquity(_account);
        _var.availableToBorrow =
            _var.accountEuqity.mul(_var.borrowFactor).div(_var.assetPrice).div(BASE);

        _var.safeAvailableToBorrow = rmul(_var.sumCollateral, _safeMaxFactor) > _var.sumBorrowed ? rmul(_var.sumCollateral, _safeMaxFactor).sub(_var.sumBorrowed) : 0;
        _var.safeAvailableToBorrow = _var.safeAvailableToBorrow.mul(_var.borrowFactor).div(_var.assetPrice).div(BASE);

        _var.cash = IiToken(_asset).getCash();
        _var.availableToBorrow = _var.availableToBorrow > _var.cash
            ? _var.cash
            : _var.availableToBorrow;

        _var.safeAvailableToBorrow = _var.safeAvailableToBorrow > _var.cash
            ? _var.cash
            : _var.safeAvailableToBorrow;

        _var.totalBorrows = IiToken(_asset).totalBorrowsCurrent();
        _var.canBorrows = _var.totalBorrows >= _var.borrowCapacity ? 0 : _var.borrowCapacity.sub(_var.totalBorrows);

        _var.availableToBorrow = _var.availableToBorrow >
                _var.canBorrows
                ? _var.canBorrows
                : _var.availableToBorrow;

        _var.safeAvailableToBorrow = _var.safeAvailableToBorrow >
                _var.canBorrows
                ? _var.canBorrows
                : _var.safeAvailableToBorrow;

        return (
            _var.borrowedBalance,
            _var.availableToBorrow,
            _var.safeAvailableToBorrow,
            _var.accountBalance,
            _var.maxRepay,
            IiToken(_asset).decimals()
        );
    }

    function getBalance(address _asset, address _account)
        public
        view
        returns (uint256)
    {
        return
            _asset == iETH
                ? _account.balance
                : IiToken(IiToken(_asset).underlying()).balanceOf(_account);
    }
}
