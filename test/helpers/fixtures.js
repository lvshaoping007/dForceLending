const { utils, BigNumber } = require("ethers");
const { waffle } = require("hardhat");
const { createFixtureLoader, deployMockContract } = waffle;

const MockPriceOracle = require("../../artifacts/contracts/interface/IPriceOracle.sol/IPriceOracle.json");

// Use ethers provider instead of waffle's default MockProvider
const loadFixture = createFixtureLoader([], ethers.provider);

let oracle;

const collateralFactor = utils.parseEther("0.9");
const borrowFactor = utils.parseEther("1");
const supplyCapacity = ethers.constants.MaxUint256;
const borrowCapacity = ethers.constants.MaxUint256;
const distributionFactor = utils.parseEther("1");

async function setConfig(iToken) {
  await iToken._setNewReserveRatio(utils.parseEther("0.075"));
  await iToken._setNewFlashloanFeeRatio(utils.parseEther("0.0009"));
  await iToken._setNewProtocolFeeRatio(utils.parseEther("0.1"));
}

async function setPrices(iToken) {
  const [owner, ...accounts] = await ethers.getSigners();
  const decimals = await iToken.decimals();

  // Assumes current price is $590, that is 1 ETH = 590 USDC.
  const feedingPrice = utils.parseEther("1").div("590");
  const autualFeedingPrice = feedingPrice.mul(
    BigNumber.from(10).pow(18 - decimals)
  );

  // Sets price.
  await oracle
    .connect(owner)
    .setPrices([iToken.address], [autualFeedingPrice]);
}

async function distributeUnderlying(underlying, iToken) {
  const [owner, ...accounts] = await ethers.getSigners();

  const rawAmount = BigNumber.from("10000000");
  const decimals = await underlying.decimals();

  let actualAmount = rawAmount.mul(BigNumber.from(10).pow(decimals));

  for (const account of accounts) {
    await underlying.mint(await account.getAddress(), actualAmount);

    await underlying
      .connect(account)
      .approve(iToken.address, ethers.constants.MaxUint256);
  }
}

// Simulate to mine new blocks.
async function increaseBlock(blockNumber) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}

// Simulate the time passed.
async function increaseTime(time) {
  await hre.network.provider.request({
    method: "evm_increaseTime",
    params: [time],
  });
}

// Get current block number.
async function getBlock() {
  const rawBlockNumber = await hre.network.provider.request({
    method: "eth_blockNumber",
    params: [],
  });
  return parseInt(rawBlockNumber, 16);
}

// Get current chain id
async function getChainId() {
  return hre.network.provider.request({
    method: "eth_chainId",
    params: [],
  });
}

async function deployiToken(
  underlyingName,
  underlyingSymbol,
  underlyingDecimals,
  iTokenName,
  iTokenSymbol,
  controller,
  interestRateModel,
  addToMarket
) {
  const ERC20 = await ethers.getContractFactory("Token");
  const underlying = await ERC20.deploy(
    underlyingName,
    underlyingSymbol,
    underlyingDecimals
  );
  await underlying.deployed();

  const IToken = await ethers.getContractFactory("iToken");
  const iToken = await upgrades.deployProxy(
    IToken,
    [
      underlying.address,
      iTokenName,
      iTokenSymbol,
      controller.address,
      interestRateModel.address,
    ],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );

  await setConfig(iToken);

  await distributeUnderlying(underlying, iToken);

  await setPrices(iToken);

  if (addToMarket) {
    await controller._addMarket(
      iToken.address,
      collateralFactor,
      borrowFactor,
      supplyCapacity,
      borrowCapacity,
      distributionFactor
    );
  }

  return { underlying, iToken };
}

async function addiETH(
  iTokenName,
  iTokenSymbol,
  controller,
  interestRateModel
) {
  // const ERC20 = await ethers.getContractFactory("Token");
  // const underlying = await ERC20.deploy(underlyingName, underlyingSymbol, underlyingDecimals);
  // await underlying.deployed();

  const IETH = await ethers.getContractFactory("iETH");
  const iETH = await upgrades.deployProxy(
    IETH,
    [
      // underlying.address,
      iTokenName,
      iTokenSymbol,
      controller.address,
      interestRateModel.address,
    ],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );

  await setConfig(iETH);

  // await distributeUnderlying(underlying, iETH);
  const [owner, ...accounts] = await ethers.getSigners();
  // const decimals = await iToken.decimals();

  // Assumes current price is $590, that is 1 ETH = 590 USDC.
  // const feedingPrice = (utils.parseEther("1")).div("590");
  // const autualFeedingPrice = feedingPrice.mul(BigNumber.from(10).pow(18 - decimals));

  // Sets price.
  await oracle
    .connect(owner)
    .setPrices([iETH.address], [utils.parseEther("1")]);

  // await setPrices(iETH);

  // Need to set price before before add market
  await controller._addMarket(
    iETH.address,
    collateralFactor,
    borrowFactor,
    supplyCapacity,
    borrowCapacity,
    distributionFactor
  );

  return { iETH };
}

