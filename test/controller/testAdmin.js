const { expect } = require("chai");
const { utils } = require("ethers");
const { ethers } = require("hardhat");
const { deployMockContract } = waffle;

const IToken = require("../../artifacts/contracts/iToken.sol/iToken.json");

const { verifyOnlyOwner } = require("../helpers/utils.js");
const {
  loadFixture,
  fixtureDefault,
  fixtureDeployController,
  deployiToken,
} = require("../helpers/fixtures.js");

describe("Controller: Admin Operations", function () {
  describe("Add Markets", function () {
    let controller, owner, accounts, interestRateModel, priceOracle;
    let underlying, iToken, iToken0;

    const collateralFactor = utils.parseEther("0.9");
    const borrowFactor = utils.parseEther("1");
    const supplyCapacity = ethers.constants.MaxUint256;
    const borrowCapacity = ethers.constants.MaxUint256;
    const distributionFactor = utils.parseEther("1");

    beforeEach(async function () {
      ({
        controller,
        owner,
        accounts,
        iToken0,
        interestRateModel,
        priceOracle,
      } = await loadFixture(fixtureDefault));

      // deploy a new token
      ({ underlying, iToken } = await deployiToken(
        "Mock Token New",
        "MTN",
        18,
        "dForce lending token new",
        "iToken n",
        controller,
        interestRateModel,
        false
      ));
    });

    it("Should only allow owner to add market", async function () {
      await verifyOnlyOwner(
        controller, //contract
        "_addMarket", // method
        [
          iToken.address,
          collateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor,
        ], //args
        owner, // owner
        accounts[0], // non-owner
        "MarketAdded", // ownerEvent
        [
          iToken.address,
          collateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor,
        ], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await controller.getAlliTokens()).to.include(iToken.address);
        },
        // nonownerChecks
        async () => {
          expect(await controller.getAlliTokens()).to.not.include(
            iToken.address
          );
        }
      );
    });

    it("Should not be able to add market again", async function () {
      await expect(
        controller._addMarket(
          iToken0.address,
          collateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.revertedWith("Token has already been listed");
    });

    it("Should not be able to add market with invalid collateral factor", async function () {
      let invalidCollateralFactor = utils.parseEther("1.01");

      await expect(
        controller._addMarket(
          iToken.address,
          invalidCollateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.revertedWith("Collateral factor invalid");
    });

    it("Should not be able to add market with invalid borrow factor", async function () {
      let invalidBorrowFactor = 0;
      await expect(
        controller._addMarket(
          iToken.address,
          collateralFactor,
          invalidBorrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.revertedWith("Borrow factor invalid");

      invalidBorrowFactor = utils.parseEther("1.001");
      await expect(
        controller._addMarket(
          iToken.address,
          collateralFactor,
          invalidBorrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.revertedWith("Borrow factor invalid");
    });

    it("Should not be able to add market without unlderlying price", async function () {
      // Set iToken0 price to 0
      await priceOracle._setPaused(true);

      await expect(
        controller._addMarket(
          iToken.address,
          collateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.revertedWith("Underlying price is unavailable");
    });

    it("Should not be able to add non-iToken as market", async function () {
      // For contract even do not have a function called isiToken()
      await expect(
        controller._addMarket(
          controller.address,
          collateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.reverted;

      // For those do return false
      const mockiToken = await deployMockContract(owner, IToken.abi);
      await mockiToken.mock.isiToken.returns(false);
      await expect(
        controller._addMarket(
          mockiToken.address,
          collateralFactor,
          borrowFactor,
          supplyCapacity,
          borrowCapacity,
          distributionFactor
        )
      ).to.be.revertedWith("Token is not a iToken");
    });
  });

  describe("Set Price Oracle", function () {
    it("Should only allow owner to set new oracle", async function () {
      const {
        controller,
        mockPriceOracle,
        priceOracle,
        owner,
        accounts,
      } = await loadFixture(fixtureDefault);

      await verifyOnlyOwner(
        controller, //contract
        "_setPriceOracle", // method
        [mockPriceOracle.address], //args
        owner, // owner
        accounts[0], // non-owner
        "NewPriceOracle", // ownerEvent
        [priceOracle.address, mockPriceOracle.address], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await controller.priceOracle()).to.equal(
            mockPriceOracle.address
          );
        },
        // nonownerChecks
        async () => {
          expect(await controller.priceOracle()).to.equal(priceOracle.address);
        }
      );
    });

    it("Should not be able to set invalid or same oracle", async function () {
      const { controller, priceOracle } = await loadFixture(fixtureDefault);

      await expect(
        controller._setPriceOracle(ethers.constants.AddressZero)
      ).to.be.revertedWith("Oracle address invalid");

      await expect(
        controller._setPriceOracle(priceOracle.address)
      ).to.be.revertedWith("Oracle address invalid");
    });
  });

  describe("Set Close Factor", function () {
    it("Should only allow owner to set new close factor", async function () {
      const { controller, owner, accounts } = await loadFixture(fixtureDefault);

      let oldCloseFactor = await controller.closeFactorMantissa();
      let closeFactor = ethers.utils.parseUnits("0.3", 18);

      await verifyOnlyOwner(
        controller, //contract
        "_setCloseFactor", // method
        [closeFactor], //args
        owner, // owner
        accounts[0], // non-owner
        "NewCloseFactor", // ownerEvent
        [oldCloseFactor, closeFactor], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await controller.closeFactorMantissa()).to.equal(closeFactor);
        },
        // nonownerChecks
        async () => {
          expect(await controller.closeFactorMantissa()).to.equal(
            oldCloseFactor
          );
        }
      );
    });

    it("Should not be able to set invalid close factor", async function () {
      const { controller } = await loadFixture(fixtureDefault);

      // Below the minimum
      let invalidCloseFactor = ethers.utils.parseUnits("0.0499", 18);

      await expect(
        controller._setCloseFactor(invalidCloseFactor)
      ).to.be.revertedWith("Close factor invalid");

      // Above the maximum
      invalidCloseFactor = ethers.utils.parseUnits("0.9001", 18);

      await expect(
        controller._setCloseFactor(invalidCloseFactor)
      ).to.be.revertedWith("Close factor invalid");
    });
  });

  describe("Set Liquidation Incentive", function () {
    it("Should only allow owner to set new liquidation incentive", async function () {
      const { controller, owner, accounts } = await loadFixture(fixtureDefault);

      let oldLiquidationIncentive = await controller.liquidationIncentiveMantissa();
      let liquidationIncentive = ethers.utils.parseUnits("1.30", 18);

      await verifyOnlyOwner(
        controller, //contract
        "_setLiquidationIncentive", // method
        [liquidationIncentive], //args
        owner, // owner
        accounts[0], // non-owner
        "NewLiquidationIncentive", // ownerEvent
        [oldLiquidationIncentive, liquidationIncentive], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await controller.liquidationIncentiveMantissa()).to.equal(
            liquidationIncentive
          );
        },
        // nonownerChecks
        async () => {
          expect(await controller.liquidationIncentiveMantissa()).to.equal(
            oldLiquidationIncentive
          );
        }
      );
    });

    it("Should not be able to set invalid liquidation incentive", async function () {
      const { controller } = await loadFixture(fixtureDefault);

      // Below the minimum
      let invalidLiquidationIncentive = ethers.utils.parseUnits("0.99", 18);

      await expect(
        controller._setLiquidationIncentive(invalidLiquidationIncentive)
      ).to.be.revertedWith("Liquidation incentive invalid");

      // Above the maximum
      invalidLiquidationIncentive = ethers.utils.parseUnits("1.5001", 18);

      await expect(
        controller._setLiquidationIncentive(invalidLiquidationIncentive)
      ).to.be.revertedWith("Liquidation incentive invalid");
    });
  });

  describe("Set iToken's Collateral Factor", function () {
    it("Should Should only allow owner to set new collateral factor", async function () {
      const { controller, iToken0, owner, accounts } = await loadFixture(
        fixtureDefault
      );

      let oldCollateralFactor = (await controller.markets(iToken0.address))
        .collateralFactorMantissa;
      let newCollateralFactor = ethers.utils.parseUnits("0.8", 18);

      await verifyOnlyOwner(
        controller, //contract
        "_setCollateralFactor", // method
        [iToken0.address, newCollateralFactor], //args
        owner, // owner
        accounts[0], // non-owner
        "NewCollateralFactor", // ownerEvent
        [iToken0.address, oldCollateralFactor, newCollateralFactor], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(
            (await controller.markets(iToken0.address)).collateralFactorMantissa
          ).to.equal(newCollateralFactor);
        },
        // nonownerChecks
        async () => {
          expect(
            (await controller.markets(iToken0.address)).collateralFactorMantissa
          ).to.equal(oldCollateralFactor);
        }
      );
    });

    it("Should not be able to set collateral factor for non-listed token", async function () {
      const { controller, iToken0 } = await loadFixture(fixtureDefault);
      let newCollateralFactor = ethers.utils.parseUnits("0.8", 18);

      await expect(
        controller._setCollateralFactor(controller.address, newCollateralFactor)
      ).to.be.revertedWith("Token has not been listed");
    });

    it("Should not be able to set invalid collateral factor", async function () {
      const { controller, iToken0 } = await loadFixture(fixtureDefault);

      // Above the maximum
      let invalidCollateralFactor = ethers.utils.parseUnits("0.9001", 18);

      await expect(
        controller._setCollateralFactor(
          iToken0.address,
          invalidCollateralFactor
        )
      ).to.be.revertedWith("Collateral factor invalid");
    });

    it("Should not be able to set collateral factor with no underlying price", async function () {
      const { controller, mockPriceOracle, iToken0 } = await loadFixture(
        fixtureDefault
      );
      await controller._setPriceOracle(mockPriceOracle.address);
      let newCollateralFactor = ethers.utils.parseUnits("0.8", 18);

      // Make iToken0 underlying price 0
      await mockPriceOracle.mock.getUnderlyingPrice
        .withArgs(iToken0.address)
        .returns(0);

      await expect(
        controller._setCollateralFactor(iToken0.address, newCollateralFactor)
      ).to.be.revertedWith(
        "Failed to set collateral factor, underlying price is unavailable"
      );
    });
  });

  describe("Set iToken's Borrow Factor", function () {
    it("Should only allow owner to set new borrow factor", async function () {
      const { controller, iToken0, owner, accounts } = await loadFixture(
        fixtureDefault
      );

      let oldBorrowFactor = (await controller.markets(iToken0.address))
        .borrowFactorMantissa;
      let newBorrowFactor = ethers.utils.parseUnits("0.8", 18);

      await verifyOnlyOwner(
        controller, //contract
        "_setBorrowFactor", // method
        [iToken0.address, newBorrowFactor], //args
        owner, // owner
        accounts[0], // non-owner
        "NewBorrowFactor", // ownerEvent
        [iToken0.address, oldBorrowFactor, newBorrowFactor], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(
            (await controller.markets(iToken0.address)).borrowFactorMantissa
          ).to.equal(newBorrowFactor);
        },
        // nonownerChecks
        async () => {
          expect(
            (await controller.markets(iToken0.address)).borrowFactorMantissa
          ).to.equal(oldBorrowFactor);
        }
      );
    });

    it("Should not be able to set borrow factor for non-listed token", async function () {
      const { controller } = await loadFixture(fixtureDefault);
      let newBorrowFactor = ethers.utils.parseUnits("0.8", 18);

      await expect(
        controller._setBorrowFactor(controller.address, newBorrowFactor)
      ).to.be.revertedWith("Token has not been listed");
    });

    it("Should not be able to set invalid borrow factor", async function () {
      const { controller, iToken0 } = await loadFixture(fixtureDefault);

      // Above the maximum
      let invalidBorrowFactor = ethers.utils.parseUnits("1.0001", 18);

      await expect(
        controller._setBorrowFactor(iToken0.address, invalidBorrowFactor)
      ).to.be.revertedWith("Borrow factor invalid");

      // Can not be 0
      await expect(
        controller._setBorrowFactor(iToken0.address, 0)
      ).to.be.revertedWith("Borrow factor invalid");
    });

    it("Should not be able to set borrow factor with no underlying price", async function () {
      const { controller, mockPriceOracle, iToken0 } = await loadFixture(
        fixtureDefault
      );
      await controller._setPriceOracle(mockPriceOracle.address);
      let newBorrowFactor = ethers.utils.parseUnits("0.8", 18);

      // Make iToken0 underlying price 0
      await mockPriceOracle.mock.getUnderlyingPrice
        .withArgs(iToken0.address)
        .returns(0);

      await expect(
        controller._setBorrowFactor(iToken0.address, newBorrowFactor)
      ).to.be.revertedWith(
        "Failed to set borrow factor, underlying price is unavailable"
      );
    });
  });

  let tokenConfigs = [
    { mixed: "borrowCapacity", camel: "BorrowCapacity" },
    { mixed: "supplyCapacity", camel: "SupplyCapacity" },
  ];

  tokenConfigs.forEach(async (tokenConfig) => {
    describe(`Set iToken's ${tokenConfig.mixed}`, function () {
      it(`Should only allow owner to set new ${tokenConfig.mixed}`, async function () {
        const { controller, iToken0, owner, accounts } = await loadFixture(
          fixtureDefault
        );

        let capacity = ethers.utils.parseEther("10000");

        await verifyOnlyOwner(
          controller, //contract
          `_set${tokenConfig.camel}`, // method
          [iToken0.address, capacity], //args
          owner, // owner
          accounts[0], // non-owner
          `New${tokenConfig.camel}`, // ownerEvent
          [iToken0.address, ethers.constants.MaxUint256, capacity], // ownerEventArgs
          // ownerChecks
          async () => {
            expect(
              (await controller.markets(iToken0.address))[
                `${tokenConfig.mixed}`
              ]
            ).to.equal(capacity);
          },
          // nonownerChecks
          async () => {
            expect(
              (await controller.markets(iToken0.address))[
                `${tokenConfig.mixed}`
              ]
            ).to.equal(ethers.constants.MaxUint256);
          }
        );
      });

      it(`Should not be able to set ${tokenConfig.mixed} for non-listed token`, async function () {
        const { controller } = await loadFixture(fixtureDefault);

        let capacity = ethers.utils.parseEther("10000");
        await expect(
          controller[`_set${tokenConfig.camel}`](controller.address, capacity)
        ).to.be.revertedWith("Token has not been listed");
      });
    });
  });

  describe("Set Pause Guardian", function () {
    it("Should only allow owner to set new pause guardian", async function () {
      const { controller, owner, accounts } = await loadFixture(fixtureDefault);
      let [guardian] = accounts;
      let guardianAddr = await guardian.getAddress();

      await verifyOnlyOwner(
        controller, //contract
        "_setPauseGuardian", // method
        [guardianAddr], //args
        owner, // owner
        accounts[0], // non-owner
        "NewPauseGuardian", // ownerEvent
        [ethers.constants.AddressZero, guardianAddr], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await controller.pauseGuardian()).to.equal(guardianAddr);
        },
        // nonownerChecks
        async () => {
          expect(await controller.pauseGuardian()).to.equal(
            ethers.constants.AddressZero
          );
        }
      );
    });
  });

  let pauseAction = [
    { action: "Mint", withToken: true },
    { action: "Redeem", withToken: true },
    { action: "Borrow", withToken: true },
    { action: "Seize", withToken: false },
    { action: "Transfer", withToken: false },
  ];
  pauseAction.forEach(async (action) => {
    describe(`Pause and Unpause ${action.action}`, function () {
      let controller, iToken0;
      let accounts, guardian, other;
      let actionLower = action.action.toLowerCase();

      beforeEach(async function () {
        ({ controller, iToken0, accounts } = await loadFixture(fixtureDefault));
        [guardian, other] = accounts;
        await controller._setPauseGuardian(await guardian.getAddress());
      });

      // Mint & Redeem & Borrow are with tokens
      if (action.withToken) {
        it("Should be able to pause by guardian", async function () {
          // Guardian should be able to pause
          await expect(
            controller
              .connect(guardian)
              [`_set${action.action}Paused`](iToken0.address, true)
          )
            .to.emit(controller, `${action.action}Paused`)
            .withArgs(iToken0.address, true);
          expect(
            await controller[`${actionLower}Paused`](iToken0.address)
          ).to.equal(true);
        });

        it("Should be able to pause by owner", async function () {
          // Owner should be able to pause
          await expect(
            controller[`_set${action.action}Paused`](iToken0.address, true)
          )
            .to.emit(controller, `${action.action}Paused`)
            .withArgs(iToken0.address, true);

          expect(
            await controller[`${actionLower}Paused`](iToken0.address)
          ).to.equal(true);
        });

        it("Should only be able to unpause by owner", async function () {
          // Pause
          await controller[`_set${action.action}Paused`](iToken0.address, true);

          // Guardian should not be able to unpause
          await expect(
            controller
              .connect(guardian)
              [`_set${action.action}Paused`](iToken0.address, false)
          ).to.be.revertedWith(controller, "Only owner can unpause");

          // Owner should be able to pause
          await expect(
            controller[`_set${action.action}Paused`](iToken0.address, false)
          )
            .to.emit(controller, `${action.action}Paused`)
            .withArgs(iToken0.address, false);
        });

        it("Should not be able to pause/unpause by others", async function () {
          await expect(
            controller
              .connect(other)
              [`_set${action.action}Paused`](iToken0.address, true)
          ).to.be.revertedWith(
            controller,
            "Only owner and pause guardian can pause/unpause"
          );

          await expect(
            controller
              .connect(other)
              [`_set${action.action}Paused`](iToken0.address, false)
          ).to.be.revertedWith(
            controller,
            "Only owner and pause guardian can pause/unpause"
          );
        });

        it("Should not be able to pause/unpause non-listed token ", async function () {
          await expect(
            controller[`_set${action.action}Paused`](controller.address, true)
          ).to.be.revertedWith(controller, "Token has not been listed");

          await expect(
            controller[`_set${action.action}Paused`](controller.address, false)
          ).to.be.revertedWith(controller, "Token has not been listed");
        });

        it(`Should fail in before${action.action}() with paused token`, async function () {
          const { controller, iToken0, owner, accounts } = await loadFixture(
            fixtureDefault
          );
          const [other] = accounts;

          // Pause iToken0
          await controller[`_set${action.action}Paused`](iToken0.address, true);

          await expect(
            controller[`before${action.action}`](
              iToken0.address,
              await other.getAddress(),
              utils.parseEther("1000")
            )
          ).to.be.revertedWith(`Token ${actionLower} has been paused`);
        });
        // Seize & Transfer are without iToken address
      } else {
        it("Should be able to pause by guardian", async function () {
          // Guardian should be able to pause
          await expect(
            controller.connect(guardian)[`_set${action.action}Paused`](true)
          )
            .to.emit(controller, `${action.action}Paused`)
            .withArgs(true);
          expect(await controller[`${actionLower}Paused`]()).to.equal(true);
        });

        it("Should be able to pause by owner", async function () {
          // Owner should be able to pause
          await expect(controller[`_set${action.action}Paused`](true))
            .to.emit(controller, `${action.action}Paused`)
            .withArgs(true);

          expect(await controller[`${actionLower}Paused`]()).to.equal(true);
        });

        it("Should only be able to unpause by owner", async function () {
          // Pause
          await controller[`_set${action.action}Paused`](true);

          // Guardian should not be able to unpause
          await expect(
            controller.connect(guardian)[`_set${action.action}Paused`](false)
          ).to.be.revertedWith(controller, "Only owner can unpause");

          // Owner should be able to pause
          await expect(controller[`_set${action.action}Paused`](false))
            .to.emit(controller, `${action.action}Paused`)
            .withArgs(false);
        });

        it("Should not be able to pause/unpause by others", async function () {
          await expect(
            controller.connect(other)[`_set${action.action}Paused`](true)
          ).to.be.revertedWith(
            controller,
            "Only owner and pause guardian can pause/unpause"
          );

          await expect(
            controller.connect(other)[`_set${action.action}Paused`](false)
          ).to.be.revertedWith(
            controller,
            "Only owner and pause guardian can pause/unpause"
          );
        });

        it(`Should fail in before${action.action}() when paused`, async function () {
          const { controller, iToken0, iToken1, accounts } = await loadFixture(
            fixtureDefault
          );
          const [other1, other2] = accounts;

          // Pause
          await controller[`_set${action.action}Paused`](true);

          switch (action.action) {
            case "Seize":
              await expect(
                controller.beforeSeize(
                  iToken0.address,
                  iToken1.address,
                  await other1.getAddress(),
                  await other2.getAddress(),
                  utils.parseEther("1000")
                )
              ).to.be.revertedWith(`${action.action} has been paused`);
              break;
            case "Transfer":
              await expect(
                controller[`beforeTransfer`](
                  await iToken0.address,
                  await other1.getAddress(),
                  await other2.getAddress(),
                  utils.parseEther("1000")
                )
              ).to.be.revertedWith(`${action.action} has been paused`);
              break;
          }
        });
      }
    });
  });

  describe("Set All paused", function () {
    it("Should be able to set all paused", async function () {
      const { controller, iToken0, iToken1, accounts } = await loadFixture(
        fixtureDefault
      );
      const [other1, other2] = accounts;

      await controller._setAllPaused(true);

      expect(await controller.transferPaused(), true);
      expect(await controller.seizePaused(), true);
      expect(await controller.mintPaused(iToken0.address), true);
      expect(await controller.mintPaused(iToken1.address), true);
      expect(await controller.redeemPaused(iToken0.address), true);
      expect(await controller.redeemPaused(iToken1.address), true);
      expect(await controller.borrowPaused(iToken0.address), true);
      expect(await controller.borrowPaused(iToken1.address), true);

      await expect(
        controller.beforeTransfer(
          await iToken0.address,
          await other1.getAddress(),
          await other2.getAddress(),
          0
        )
      ).to.be.revertedWith("Transfer has been paused");

      await expect(
        controller.beforeSeize(
          await iToken0.address,
          await iToken1.address,
          await other1.getAddress(),
          await other2.getAddress(),
          0
        )
      ).to.be.revertedWith("Seize has been paused");

      await expect(
        controller.beforeMint(
          await iToken0.address,
          await other1.getAddress(),
          0
        )
      ).to.be.revertedWith("Token mint has been paused");

      await expect(
        controller.beforeMint(
          await iToken1.address,
          await other1.getAddress(),
          0
        )
      ).to.be.revertedWith("Token mint has been paused");

      await expect(
        controller.beforeRedeem(
          await iToken0.address,
          await other1.getAddress(),
          0
        )
      ).to.be.revertedWith("Token redeem has been paused");

      await expect(
        controller.beforeRedeem(
          await iToken1.address,
          await other1.getAddress(),
          0
        )
      ).to.be.revertedWith("Token redeem has been paused");

      await expect(
        controller.beforeBorrow(
          await iToken0.address,
          await other1.getAddress(),
          0
        )
      ).to.be.revertedWith("Token borrow has been paused");

      await expect(
        controller.beforeBorrow(
          await iToken1.address,
          await other1.getAddress(),
          0
        )
      ).to.be.revertedWith("Token borrow has been paused");
    });
  });

  it("Should be able to unpause all", async function () {
    const { controller, iToken0, iToken1, accounts } = await loadFixture(
      fixtureDefault
    );
    const [other1, other2] = accounts;

    await controller._setAllPaused(false);

    expect(await controller.transferPaused(), false);
    expect(await controller.seizePaused(), false);
    expect(await controller.mintPaused(iToken0.address), false);
    expect(await controller.mintPaused(iToken1.address), false);
    expect(await controller.redeemPaused(iToken0.address), false);
    expect(await controller.redeemPaused(iToken1.address), false);
    expect(await controller.borrowPaused(iToken0.address), false);
    expect(await controller.borrowPaused(iToken1.address), false);

    await controller.beforeTransfer(
      await iToken0.address,
      await other1.getAddress(),
      await other2.getAddress(),
      0
    );

    await controller.beforeSeize(
      await iToken0.address,
      await iToken1.address,
      await other1.getAddress(),
      await other2.getAddress(),
      0
    );

    await controller.beforeMint(
      await iToken0.address,
      await other1.getAddress(),
      0
    );

    await controller.beforeMint(
      await iToken1.address,
      await other1.getAddress(),
      0
    );

    await controller.beforeRedeem(
      await iToken0.address,
      await other1.getAddress(),
      0
    );

    await controller.beforeRedeem(
      await iToken1.address,
      await other1.getAddress(),
      0
    );

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [iToken0.address],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [iToken1.address],
    });

    const signer0 = await ethers.provider.getSigner(iToken0.address);
    const signer1 = await ethers.provider.getSigner(iToken1.address);

    await controller
      .connect(signer0)
      .callStatic.beforeBorrow(
        await iToken0.address,
        await other1.getAddress(),
        0
      );

    await controller
      .connect(signer1)
      .callStatic.beforeBorrow(
        await iToken1.address,
        await other1.getAddress(),
        0
      );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [iToken0.address],
    });
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [iToken1.address],
    });
  });

  describe("Set Reward Distributor", function () {
    it("Should only allow owner to set new reward distributor", async function () {
      const {
        controller,
        mockPriceOracle,
        rewardDistributor,
        owner,
        accounts,
      } = await loadFixture(fixtureDefault);

      await verifyOnlyOwner(
        controller, //contract
        "_setRewardDistributor", // method
        [mockPriceOracle.address], //args
        owner, // owner
        accounts[0], // non-owner
        "NewRewardDistributor", // ownerEvent
        [rewardDistributor.address, mockPriceOracle.address], // ownerEventArgs
        // ownerChecks
        async () => {
          expect(await controller.rewardDistributor()).to.equal(
            mockPriceOracle.address
          );
        },
        // nonownerChecks
        async () => {
          expect(await controller.rewardDistributor()).to.equal(
            rewardDistributor.address
          );
        }
      );
    });

    it("Should not be able to set invalid or same reward distributor", async function () {
      const { controller, rewardDistributor } = await loadFixture(
        fixtureDefault
      );

      await expect(
        controller._setRewardDistributor(ethers.constants.AddressZero)
      ).to.be.revertedWith("Reward Distributor address invalid");

      await expect(
        controller._setRewardDistributor(rewardDistributor.address)
      ).to.be.revertedWith("Reward Distributor address invalid");
    });
  });
});
