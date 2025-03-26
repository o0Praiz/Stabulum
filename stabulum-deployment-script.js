const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Stabulum Token
  console.log("Deploying Stabulum Token...");
  const Stabulum = await ethers.getContractFactory("Stabulum");
  const stabulum = await upgrades.deployProxy(Stabulum, [deployer.address], { initializer: 'initialize' });
  await stabulum.deployed();
  console.log("Stabulum Token deployed to:", stabulum.address);

  // Deploy Stabulum Reserve Manager
  console.log("Deploying Reserve Manager...");
  const StabulumReserveManager = await ethers.getContractFactory("StabulumReserveManager");
  const reserveManager = await upgrades.deployProxy(
    StabulumReserveManager, 
    [deployer.address, stabulum.address], 
    { initializer: 'initialize' }
  );
  await reserveManager.deployed();
  console.log("Reserve Manager deployed to:", reserveManager.address);

  // Deploy Stabulum KYC Provider
  console.log("Deploying KYC Provider...");
  const StabulumKYCProvider = await ethers.getContractFactory("StabulumKYCProvider");
  const kycProvider = await upgrades.deployProxy(
    StabulumKYCProvider, 
    [deployer.address], 
    { initializer: 'initialize' }
  );
  await kycProvider.deployed();
  console.log("KYC Provider deployed to:", kycProvider.address);

  // Deploy TimelockController for Governance
  const minDelay = 2 * 24 * 60 * 60; // 2 days
  const proposers = [deployer.address];
  const executors = [deployer.address];
  console.log("Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.deployed();
  console.log("TimelockController deployed to:", timelock.address);

  // Deploy Governance Token
  console.log("Deploying Governance Token...");
  const StabulumGovernanceToken = await ethers.getContractFactory("StabulumGovernanceToken");
  const govToken = await StabulumGovernanceToken.deploy("Stabulum Governance", "STABGOV");
  await govToken.deployed();
  console.log("Governance Token deployed to:", govToken.address);
  
  // Mint governance tokens to the deployer
  const mintAmount = ethers.utils.parseEther("1000000"); // 1 million tokens
  await govToken.mint(deployer.address, mintAmount);
  console.log("Minted governance tokens to deployer");

  // Deploy Governance Contract
  console.log("Deploying Stabulum Governance...");
  const votingDelay = 1; // 1 block
  const votingPeriod = 45818; // ~1 week
  const proposalThreshold = ethers.utils.parseEther("100000"); // 100k tokens
  const quorumPercentage = 4; // 4% quorum
  
  const StabulumGovernance = await ethers.getContractFactory("StabulumGovernance");
  const governance = await StabulumGovernance.deploy(
    govToken.address,
    timelock.address,
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorumPercentage
  );
  await governance.deployed();
  console.log("Stabulum Governance deployed to:", governance.address);

  // Deploy Bridge Contract with 3 required validations
  console.log("Deploying Bridge Contract...");
  const StabulumBridge = await ethers.getContractFactory("StabulumBridge");
  const bridge = await upgrades.deployProxy(
    StabulumBridge, 
    [deployer.address, stabulum.address, 3], 
    { initializer: 'initialize' }
  );
  await bridge.deployed();
  console.log("Bridge Contract deployed to:", bridge.address);

  // Set up roles
  console.log("Setting up roles...");
  
  // Grant MINTER_ROLE to Reserve Manager
  const MINTER_ROLE = await stabulum.MINTER_ROLE();
  await stabulum.grantRole(MINTER_ROLE, reserveManager.address);
  console.log("Granted MINTER_ROLE to Reserve Manager");
  
  // Grant BURNER_ROLE to Reserve Manager
  const BURNER_ROLE = await stabulum.BURNER_ROLE();
  await stabulum.grantRole(BURNER_ROLE, reserveManager.address);
  console.log("Granted BURNER_ROLE to Reserve Manager");
  
  // Grant MINTER_ROLE and BURNER_ROLE to Bridge
  await stabulum.grantRole(MINTER_ROLE, bridge.address);
  await stabulum.grantRole(BURNER_ROLE, bridge.address);
  console.log("Granted roles to Bridge Contract");

  // Set up initial validators for the bridge
  console.log("Setting up bridge validators...");
  const VALIDATOR_ROLE = await bridge.VALIDATOR_ROLE();
  
  // For demo purposes, we're using the deployer as a validator
  // In production, you would use different addresses
  await bridge.grantRole(VALIDATOR_ROLE, deployer.address);
  
  // In production, add more validators here
  
  console.log("Deployment complete!");
  
  // Return all deployed contract addresses for verification
  return {
    Stabulum: stabulum.address,
    ReserveManager: reserveManager.address,
    KYCProvider: kycProvider.address,
    GovernanceToken: govToken.address,
    TimelockController: timelock.address,
    Governance: governance.address,
    Bridge: bridge.address
  };
}

main()
  .then((deployedContracts) => {
    console.log("All deployed contracts:");
    console.log(deployedContracts);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