async function deployRewardDistributor(controller) {
  const RewardDistributor = await ethers.getContractFactory(
    "RewardDistributor"
  );

  const rewardDistributor = await upgrades.deployProxy(
    RewardDistributor,
    [controller.address],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );

  return { rewardDistributor };
}

async function fixtureDeployController([wallet, other], provider) {
  const Controller = await ethers.getContractFactory("Controller");

  const controller = await upgrades.deployProxy(Controller, [], {
    unsafeAllowCustomTypes: true,
    initializer: "initialize",
  });

  return { controller };
}

// Deploys the actually price oracle contract.
async function fixtureDeployOracle() {
  const [owner, ...accounts] = await ethers.getSigners();
  const Oracle = await ethers.getContractFactory("PriceOracle");
  oracle = await Oracle.deploy(owner.address, utils.parseEther("0.01"));
  await oracle.deployed();

  return oracle;
}

// deploys interest rate model contract.
async function fixtureDeployInterestRateModel(
  baseInterestPerYear,
  interestPerYear,
  highInterestPerYear,
  high
) {
  const InterestRateModel = await ethers.getContractFactory(
    "InterestRateModel"
  );
  const interestRateModel = await InterestRateModel.deploy(
    utils.parseEther(baseInterestPerYear.toString()),
    utils.parseEther(interestPerYear.toString()),
    utils.parseEther(highInterestPerYear.toString()),
    utils.parseEther(high.toString())
  );
  await interestRateModel.deployed();

  return interestRateModel;
}

async function fixtureMarketsAdded([wallet, other], provider) {
  const { controller } = await loadFixture(fixtureDeployController);

  const interestRateModel = await fixtureDeployInterestRateModel(
    0,
    0.08,
    1,
    0.75
  );

  const priceOracle = await fixtureDeployOracle();
  await controller._setPriceOracle(priceOracle.address);

  // Reward Distributor
  let rewardDistributor = (await deployRewardDistributor(controller))
    .rewardDistributor;
  await controller._setRewardDistributor(rewardDistributor.address);

  const { underlying: underlying0, iToken: iToken0 } = await deployiToken(
    "Mock Token 0",
    "MT0",
    18,
    "dForce lending token 0",
    "iToken 0",
    controller,
    interestRateModel,
    true
  );

  const { underlying: underlying1, iToken: iToken1 } = await deployiToken(
    "Mock Token 1",
    "MT1",
    6,
    "dForce lending token 1",
    "iToken 1",
    controller,
    interestRateModel,
    true
  );

  const { iETH: iETH } = await addiETH(
    "dForce lending ETH",
    "iETH",
    controller,
    interestRateModel
  );

  return {
    controller,
    iToken0,
    underlying0,
    iToken1,
    underlying1,
    iETH,
    interestRateModel,
    priceOracle,
    rewardDistributor,
  };
}

async function fixtureDefault([wallet, other], provider) {
  const {
    controller,
    iToken0,
    underlying0,
    iToken1,
    underlying1,
    iETH,
    interestRateModel,
    priceOracle,
    rewardDistributor,
  } = await loadFixture(fixtureMarketsAdded);
  const [owner, ...accounts] = await ethers.getSigners();

  // TODO: remove out: flashloan executor.
  // Deploys flashloan executor contract.
  const FlashloanExecutor = await ethers.getContractFactory(
    "FlashloanExecutor"
  );
  const flashloanExecutor = await FlashloanExecutor.deploy();
  await flashloanExecutor.deployed();

  // Deploys a bad flashloan executor contract.
  const FlashloanExecutorFailure = await ethers.getContractFactory(
    "FlashloanExecutorFailure"
  );
  const flashloanExecutorFailure = await FlashloanExecutorFailure.deploy();
  await flashloanExecutorFailure.deployed();

  // Init Mock Price Oracle
  const mockPriceOracle = await deployMockContract(owner, MockPriceOracle.abi);
  let price = utils.parseEther("1");

  await mockPriceOracle.mock.getUnderlyingPrice
    .withArgs(iToken0.address)
    .returns(price);

  await mockPriceOracle.mock.getUnderlyingPrice
    .withArgs(iToken1.address)
    .returns(price.mul(BigNumber.from(10).pow(18 - 6)));

  await mockPriceOracle.mock.getUnderlyingPrice
    .withArgs(iETH.address)
    .returns(price.mul(BigNumber.from(10).pow(18).mul(641)));

  // Init close factor
  let closeFactor = utils.parseUnits("0.5", 18);
  await controller._setCloseFactor(closeFactor);

  // Init liquidation incentive
  let liquidationIncentive = utils.parseUnits("1.1", 18);
  await controller._setLiquidationIncentive(liquidationIncentive);

  return {
    controller,
    iToken0,
    underlying0,
    iToken1,
    underlying1,
    iETH,
    interestRateModel,
    mockPriceOracle,
    owner,
    accounts,
    flashloanExecutor,
    flashloanExecutorFailure,
    priceOracle,
    rewardDistributor,
  };
}

