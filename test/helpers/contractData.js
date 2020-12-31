const { expect } = require("chai");
const { ethers } = require("hardhat");

const BASE = ethers.utils.parseEther("1");

// Get current contract data.
async function checkContractData(data) {
  let isBefore = data.isBefore;
  let iToken = data.iToken;
  let underlying = data.underlying;
  let spender = data.from;
  let recipient = data.to;
  if (isBefore) {
    await iToken.exchangeRateCurrent();
    let beforeTotalSupply = await iToken.totalSupply();
    let beforeCash = await iToken.getCash();
    let beforeTotalBorrow = await iToken.totalBorrows();
    let beforeSpenderUnderlyingBalance = await underlying.balanceOf(spender);
    let beforeSpenderiTokenBalance = await iToken.balanceOf(spender);
    let beforeRecipientUnderlyingBalance = await underlying.balanceOf(
      recipient
    );
    let beforeRecipientiTokenBalance = await iToken.balanceOf(recipient);
    let beforeBorrowBalance = await iToken.borrowBalanceStored(spender);
    let beforeBehalfBorrowBalance = await iToken.borrowBalanceStored(
      recipient
    );
    return {
      beforeTotalSupply: beforeTotalSupply,
      beforeCash: beforeCash,
      beforeTotalBorrow: beforeTotalBorrow,
      beforeSpenderUnderlyingBalance: beforeSpenderUnderlyingBalance,
      beforeSpenderiTokenBalance: beforeSpenderiTokenBalance,
      beforeRecipientUnderlyingBalance: beforeRecipientUnderlyingBalance,
      beforeRecipientiTokenBalance: beforeRecipientiTokenBalance,
      beforeBorrowBalance: beforeBorrowBalance,
      beforeBehalfBorrowBalance: beforeBehalfBorrowBalance,
      iToken: iToken,
      from: spender,
      to: recipient,
      underlying: underlying,
    };
  } else if (data.functionName == "redeem") {
    let exchangeRate = await iToken.exchangeRateStored();
    let afterTotalSupply = await iToken.totalSupply();
    let afterCash = await iToken.getCash();
    let afterSpenderiTokenBalance = await iToken.balanceOf(spender);
    let afterRecipientUnderlyingBalance = await underlying.balanceOf(recipient);

    let underlyingChanged = Number(
      data.redeemAmount.mul(exchangeRate).div(BASE).toString()
    );
    let delta = 10000;

    expect(
      data.beforeSpenderiTokenBalance.sub(afterSpenderiTokenBalance)
    ).to.equal(data.redeemAmount);

    expect(
      Number(
        afterRecipientUnderlyingBalance
          .sub(data.beforeRecipientUnderlyingBalance)
          .toString()
      )
    ).to.closeTo(underlyingChanged, delta);

    expect(data.beforeTotalSupply.sub(afterTotalSupply)).to.equal(
      data.redeemAmount
    );

    expect(Number(data.beforeCash.sub(afterCash).toString())).to.closeTo(
      underlyingChanged,
      delta
    );
  } else if (data.functionName == "redeemUnderlying") {
    let exchangeRate = await iToken.exchangeRateStored();
    let afterTotalSupply = await iToken.totalSupply();
    let afterCash = await iToken.getCash();
    let afterSpenderiTokenBalance = await iToken.balanceOf(spender);
    let afterRecipientUnderlyingBalance = await underlying.balanceOf(recipient);

    let iTokenChanged = Number(
      data.redeemAmount.mul(BASE).div(exchangeRate).toString()
    );
    let delta = 10000;

    expect(
      afterRecipientUnderlyingBalance.sub(data.beforeRecipientUnderlyingBalance)
    ).to.equal(data.redeemAmount);
    expect(
      Number(
        data.beforeSpenderiTokenBalance
          .sub(afterSpenderiTokenBalance)
          .toString()
      )
    ).to.closeTo(iTokenChanged, delta);

    expect(data.beforeCash.sub(afterCash)).to.equal(data.redeemAmount);
    expect(data.beforeTotalSupply.sub(afterTotalSupply)).to.equal(
      data.redeemAmount.mul(BASE).add(exchangeRate.sub(1)).div(exchangeRate)
    );
  } else if (data.functionName == "borrow") {
    let afterTotalBorrow = await iToken.totalBorrows();
    let afterSpenderUnderlyingBalance = await underlying.balanceOf(spender);
    let afterBorrowBalance = await iToken.borrowBalanceStored(spender);

    expect(afterBorrowBalance.sub(data.beforeBorrowBalance)).to.equal(
      data.borrowAmount
    );
    expect(afterTotalBorrow.sub(data.beforeTotalBorrow)).to.equal(
      data.borrowAmount
    );
    expect(
      afterSpenderUnderlyingBalance.sub(data.beforeSpenderUnderlyingBalance)
    ).to.equal(data.borrowAmount);
  } else if (data.functionName == "repay") {
    let afterTotalBorrow = await iToken.totalBorrows();
    let afterSpenderUnderlyingBalance = await underlying.balanceOf(spender);
    let afterBorrowBalance = await iToken.borrowBalanceStored(recipient);

    let borrowChanged = Number(
      data.beforeBehalfBorrowBalance.sub(afterBorrowBalance).toString()
    );
    let delta = 10000;

    // expect(
    //   Number((data.beforeTotalBorrow.sub(afterTotalBorrow)).toString())
    // ).to.closeTo(Number((data.repayAmount).toString()), delta);
    expect(
      data.beforeSpenderUnderlyingBalance.sub(afterSpenderUnderlyingBalance)
    ).to.equal(data.repayAmount);
    // expect(
    //   borrowChanged
    // ).to.closeTo(Number((data.repayAmount).toString()), delta);
  }
}

module.exports = {
  checkContractData,
};
