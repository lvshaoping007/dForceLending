const { expect } = require("chai");
const { utils, BigNumber } = require("ethers");

const {
  verifyOnlyOwner,
  parseTokenAmount,
  setOraclePrice,
  verifyAllowError,
  rdiv,
  rmul,
  divup,
} = require("../helpers/utils.js");

const {
  loadFixture,
  fixtureDefault,
  increaseBlock,
  getBlock,
  getiTokenCurrentData,
} = require("../helpers/fixtures.js");

const { formatEther } = require("ethers/lib/utils");

async function getBlockBN() {
  return BigNumber.from(await getBlock());
}

describe("Controller: Reward Distribution", function () {
  let controller,
    iToken0,
    iToken1,
    priceOracle,
    owner,
    accounts,
    rewardDistributor;
  let globalSpeed = utils.parseEther("10000");
  let user1, user2;
  let account1, account2;
  let amount0, amount1;

  beforeEach(async function () {
    ({
      controller,
      iToken0,
      iToken1,
      owner,
      accounts,
      priceOracle,
      rewardDistributor,
    } = await loadFixture(fixtureDefault));

    [user1, user2] = accounts;
    account1 = await user1.getAddress();
    account2 = await user2.getAddress();

    amount0 = await parseTokenAmount(iToken0, 1000);
    amount1 = await parseTokenAmount(iToken1, 1000);

    await controller
      .connect(user1)
      .enterMarkets([iToken0.address, iToken1.address]);
    await controller
      .connect(user2)
      .enterMarkets([iToken0.address, iToken1.address]);

    await iToken0.connect(user1).mint(account1, amount0);
    await iToken1.connect(user1).mint(account1, amount1);

    // Now by default it is paused
    await rewardDistributor._unpause(0);
  });

  describe("Add Recipient", function () {
    it("Should allow controller to add recipient", async function () {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [controller.address],
      });
      const signer = await ethers.provider.getSigner(controller.address);

      await rewardDistributor
        .connect(signer)
        .callStatic._addRecipient(iToken1.address, utils.parseEther("1"));

      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [controller.address],
      });
    });

    it("Should not allow non-controller to add recipient", async function () {
      await expect(
        rewardDistributor._addRecipient(iToken1.address, utils.parseEther("1"))
      ).to.revertedWith("onlyController: caller is not the controller");
    });
  });

  describe("Global distribution speed", function () {
    it("Should only allow owner to set global distribution speed", async function () {
      await verifyOnlyOwner(
        rewardDistributor, //contract
        "_setGlobalDistributionSpeed", // method
        [globalSpeed], //args
        owner, // owner
        accounts[0], // non-owner
        "", // ownerEvent
        [], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await rewardDistributor.globalDistributionSpeed()).to.equal(
            globalSpeed
          );

          // No borrow value yet, should be zeros
          expect(
            await rewardDistributor.distributionSpeed(iToken0.address)
          ).to.equal(0);
          expect(
            await rewardDistributor.distributionSpeed(iToken1.address)
          ).to.equal(0);
        },
        // nonownerChecks
        async () => {
          expect(await rewardDistributor.globalDistributionSpeed()).to.equal(0);
        }
      );
    });

    it("Should set global distribution speed and token distribution speed", async function () {
      await iToken0.connect(user1).borrow(amount0.div(2));
      await iToken1.connect(user1).borrow(amount1.div(2));

      await expect(
        rewardDistributor._setGlobalDistributionSpeed(globalSpeed)
      ).to.emit(rewardDistributor, "DistributionSpeedUpdated");

      // As the there is interest accured, allow 0.0001% diff
      let expected = parseFloat(formatEther(globalSpeed.div(2)));
      expect(
        parseFloat(
          formatEther(
            await rewardDistributor.distributionSpeed(iToken0.address)
          )
        )
      ).to.be.closeTo(expected, expected * 0.000001);

      expect(
        parseFloat(
          formatEther(
            await rewardDistributor.distributionSpeed(iToken1.address)
          )
        )
      ).to.be.closeTo(expected, expected * 0.000001);
    });
  });

  describe("Distribution Factor", function () {
    let distributionFactor0 = utils.parseEther("1");
    let distributionFactor1 = utils.parseEther("1.5");

    it("Should only allow owner to set distribution factor", async function () {
      let oldDistributionFactor = await rewardDistributor.distributionFactorMantissa(
        iToken0.address
      );
      let newDistributionFactor = utils.parseEther("2");

      await verifyOnlyOwner(
        rewardDistributor, //contract
        "_setDistributionFactors", // method
        [[iToken0.address], [newDistributionFactor]], //args
        owner, // owner
        accounts[0], // non-owner
        "NewDistributionFactor", // ownerEvent
        [iToken0.address, oldDistributionFactor, newDistributionFactor], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(
            await rewardDistributor.distributionFactorMantissa(iToken0.address)
          ).to.equal(utils.parseEther("2"));
        },
        // nonownerChecks
        async () => {
          expect(
            await rewardDistributor.distributionFactorMantissa(iToken0.address)
          ).to.equal(utils.parseEther("1"));
        }
      );
    });

    it("Should update distribution speed after update distribution factor ", async function () {
      await iToken0.connect(user1).mint(account1, amount0);
      await iToken1.connect(user1).mint(account1, amount1);

      await iToken0.connect(user1).borrow(amount0.div(2));
      await iToken1.connect(user1).borrow(amount1.div(2));

      await rewardDistributor._setGlobalDistributionSpeed(globalSpeed);

      // Now iToken0 has 200% weight, iToken1 only has 100%
      let distributionFactor0 = utils.parseEther("2");
      let distributionFactor1 = utils.parseEther("1");
      await rewardDistributor._setDistributionFactors(
        [iToken0.address, iToken1.address],
        [distributionFactor0, distributionFactor1]
      );

      // As the there is decimal and price differences, allow 0.0001% diff
      let expected = (parseFloat(formatEther(globalSpeed)) * 2) / 3;
      expect(
        parseFloat(
          formatEther(
            await rewardDistributor.distributionSpeed(iToken0.address)
          )
        )
      ).to.be.closeTo(expected, expected * 0.000001);

      expected = parseFloat(formatEther(globalSpeed)) / 3;
      expect(
        parseFloat(
          formatEther(
            await rewardDistributor.distributionSpeed(iToken1.address)
          )
        )
      ).to.be.closeTo(expected, expected * 0.000001);
    });

    it("Should fail if the iToken has not been listed", async function () {
      await expect(
        rewardDistributor._setDistributionFactors(
          [controller.address, iToken1.address],
          [distributionFactor0, distributionFactor1]
        )
      ).to.be.revertedWith("Token has not been listed");
    });

    it("Should fail if the iTokens and distribution factors has different length", async function () {
      await expect(
        rewardDistributor._setDistributionFactors(
          [iToken0.address, iToken1.address],
          [distributionFactor0, distributionFactor1, distributionFactor1]
        )
      ).to.be.revertedWith(
        "Length of _iTokens and _distributionFactors mismatch"
      );
    });
  });

  describe("Reward Token", function () {
    it("Should only allow owner to set reward token", async function () {
      const Token = await ethers.getContractFactory("Token");
      const DF = await Token.deploy("DF", "DF", 18);
      await DF.deployed();

      let oldRewardToken = await rewardDistributor.rewardToken();
      let newRewardToken = DF.address;

      await verifyOnlyOwner(
        rewardDistributor, //contract
        "_setRewardToken", // method
        [newRewardToken], //args
        owner, // owner
        accounts[0], // non-owner
        "NewRewardToken", // ownerEvent
        [oldRewardToken, newRewardToken], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await rewardDistributor.rewardToken()).to.equal(DF.address);
        },
        // nonownerChecks
        async () => {
          expect(await rewardDistributor.rewardToken()).to.equal(
            ethers.constants.AddressZero
          );
        }
      );
    });

    it("Should not update reward token with invalid address", async function () {
      let oldRewardToken = await rewardDistributor.rewardToken();

      await expect(
        rewardDistributor._setRewardToken(oldRewardToken)
      ).to.be.revertedWith("Reward token address invalid");

      await expect(
        rewardDistributor._setRewardToken(ethers.constants.AddressZero)
      ).to.be.revertedWith("Reward token address invalid");
    });
  });

  describe("Update Distribution Speed", function () {
    it("Should fail if called by a contract", async function () {
      const Caller = await ethers.getContractFactory(
        "UpdateDistributionSpeedCaller"
      );
      const caller = await Caller.deploy();
      await caller.deployed();

      await expect(caller.call(rewardDistributor.address)).to.revertedWith(
        "only EOA can update speeds"
      );
    });

    let borrowAmounts = [
      [0, 100],
      [20, 20],
      [20, 0],
    ];

    let underlyingPrices = [
      [1.0, 1.0],
      [1.0, 2.0],
      [0.0, 0.0],
    ];

    borrowAmounts.forEach(async function (borrowAmount) {
      underlyingPrices.forEach(async function (underlyingPrice) {
        it(`With borrowAmounts: ${borrowAmount}, underlyingPrice: ${underlyingPrice}`, async function () {
          await rewardDistributor._setGlobalDistributionSpeed(globalSpeed);

          if (borrowAmount[0] > 0)
            await iToken0
              .connect(user1)
              .borrow(await parseTokenAmount(iToken0, borrowAmount[0]));
          if (borrowAmount[1] > 0)
            await iToken1
              .connect(user1)
              .borrow(await parseTokenAmount(iToken1, borrowAmount[1]));

          // Pause will return all 0
          if (underlyingPrice[0] > 0) {
            await setOraclePrice(priceOracle, iToken0, underlyingPrice[0]);
            await setOraclePrice(priceOracle, iToken1, underlyingPrice[1]);
          } else {
            await priceOracle._setPaused(true);
          }

          await rewardDistributor.updateDistributionSpeed();

          let token0Value = borrowAmount[0] * underlyingPrice[0];
          let token1Value = borrowAmount[1] * underlyingPrice[1];
          let totalValue = token0Value + token1Value;

          // As the there is interest accured, allow 0.0001% diff
          let expected =
            totalValue > 0
              ? parseFloat(formatEther(globalSpeed)) *
                (token0Value / totalValue)
              : 0;
          expect(
            parseFloat(
              formatEther(
                await rewardDistributor.distributionSpeed(iToken0.address)
              )
            )
          ).to.be.closeTo(expected, expected * 0.000001);

          expected =
            totalValue > 0
              ? parseFloat(formatEther(globalSpeed)) *
                (token1Value / totalValue)
              : 0;
          expect(
            parseFloat(
              formatEther(
                await rewardDistributor.distributionSpeed(iToken1.address)
              )
            )
          ).to.be.closeTo(expected, expected * 0.000001);
        });
      });
    });
  });
});

