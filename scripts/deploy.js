const hre = require("hardhat");

// 10**12
const mantissaUSDT = ethers.utils.parseEther("1").div("1000000");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // interest contract config.
  const baseInterest = ethers.utils.parseEther("0");
  const interest = ethers.utils.parseEther("0.08");
  const highInterest = ethers.utils.parseEther("1");
  const high = ethers.utils.parseEther("0.75");

  // deploy interest contract.
  console.log("Deploy interest model");
  const InterestModel = await hre.ethers.getContractFactory(
    "InterestRateModel"
  );
  const interestModel = await InterestModel.deploy(
    baseInterest,
    interest,
    highInterest,
    high
  );
  await interestModel.deployTransaction.wait(2);
  console.log("interest model contract", interestModel.address, "\n");

  // deploy controller contract.
  console.log("Deploy controller");
  const Controller = await hre.ethers.getContractFactory("Controller");
  const controller = await upgrades.deployProxy(Controller, [], {
    unsafeAllowCustomTypes: true,
    initializer: "initialize",
  });
  console.log("controller contract", controller.address, "\n");

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await upgrades.deployProxy(
    RewardDistributor,
    [controller.address],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );
  console.log("set rewardDistributor address\n");

  let tx = await controller._setRewardDistributor(rewardDistributor.address);
  await tx.wait(2);

  // mock USDT on the kovan.
  const usdt = "0x128c10cAD3780a541325A2f4B9E449114aD11D6b";
  // deploy iUSDT.
  console.log("Deploy iUSDT contract");
  const iUSDTI = await hre.ethers.getContractFactory("iToken");
  const iUSDT = await upgrades.deployProxy(
    iUSDTI,
    [
      usdt,
      "dForce Lending USDT",
      "iUSDT",
      controller.address,
      interestModel.address,
    ],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );
  console.log("iUSDT contract", iUSDT.address, "\n");

  // set reserve ratio: 7.5%
  console.log("set reserve ratio");
  let iUSDTReserveRation = ethers.utils.parseEther("0.075");
  tx = await iUSDT._setNewReserveRatio(iUSDTReserveRation);
  await tx.wait(2);
  // set flashloan fee ratio: 0.09%
  console.log("set flashloan fee");
  tx = await iUSDT._setNewFlashloanFeeRatio(ethers.utils.parseEther("0.0009"));
  await tx.wait(2);
  // set protocol fee ratio: 10%
  console.log("set protocol fee", "\n");
  tx = await iUSDT._setNewProtocolFeeRatio(ethers.utils.parseEther("0.1"));
  await tx.wait(2);

  // mock USDC on the kovan.
  const usdc = "0x2ebE5cC3DE787C692c8458106f98B4A8392E111B";
  // deploy iUSDC.
  console.log("Deploy iUSDC contract");
  const iUSDCI = await hre.ethers.getContractFactory("iToken");
  const iUSDC = await upgrades.deployProxy(
    iUSDCI,
    [
      usdc,
      "dForce Lending USDC",
      "iUSDC",
      controller.address,
      interestModel.address,
    ],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );
  console.log("iUSDC contract", iUSDC.address, "\n");

  // set reserve ratio: 7.5%
  console.log("set reserve ratio");
  let iUSDCReserveRation = ethers.utils.parseEther("0.075");
  tx = await iUSDC._setNewReserveRatio(iUSDCReserveRation);
  await tx.wait(2);
  // set flashloan fee ratio: 0.09%
  console.log("set flashloan fee");
  tx = await iUSDC._setNewFlashloanFeeRatio(ethers.utils.parseEther("0.0009"));
  await tx.wait(2);
  // set protocol fee ratio: 10%
  console.log("set protocol fee", "\n");
  tx = await iUSDC._setNewProtocolFeeRatio(ethers.utils.parseEther("0.1"));
  await tx.wait(2);

  // mock USDx on the kovan.
  const usdx = "0xC251A1Da17bE0Cea838f087051D0Cbf683B53054";
  // deploy iUSDx.
  console.log("Deploy iUSDx contract");
  const iUSDxI = await hre.ethers.getContractFactory("iToken");
  const iUSDx = await upgrades.deployProxy(
    iUSDxI,
    [
      usdx,
      "dForce Lending USDx",
      "iUSDx",
      controller.address,
      interestModel.address,
    ],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );
  console.log("iUSDx contract", iUSDx.address, "\n");

  // set reserve ratio: 7.5%
  console.log("set reserve ratio");
  let iUSDxReserveRation = ethers.utils.parseEther("0.075");
  tx = await iUSDx._setNewReserveRatio(iUSDxReserveRation);
  await tx.wait(2);
  // set flashloan fee ratio: 0.09%
  console.log("set flashloan fee");
  tx = await iUSDx._setNewFlashloanFeeRatio(ethers.utils.parseEther("0.0009"));
  await tx.wait(2);
  // set protocol fee ratio: 10%
  console.log("set protocol fee", "\n");
  tx = await iUSDx._setNewProtocolFeeRatio(ethers.utils.parseEther("0.1"));
  await tx.wait(2);

  console.log("Deploy iETH contract");
  const iETHI = await hre.ethers.getContractFactory("iETH");
  const iETH = await upgrades.deployProxy(
    iETHI,
    ["dForce Lending USDT", "iETH", controller.address, interestModel.address],
    {
      unsafeAllowCustomTypes: true,
      initializer: "initialize",
    }
  );
  console.log("iETH contract", iETH.address, "\n");

  // set reserve ratio: 7.5%
  console.log("set reserve ratio");
  let iETHReserveRation = ethers.utils.parseEther("0.075");
  tx = await iETH._setNewReserveRatio(iETHReserveRation);
  await tx.wait(2);
  // set flashloan fee ratio: 0.09%
  console.log("set flashloan fee");
  tx = await iETH._setNewFlashloanFeeRatio(ethers.utils.parseEther("0.0009"));
  await tx.wait(2);
  // set protocol fee ratio: 10%
  console.log("set protocol fee", "\n");
  tx = await iETH._setNewProtocolFeeRatio(ethers.utils.parseEther("0.1"));
  await tx.wait(2);

  const collateralFactor = ethers.utils.parseEther("0.9");
  const borrowFactor = ethers.utils.parseEther("1");
  const supplyCapacity = ethers.constants.MaxUint256;
  const borrowCapacity = ethers.constants.MaxUint256;
  const distributionFactor = ethers.utils.parseEther("1");

  // init close factor
  console.log("set close factor");
  let closeFactor = ethers.utils.parseEther("0.5");
  tx = await controller._setCloseFactor(closeFactor);
  await tx.wait(2);

  // init liquidation incentive
  console.log("set liquidation incentive", "\n");
  let liquidationIncentive = ethers.utils.parseEther("1.1");
  tx = await controller._setLiquidationIncentive(liquidationIncentive);
  await tx.wait(2);

  // Deploys oracle.
  console.log("Deploy oracle contract");
  const Oracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await Oracle.deploy(
    deployer.address,
    ethers.utils.parseEther("0.01")
  );
  await priceOracle.deployTransaction.wait(2);
  console.log("oracle contract", priceOracle.address, "\n");

  // Sets price.
  console.log("set prices");
  const feedingPrice = ethers.utils.parseEther("1").div("648");
  tx = await priceOracle
    .connect(deployer)
    .setPrices(
      [iUSDT.address, iUSDC.address, iUSDx.address, iETH.address],
      [
        feedingPrice.mul(mantissaUSDT),
        feedingPrice.mul(mantissaUSDT),
        feedingPrice,
        ethers.utils.parseEther("1"),
      ]
  );
  await tx.wait(2);

  // Sets oracle in the controller contract.
  console.log("set oracle in the controller");
  await controller.connect(deployer)._setPriceOracle(priceOracle.address);

  // add token to the controller.
  console.log("add iUSDT to the market");
  tx = await controller._addMarket(
    iUSDT.address,
    collateralFactor,
    borrowFactor,
    supplyCapacity,
    borrowCapacity,
    distributionFactor
  );
  await tx.wait(2);

  console.log("add iUSDx to the market");
  tx = await controller._addMarket(
    iUSDx.address,
    collateralFactor,
    borrowFactor,
    supplyCapacity,
    borrowCapacity,
    distributionFactor
  );
  await tx.wait(2);

  console.log("add iETH to the market");
  tx = await controller._addMarket(
    iETH.address,
    collateralFactor,
    borrowFactor,
    supplyCapacity,
    borrowCapacity,
    distributionFactor
  );
  await tx.wait(2);

  console.log("add iUSDC to the market");
  await controller._addMarket(
    iUSDC.address,
    ethers.utils.parseEther("0"),
    borrowFactor,
    supplyCapacity,
    borrowCapacity,
    distributionFactor
  );
  await tx.wait(2);

  // Deploys lendingData.
  console.log("Deploy lendingData contract");
  const LendingData = await hre.ethers.getContractFactory("LendingData");
  const lendingData = await LendingData.deploy(
    controller.address,
    iUSDx.address,
    iETH.address
  );
  await lendingData.deployed();

  console.log("lendingData contract", lendingData.address, "\n");

  console.log("Controller :     ", controller.address);
  console.log("InterestModel :  ", interestModel.address, "\n");
  console.log("PriceOracle :    ", priceOracle.address);
  console.log("LendingData :    ", lendingData.address, "\n");
  console.log("USDT :           ", usdt);
  console.log("iUSDT :          ", iUSDT.address, "\n");
  console.log("USDx :           ", usdx);
  console.log("iUSDx :          ", iUSDx.address, "\n");
  console.log("USDC :           ", usdc);
  console.log("iUSDC :          ", iUSDC.address, "\n");
  console.log("iETH :           ", iETH.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
