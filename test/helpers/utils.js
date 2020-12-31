const { expect } = require("chai");
const { utils, BigNumber } = require("ethers");

const BASE = ethers.utils.parseEther("1");

async function verifyOnlyOwner(
  contract,
  method,
  args,
  owner,
  other,
  ownerEvent = "",
  ownerEventArgs = [],
  ownerChecks = async () => {},
  nonownerChecks = async () => {}
) {
  // execute the non-owner case first as it does not change state
  await expect(contract.connect(other)[method](...args)).to.be.revertedWith(
    "onlyOwner: caller is not the owner"
  );

  await nonownerChecks();

  // exxcute the owner call
  if (ownerEvent !== "") {
    await expect(contract.connect(owner)[method](...args))
      .to.emit(contract, ownerEvent)
      .withArgs(...ownerEventArgs);
  } else {
    await contract.connect(owner)[method](...args);
  }

  await ownerChecks();
}

// Convert any raw ether value into wei based on the decimals of the token.
// eg: parseTokenAmount(iToken, 100) => 100 * 10 ** 18
async function parseTokenAmount(token, amount) {
  return utils.parseUnits(amount.toString(), await token.decimals());
}

async function formatTokenAmount(token, amount) {
  return utils.formatUnits(amount, await token.decimals());
}

async function setOraclePrice(oracle, iToken, price) {
  const [owner] = await ethers.getSigners();
  const decimals = await iToken.decimals();
  const name = await iToken.name();

  // All prices are based on ETH
  // Assumes current price is $590, that is 1 ETH = 590 USDC.
  const ethPrice = 590;
  const feedingPrice = utils.parseUnits(
    (price / ethPrice).toString(),
    36 - decimals
  );

  //   console.log(
  //     name,
  //     "current Price: ",
  //     (await oracle.getUnderlyingPrice(iToken.address)).toString()
  //   );

  //   console.log(name, "feedingPrice: ", feedingPrice.toString());

  // Sets the Anchor to allow price set
  await oracle.connect(owner)._setPendingAnchor(iToken.address, feedingPrice);

  // Sets price.
  await oracle.connect(owner).setPrices([iToken.address], [feedingPrice]);

  //   console.log(
  //     name,
  //     "current Price: ",
  //     (await oracle.getUnderlyingPrice(iToken.address)).toString()
  //   );

  return feedingPrice;
}

function verifyAllowError(value0, value1, errorFactor) {
  // For 0 values no error allowed
  if (value0.isZero() || value1.isZero()) {
    expect(value0).to.equal(0);
    expect(value1).to.equal(0);
    return;
  }

  let ratio = parseFloat(
    utils.formatEther(value0.mul(utils.parseEther("1")).div(value1))
  );

  expect(ratio).to.be.closeTo(1.0, errorFactor);
}

// Math function
function rmul(a, b) {
  return a.mul(b).div(BASE);
}

function rdiv(a, b) {
  return a.mul(BASE).div(b);
}

module.exports = {
  verifyOnlyOwner,
  setOraclePrice,
  parseTokenAmount,
  formatTokenAmount,
  verifyAllowError,
  rmul,
  rdiv,
};