describe("Update Distribution State", function () {
  let controller,
    iToken0,
    iToken1,
    priceOracle,
    owner,
    accounts,
    rewardDistributor;
  let globalSpeed = utils.parseEther("10000");
  let user1, user2;
  let account1, account2;
  let amount0, amount1;

  before(async function () {
    ({
      controller,
      iToken0,
      iToken1,
      owner,
      accounts,
      priceOracle,
      rewardDistributor,
    } = await loadFixture(fixtureDefault));

    [user1, user2] = accounts;
    account1 = await user1.getAddress();
    account2 = await user2.getAddress();

    amount0 = await parseTokenAmount(iToken0, 1000);
    amount1 = await parseTokenAmount(iToken1, 1000);

    await controller
      .connect(user1)
      .enterMarkets([iToken0.address, iToken1.address]);
    await controller
      .connect(user2)
      .enterMarkets([iToken0.address, iToken1.address]);

    await iToken0.connect(user1).mint(account1, amount0);
    await iToken0.connect(user2).mint(account2, amount0);

    await iToken1.connect(user1).mint(account1, amount1);
    await iToken1.connect(user2).mint(account2, amount1);

    await iToken0.connect(user1).borrow(amount0.div(2));
    await iToken0.connect(user2).borrow(amount0.div(2));

    await iToken1.connect(user1).borrow(amount1.div(2));
    await iToken1.connect(user2).borrow(amount1.div(2));

    await rewardDistributor._unpause(globalSpeed);
  });

  function shouldUpdateBorrowState(action) {
    return ["borrow", "repayBorrow", "liquidateBorrow"].includes(action);
  }

  function shouldUpdateSupplyState(action) {
    return [
      "mint",
      "redeem",
      "redeemUnderlying",
      "liquidateBorrow",
      "transfer",
    ].includes(action);
  }

  let actions = [
    { action: "mint", amount: 0, needAddress: true },
    { action: "mint", amount: 100, needAddress: true },
    { action: "redeem", amount: 0, needAddress: true },
    { action: "redeem", amount: 50, needAddress: true },
    { action: "redeemUnderlying", amount: 0, needAddress: true },
    { action: "redeemUnderlying", amount: 50, needAddress: true },
    { action: "borrow", amount: 0 },
    { action: "borrow", amount: 20 },
    { action: "repayBorrow", amount: 100 },
    { action: "repayBorrow", amount: 0 },
    { action: "transfer", amount: 0, needAddress: true },
    { action: "transfer", amount: 100, needAddress: true },
  ];

  async function executeAction(state, action) {
    if (!state.amount.isZero()) {
      if (action.needAddress) {
        if (action.action === "transfer") {
          await state.iToken
            .connect(user1)
            [action.action](account2, state.amount);
        } else {
          await state.iToken
            .connect(user1)
            [action.action](account1, state.amount);
        }
      } else {
        await state.iToken.connect(user1)[action.action](state.amount);
      }
    }
  }

  actions.forEach(function (action) {
    it(`Checking borrow state after ${action.action} amount: ${action.amount}`, async function () {
      let blockDelta = 100;
      let iToken = iToken1;
      let state = {
        iToken: iToken,
        amount: await parseTokenAmount(iToken, action.amount),
        speed: await rewardDistributor.distributionSpeed(iToken.address),
        index: (await rewardDistributor.distributionBorrowState(iToken.address))
          .index,
        block: (await rewardDistributor.distributionBorrowState(iToken.address))
          .block,
        totalBorrows: (await getiTokenCurrentData(iToken, blockDelta))
          .totalBorrows,
      };

      // The action itself will forward 1 block
      await increaseBlock(blockDelta - 1);

      let verify = async (state) => {
        let expectedBlock, expectedIndex;

        if (state.amount.isZero() || !shouldUpdateBorrowState(action.action)) {
          // No borrow, should not updated
          expectedBlock = state.block;
          expectedIndex = state.index;
        } else {
          expectedBlock = BigNumber.from(await getBlock());
          expectedIndex = state.index.add(
            rdiv(
              state.speed.mul(expectedBlock.sub(state.block)),
              state.totalBorrows
            )
          );
        }

        let actual = await rewardDistributor.distributionBorrowState(
          state.iToken.address
        );

        expect(actual.block).to.equal(expectedBlock);
        expect(actual.index).to.equal(expectedIndex);
      };

      await executeAction(state, action);
      await verify(state);
    });

    it(`Checking supply state after ${action.action} amount: ${action.amount}`, async function () {
      let iToken = iToken1;
      let state = {
        iToken: iToken,
        amount: await parseTokenAmount(iToken, action.amount),
        speed: await rewardDistributor.distributionSpeed(iToken.address),
        index: (await rewardDistributor.distributionSupplyState(iToken.address))
          .index,
        totalSupply: await iToken.totalSupply(),
        block: (await rewardDistributor.distributionSupplyState(iToken.address))
          .block,
      };

      await increaseBlock(100);

      let verify = async (state) => {
        let expectedBlock, expectedIndex;

        // No borrow, should not updated
        if (state.amount.isZero() || !shouldUpdateSupplyState(action.action)) {
          expectedBlock = state.block;
          expectedIndex = state.index;
        } else {
          expectedBlock = BigNumber.from(await getBlock());
          expectedIndex = state.index.add(
            rdiv(
              state.speed.mul(expectedBlock.sub(state.block)),
              state.totalSupply
            )
          );
        }

        let actual = await rewardDistributor.distributionSupplyState(
          state.iToken.address
        );

        expect(actual.block).to.equal(expectedBlock);
        expect(actual.index).to.equal(expectedIndex);
      };

      await executeAction(state, action);
      await verify(state);
    });

    it(`Checking reward after ${action.action} amount: ${action.amount}`, async function () {
      let blockDelta = 100;
      let iToken = iToken1;
      let state = {
        iToken: iToken,
        amount: await parseTokenAmount(iToken, action.amount),
        balance: await iToken.balanceOf(account1),
        reward: await rewardDistributor.reward(account1),
        supplierIndex: await rewardDistributor.distributionSupplierIndex(
          iToken.address,
          account1
        ),
        borrowerIndex: await rewardDistributor.distributionBorrowerIndex(
          iToken.address,
          account1
        ),
        // Calculate the borrow balance in advance
        borrowBalance: divup(
          (await iToken.borrowBalanceStored(account1)).mul(
            (await getiTokenCurrentData(iToken, blockDelta)).borrowIndex
          ),
          await iToken.borrowIndex()
        ),
      };

      // The action itself will forward 1 block
      await increaseBlock(blockDelta - 1);

      let verify = async (state) => {
        let expected = {};
        let actual = {};

        // No borrow, should not updated
        if (state.amount.isZero()) {
          expected.reward = state.reward;
          expected.supplierIndex = state.supplierIndex;
          expected.borrowerIndex = state.borrowerIndex;
        } else {
          if (shouldUpdateBorrowState(action.action)) {
            expected.supplierIndex = state.supplierIndex;
            expected.borrowerIndex = (
              await rewardDistributor.distributionBorrowState(
                state.iToken.address
              )
            ).index;
            expected.reward = state.reward.add(
              rmul(
                expected.borrowerIndex.sub(state.borrowerIndex),
                state.borrowBalance
              )
            );
          }
          if (shouldUpdateSupplyState(action.action)) {
            expected.borrowerIndex = state.borrowerIndex;
            expected.supplierIndex = (
              await rewardDistributor.distributionSupplyState(
                state.iToken.address
              )
            ).index;
            expected.reward = state.reward.add(
              rmul(
                expected.supplierIndex.sub(state.supplierIndex),
                state.balance
              )
            );
          }
        }

        actual.reward = await rewardDistributor.reward(account1);
        actual.supplierIndex = await rewardDistributor.distributionSupplierIndex(
          iToken.address,
          account1
        );
        actual.borrowerIndex = await rewardDistributor.distributionBorrowerIndex(
          iToken.address,
          account1
        );

        // console.log(Object.values(expected).map((v) => v.toString()));
        // console.log(Object.values(actual).map((s) => s.toString()));

        expect(actual.reward).to.equal(expected.reward);
        expect(actual.supplierIndex).to.equal(expected.supplierIndex);
        expect(actual.borrowerIndex).to.equal(expected.borrowerIndex);
      };

      await executeAction(state, action);
      await verify(state);
    });
  });

  it("Should fail when try to update distribution state of non-listed token", async function () {
    await expect(
      rewardDistributor.updateDistributionState(controller.address, false)
    ).to.be.revertedWith("Token has not been listed");

    await expect(
      rewardDistributor.updateDistributionState(controller.address, true)
    ).to.be.revertedWith("Token has not been listed");
  });
});

