const { expect, use } = require("chai");
const { utils, BigNumber } = require("ethers");
const { upgrades } = require("hardhat");

const USE_HARDHAT_UPGRADES = false;

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

function divup(a, b) {
  return a.add(b.sub(1)).div(b);
}

function getInitializerData(ImplFactory, args, initializer) {
  if (initializer === false) {
    return "0x";
  }

  const allowNoInitialization = initializer === undefined && args.length === 0;
  initializer = initializer ?? "initialize";

  try {
    const fragment = ImplFactory.interface.getFunction(initializer);
    return ImplFactory.interface.encodeFunctionData(fragment, args);
  } catch (e) {
    if (e instanceof Error) {
      if (allowNoInitialization && e.message.includes("no matching function")) {
        return "0x";
      }
    }
    throw e;
  }
}

let proxyAdmin;

async function getProxyAdmin() {
  if (proxyAdmin?.address) {
    return proxyAdmin;
  }

  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  proxyAdmin = await ProxyAdmin.deploy();
  await proxyAdmin.deployed();

  return proxyAdmin;
}

async function myDeployProxy(contractFactory, args, params) {
  const impl = await contractFactory.deploy();
  await impl.deployed();

  // console.log("Implementation deployed at: ", impl.address);

  const data = getInitializerData(contractFactory, args, params.initializer);
  const adminAddress = (await getProxyAdmin()).address;

  const Proxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
  const proxy = await Proxy.deploy(impl.address, adminAddress, data);
  await proxy.deployed();

  // console.log("Proxy deployed at: ", proxy.address);

  const contract = contractFactory.attach(proxy.address);

  // console.log(contract);

  return contract;
}

async function myUpgradeProxy(proxyAddress, contractFactory) {
  const admin = await getProxyAdmin();

  const nextImpl = await contractFactory.deploy();
  await nextImpl.deployed();

  await admin.upgrade(proxyAddress, nextImpl.address);

  return contractFactory.attach(proxyAddress);
}

async function deployProxy(contractFactory, args, params) {
  if (USE_HARDHAT_UPGRADES) {
    return await upgrades.deployProxy(contractFactory, args, params);
  } else {
    return await myDeployProxy(contractFactory, args, params);
  }
}

async function upgradeProxy(proxyAddress, contractFactory, params) {
  if (USE_HARDHAT_UPGRADES) {
    return await upgrades.upgradeProxy(proxyAddress, contractFactory, params);
  } else {
    return await myUpgradeProxy(proxyAddress, contractFactory, params);
  }
}

module.exports = {
  verifyOnlyOwner,
  setOraclePrice,
  parseTokenAmount,
  formatTokenAmount,
  verifyAllowError,
  deployProxy,
  upgradeProxy,
  getProxyAdmin,
  rmul,
  rdiv,
  divup,
};
