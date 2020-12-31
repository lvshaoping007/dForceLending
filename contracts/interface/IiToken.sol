//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IInterestRateModelInterface.sol";
import "./IControllerInterface.sol";

interface IiToken {
    function isiToken() external returns (bool);

    //----------------------------------
    //********** User Events ***********
    //----------------------------------

    event AccrueInterest(
        uint256 cash,
        uint256 interestAccumulated,
        uint256 borrowIndex,
        uint256 totalBorrows
    );

    event Mint(
        address spender,
        address recipent,
        uint256 mintAmount,
        uint256 mintTokens
    );

    event Redeem(
        address from,
        address recipient,
        uint256 redeemDLTokenAmount,
        uint256 redeemUnderlyingAmount
    );

    event Borrow(
        address borrower,
        uint256 borrowAmount,
        uint256 accountBorrows,
        uint256 totalBorrows
    );

    event RepayBorrow(
        address payer,
        address borrower,
        uint256 repayAmount,
        uint256 accountBorrows,
        uint256 totalBorrows
    );

    event LiquidateBorrow(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        address iTokenCollateral,
        uint256 seizeTokens
    );

    event Flashloan(
        address loaner,
        uint256 loanAmount,
        uint256 flashloanFee,
        uint256 protocolFee,
        uint256 timestamp
    );

    //----------------------------------
    //********** Owner Events **********
    //----------------------------------

    event NewReserveRatio(uint256 oldReserveRatio, uint256 newReserveRatio);
    event NewFlashloanFeeRatio(
        uint256 oldFlashloanFeeRatio,
        uint256 newFlashloanFeeRatio
    );
    event NewProtocolFeeRatio(
        uint256 oldProtocolFeeRatio,
        uint256 newProtocolFeeRatio
    );

    event NewInterestRateModel(
        IInterestRateModelInterface oldInterestRateModel,
        IInterestRateModelInterface newInterestRateModel
    );

    event NewController(
        IControllerInterface oldController,
        IControllerInterface newController
    );

    event ReservesWithdrawn(
        address admin,
        uint256 amount,
        uint256 newTotalReserves
    );

    //----------------------------------
    //********* User Interface *********
    //----------------------------------
    function mint(address recipient, uint256 mintAmount)
        external
        returns (bool);

    function redeem(address from, uint256 redeemTokens) external returns (bool);

    function redeemUnderlying(address from, uint256 redeemAmount)
        external
        returns (bool);

    function borrow(uint256 borrowAmount) external returns (bool);

    function repayBorrow(uint256 repayAmount) external returns (bool);

    function repayBorrowBehalf(address borrower, uint256 repayAmount)
        external
        returns (bool);

    function liquidateBorrow(
        address borrower,
        uint256 repayAmount,
        address iTokenCollateral
    ) external returns (bool);

    function flashloan(
        address recipient,
        uint256 loanAmount,
        bytes memory data
    ) external returns (bool);

    function seize(
        address _liquidator,
        address _borrower,
        uint256 _seizeTokens
    ) external returns (bool);

    function updateInterest() external returns (bool);

    function controller() external view returns (address);

    function exchangeRateCurrent() external returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function totalBorrowsCurrent() external returns (uint256);

    function totalBorrows() external view returns (uint256);

    function borrowBalanceCurrent(address _user) external returns (uint256);

    function borrowBalanceStored(address _user) external view returns (uint256);

    function borrowIndex() external view returns (uint256);

    function getAccountSnapshot(address _account)
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        );

    function borrowRatePerBlock() external view returns (uint256);

    function supplyRatePerBlock() external view returns (uint256);

    function getCash() external view returns (uint256);

    //----------------------------------
    //********* Owner Actions **********
    //----------------------------------

    function _setNewReserveRatio(uint256 _newReserveRatio) external;

    function _setNewFlashloanFeeRatio(uint256 _newFlashloanFeeRatio) external;

    function _setNewProtocolFeeRatio(uint256 _newProtocolFeeRatio) external;

    function _setController(IControllerInterface _newController) external;

    function _setInterestRateModel(
        IInterestRateModelInterface _newInterestRateModel
    ) external;

    function _withdrawReserves(uint256 _withdrawAmount) external;
}