describe("Claiming reward", async function () {
  let controller,
    iToken0,
    iToken1,
    priceOracle,
    owner,
    accounts,
    rewardDistributor;
  let globalSpeed = utils.parseEther("10000");
  let user1, user2, user3;
  let account1, account2, account3;
  let amount0, amount1;
  let DF;
  let startBlock;

  beforeEach(async function () {
    ({
      controller,
      iToken0,
      iToken1,
      owner,
      accounts,
      priceOracle,
      rewardDistributor,
    } = await loadFixture(fixtureDefault));

    [user1, user2, user3] = accounts;
    account1 = await user1.getAddress();
    account2 = await user2.getAddress();
    account3 = await user3.getAddress();

    amount0 = await parseTokenAmount(iToken0, 1000);
    amount1 = await parseTokenAmount(iToken1, 1000);

    await controller
      .connect(user1)
      .enterMarkets([iToken0.address, iToken1.address]);
    await controller
      .connect(user2)
      .enterMarkets([iToken0.address, iToken1.address]);

    const Token = await ethers.getContractFactory("Token");
    DF = await Token.deploy("DF", "DF", 18);
    await DF.deployed();

    // Prepare reward
    await DF.mint(
      rewardDistributor.address,
      parseTokenAmount(DF, "10000000000")
    );
    await rewardDistributor._setRewardToken(DF.address);

    await rewardDistributor._unpause(globalSpeed);
  });

  it("Should be able to claim reward", async function () {
    // Only 1 user mint/borrow
    await iToken0.connect(user1).mint(account1, amount0);
    await iToken0.connect(user1).borrow(amount0.div(2));

    // Refresh the speed and token State at the last step for easy calculation
    await rewardDistributor._setGlobalDistributionSpeed(globalSpeed);

    await increaseBlock(99);

    // _setGlobalDistributionSpeed should update both supply and borrow state
    startBlock = (
      await rewardDistributor.distributionSupplyState(iToken0.address)
    ).block;

    let currentBlock = (await getBlockBN()).add(1);

    // user1 should be able to claim all on both supply and borrow
    let reward = (await rewardDistributor.distributionSpeed(iToken0.address))
      .mul(currentBlock.sub(startBlock))
      .mul(2);

    await expect(() =>
      rewardDistributor.claimReward([account1], [iToken0.address])
    ).to.changeTokenBalance(DF, user1, reward);

    // Should claim all reward
    expect(await rewardDistributor.reward(account1)).to.equal(0);
  });

  it("Should not be able to claim reward with non-listed token", async function () {
    await expect(
      rewardDistributor.claimReward([account1], [DF.address])
    ).to.revertedWith("Token has not been listed");
  });

  it("Should be able to claim all reward", async function () {
    await iToken0.connect(user1).mint(account1, amount0);
    await iToken0.connect(user2).mint(account2, amount0);

    await iToken1.connect(user1).mint(account1, amount1);
    await iToken1.connect(user2).mint(account2, amount1);

    await iToken0.connect(user1).borrow(amount0.div(2));
    await iToken0.connect(user2).borrow(amount0.div(2));

    await iToken1.connect(user1).borrow(amount1.div(2));
    await iToken1.connect(user2).borrow(amount1.div(2));

    // Refresh the speed and token State at the last step for easy calculation
    await rewardDistributor._setGlobalDistributionSpeed(globalSpeed);

    // _setGlobalDistributionSpeed should update both supply and borrow state to the same block
    startBlock = (
      await rewardDistributor.distributionSupplyState(iToken1.address)
    ).block;

    await increaseBlock(99);

    let balanceBefore = (await DF.balanceOf(account1)).add(
      await DF.balanceOf(account2)
    );
    await rewardDistributor.claimAllReward([account1, account2, account3]);
    let balanceAfter = (await DF.balanceOf(account1)).add(
      await DF.balanceOf(account2)
    );

    let currentBlock = await getBlockBN();

    // 2 users should be able to claim all on both supply and borrow
    let reward = (await rewardDistributor.globalDistributionSpeed())
      .mul(currentBlock.sub(startBlock))
      .mul(2);

    // console.log(
    //   (await rewardDistributor.distributionBorrowState(iToken0.address)).map((i) =>
    //     i.toString()
    //   )
    // );

    // Borrow will accured interest, the 2nd borrow will not match the 1st one
    // with the same amount, therefore there could be some rounding errors
    verifyAllowError(balanceAfter.sub(balanceBefore), reward, 0.000001);
    // expect(balanceAfter.sub(balanceBefore)).to.equal(reward);

    // Should claim all reward
    expect(await rewardDistributor.reward(account1)).to.equal(0);
    expect(await rewardDistributor.reward(account2)).to.equal(0);
  });

  it("Should fail when try to update claim non-listed token", async function () {
    await expect(
      rewardDistributor.claimReward([account1], [controller.address])
    ).to.be.revertedWith("Token has not been listed");

    await expect(
      rewardDistributor.updateReward(controller.address, account1, true)
    ).to.be.revertedWith("Token has not been listed");
  });
});

