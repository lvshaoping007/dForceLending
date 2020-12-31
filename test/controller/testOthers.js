const { expect } = require("chai");
const { utils } = require("ethers");
const {
  loadFixture,
  fixtureDefault,
  fixtureShortfall,
} = require("../helpers/fixtures.js");

describe("Controller: Mock Price Oracle", function () {
  it("Should be able to mock getUnderlyingPrice()", async function () {
    const { iToken0, mockPriceOracle } = await loadFixture(fixtureDefault);

    let price = utils.parseEther("1");
    await mockPriceOracle.mock.getUnderlyingPrice
      .withArgs(iToken0.address)
      .returns(price);

    expect(await mockPriceOracle.getUnderlyingPrice(iToken0.address)).to.equal(
      price
    );
  });
});

describe("Controller: General Information", function () {
  it("Should be able to get all iTokens", async function () {
    const { controller, iToken0, iToken1, iETH } = await loadFixture(
      fixtureDefault
    );

    expect(await controller.getAlliTokens()).to.have.members([
      iToken1.address,
      iToken0.address,
      iETH.address,
    ]);
  });
});