async function fixtureShortfall([wallet, other], provider) {
  const {
    controller,
    iToken0,
    underlying0,
    iToken1,
    underlying1,
    interestRateModel,
    mockPriceOracle,
    owner,
    accounts,
    flashloanExecutor,
    priceOracle,
  } = await loadFixture(fixtureDefault);

  const [user0, user1] = accounts;
  const account0 = await user0.getAddress();
  const account1 = await user1.getAddress();
  let rawAmount = BigNumber.from("1000");
  const iToken0Decimals = await iToken0.decimals();
  const iToken1Decimals = await iToken1.decimals();
  let mintiToken0Amount = rawAmount.mul(
    BigNumber.from(10).pow(iToken0Decimals)
  );
  let mintiToken1Amount = rawAmount.mul(
    BigNumber.from(10).pow(iToken1Decimals)
  );
  let amount = mintiToken0Amount;

  // Use mock oracle
  await controller._setPriceOracle(mockPriceOracle.address);

  await iToken0.connect(user0).mint(account0, amount);
  await iToken1.connect(user1).mint(account1, mintiToken1Amount);

  // User use iToken0 as collateral, and borrow some underlying1
  await controller
    .connect(user0)
    .enterMarkets([iToken0.address, iToken1.address]);
  await iToken1
    .connect(user0)
    .borrow(mintiToken1Amount.div(2).mul(9).div(10));

  // underlying0 price drop to 0.5
  await mockPriceOracle.mock.getUnderlyingPrice
    .withArgs(iToken0.address)
    .returns(ethers.utils.parseUnits("0.5", 18));

  return {
    controller,
    iToken0,
    underlying0,
    iToken1,
    underlying1,
    interestRateModel,
    mockPriceOracle,
    owner,
    accounts,
    flashloanExecutor,
    priceOracle,
  };
}

async function getiTokenCurrentData(iTokenContract, increaseblock = 0) {
  let accrualBlockNumber = ethers.BigNumber.from(await getBlock()).add(
    ethers.BigNumber.from(increaseblock)
  );
  let borrowRate = await iTokenContract.borrowRatePerBlock();
  let simpleInterestFactor = borrowRate.mul(
    accrualBlockNumber.sub(await iTokenContract.accrualBlockNumber())
  );

  let totalBorrows = await iTokenContract.totalBorrows();
  let base = ethers.utils.parseEther("1");
  let interestAccumulated = simpleInterestFactor.mul(totalBorrows).div(base);
  totalBorrows = interestAccumulated.add(totalBorrows);

  let totalReserves = await iTokenContract.totalReserves();
  let reserveRatio = await iTokenContract.reserveRatio();
  totalReserves = reserveRatio
    .mul(interestAccumulated)
    .div(base)
    .add(totalReserves);

  let borrowIndex = await iTokenContract.borrowIndex();
  borrowIndex = simpleInterestFactor
    .mul(borrowIndex)
    .div(base)
    .add(borrowIndex);

  let totalSupply = await iTokenContract.totalSupply();
  let cash = await iTokenContract.getCash();
  let exchangeRate =
    totalSupply.toString() == "0"
      ? base
      : cash.add(totalBorrows).sub(totalReserves).mul(base).div(totalSupply);

  return {
    cash,
    borrowRate,
    accrualBlockNumber,
    totalSupply,
    totalBorrows,
    totalReserves,
    exchangeRate,
    borrowIndex,
  };
}

module.exports = {
  fixtureDefault,
  fixtureDeployController,
  fixtureDeployInterestRateModel,
  fixtureMarketsAdded,
  fixtureShortfall,
  getiTokenCurrentData,
  getBlock,
  getChainId,
  increaseBlock,
  increaseTime,
  deployiToken,
  loadFixture,
};