describe("Pause/Unpause", async function () {
  let controller,
    iToken0,
    iToken1,
    priceOracle,
    owner,
    accounts,
    rewardDistributor;
  let globalSpeed = utils.parseEther("10000");
  let user1, user2, user3;
  let account1, account2, account3;
  let amount0, amount1;
  let DF;
  let startBlock;

  before(async function () {
    ({
      controller,
      iToken0,
      iToken1,
      owner,
      accounts,
      priceOracle,
      rewardDistributor,
    } = await loadFixture(fixtureDefault));

    [user1, user2, user3] = accounts;
    account1 = await user1.getAddress();
    account2 = await user2.getAddress();
    account3 = await user3.getAddress();

    amount0 = await parseTokenAmount(iToken0, 1000);
    amount1 = await parseTokenAmount(iToken1, 1000);

    await controller
      .connect(user1)
      .enterMarkets([iToken0.address, iToken1.address]);
    await controller
      .connect(user2)
      .enterMarkets([iToken0.address, iToken1.address]);

    const Token = await ethers.getContractFactory("Token");
    DF = await Token.deploy("DF", "DF", 18);
    await DF.deployed();

    // Prepare reward
    await DF.mint(
      rewardDistributor.address,
      parseTokenAmount(DF, "10000000000")
    );
    await rewardDistributor._setRewardToken(DF.address);
  });

  it("Initial state should be paused and can not set global speed", async function () {
    expect(await rewardDistributor.paused()).to.equal(true);

    await expect(
      rewardDistributor._setGlobalDistributionSpeed(globalSpeed)
    ).to.be.revertedWith("Can not change global speed when paused");
  });

  it("Should only allow owner to unpause", async function () {
    await verifyOnlyOwner(
      rewardDistributor, //contract
      "_unpause", // method
      [globalSpeed], //args
      owner, // owner
      accounts[0], // non-owner
      "Paused", // ownerEvent
      [false], // ownerEventArgs
      // ownerChecks
      async () => {
        expect(await rewardDistributor.paused()).to.equal(false);
        expect(await rewardDistributor.globalDistributionSpeed()).to.equal(
          globalSpeed
        );
      },
      // nonownerChecks
      async () => {
        expect(await rewardDistributor.paused()).to.equal(true);
        expect(await rewardDistributor.globalDistributionSpeed()).to.equal(0);
      }
    );
  });

  it("Should only allow owner to pause", async function () {
    await verifyOnlyOwner(
      rewardDistributor, //contract
      "_pause", // method
      [], //args
      owner, // owner
      accounts[0], // non-owner
      "Paused", // ownerEvent
      [true], // ownerEventArgs
      // ownerChecks
      async () => {
        expect(await rewardDistributor.paused()).to.equal(true);
        expect(await rewardDistributor.globalDistributionSpeed()).to.equal(0);
      },
      // nonownerChecks
      async () => {
        expect(await rewardDistributor.paused()).to.equal(false);
        expect(await rewardDistributor.globalDistributionSpeed()).to.equal(
          globalSpeed
        );
      }
    );
  });

  it("Should stop accumulation but claimable when paused", async function () {
    const blockDelta = 100;
    let startBlock, startIndex, startReward;

    // Only 1 user mint/borrow
    await iToken0.connect(user1).mint(account1, amount0);
    await iToken0.connect(user1).borrow(amount0.div(2));

    startReward = await rewardDistributor.reward(account1);

    // Refresh the speed and token State at the last step for easy calculation
    await rewardDistributor._unpause(globalSpeed);

    await increaseBlock(blockDelta);

    // Both supply and borrow side,
    let reward = (await rewardDistributor.distributionSpeed(iToken0.address))
      .mul(blockDelta + 1) //_setPaused() will increase 1 block
      .mul(2);

    await rewardDistributor._pause();

    startBlock = (
      await rewardDistributor.distributionSupplyState(iToken0.address)
    ).block;

    startIndex = await rewardDistributor.distributionBorrowerIndex(
      iToken0.address,
      account1
    );

    // Should not update state, borrowerIndex, reward if paused
    //await iToken0.connect(user1).borrow(0);
    await controller.beforeBorrow(iToken0.address, account1, 0);
    expect(
      (await rewardDistributor.distributionBorrowState(iToken0.address)).block
    ).to.equal(startBlock);
    expect(
      await rewardDistributor.distributionBorrowerIndex(
        iToken0.address,
        account1
      )
    ).to.equal(startIndex);
    expect(await rewardDistributor.reward(account1)).to.equal(startReward);

    // Should not accumulated reward or update state when paused
    await increaseBlock(blockDelta);

    await expect(() =>
      rewardDistributor.claimReward([account1], [iToken0.address])
    ).changeTokenBalance(DF, user1, reward);
  });

  it("Should keep speed as 0 when paused", async function () {
    await rewardDistributor.updateDistributionSpeed();
    let block = await getBlockBN();

    expect(await rewardDistributor.distributionSpeed(iToken0.address)).to.equal(
      0
    );
    expect(await rewardDistributor.distributionSpeed(iToken1.address)).to.equal(
      0
    );

    // The state should not be updated
    expect(
      (await rewardDistributor.distributionBorrowState(iToken0.address)).block
    ).to.not.equal(block);
    expect(
      (await rewardDistributor.distributionBorrowState(iToken0.address)).block
    ).to.not.equal(block);
    expect(
      (await rewardDistributor.distributionSupplyState(iToken1.address)).block
    ).to.not.equal(block);
    expect(
      (await rewardDistributor.distributionSupplyState(iToken1.address)).block
    ).to.not.equal(block);
  });

  it("Should start accumulating after unpause", async function () {
    const blockDelta = 100;

    let startBlock, startIndex, startReward;

    startBlock = (
      await rewardDistributor.distributionSupplyState(iToken0.address)
    ).block;

    startIndex = await rewardDistributor.distributionBorrowerIndex(
      iToken0.address,
      account1
    );

    startReward = await rewardDistributor.reward(account1);

    await rewardDistributor._unpause(globalSpeed);

    // All state should be updated
    await controller.beforeBorrow(iToken0.address, account1, 0);
    expect(
      (await rewardDistributor.distributionBorrowState(iToken0.address)).block
    ).to.not.equal(startBlock);
    expect(
      await rewardDistributor.distributionBorrowerIndex(
        iToken0.address,
        account1
      )
    ).to.not.equal(startIndex);
    expect(await rewardDistributor.reward(account1)).to.not.equal(startReward);

    // Should start accumulating reward after unpause
    await increaseBlock(blockDelta);

    let reward = (await rewardDistributor.distributionSpeed(iToken0.address))
      .mul(blockDelta + 2) // _setPaused() and claimReward() will increase 2 blocks
      .mul(2);

    await expect(() =>
      rewardDistributor.claimReward([account1], [iToken0.address])
    ).changeTokenBalance(DF, user1, reward);
  });
});
