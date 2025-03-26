// Stabulum Testing Framework
// Comprehensive testing framework for all components of the Stabulum stablecoin ecosystem

const { ethers } = require('hardhat');
const chai = require('chai');
const { solidity } = require('ethereum-waffle');
const { expect } = chai;
const { time } = require('@openzeppelin/test-helpers');
const { BigNumber } = require('ethers');

chai.use(solidity);

// Main testing framework class
class StabulumTestFramework {
  constructor() {
    this.accounts = [];
    this.contracts = {};
    this.snapshotId = 0;
  }
  
  // Setup testing environment
  async initialize() {
    // Get signers (test accounts)
    this.accounts = await ethers.getSigners();
    
    // Define roles for readability
    this.deployer = this.accounts[0];
    this.admin = this.accounts[1];
    this.treasury = this.accounts[2];
    this.user1 = this.accounts[3];
    this.user2 = this.accounts[4];
    this.user3 = this.accounts[5];
    this.liquidityProvider = this.accounts[6];
    this.validator = this.accounts[7];
    this.attacker = this.accounts[8];
    this.mockExchange = this.accounts[9];
    
    console.log("Test framework initialized with accounts");
    
    // Take a snapshot to reset to after each test
    this.snapshotId = await this.takeSnapshot();
  }
  
  // Deploy core contracts
  async deployCore() {
    console.log("Deploying core contracts...");
    
    // Deploy ERC20 token contract
    const StabulumToken = await ethers.getContractFactory("StabulumToken");
    this.contracts.token = await StabulumToken.connect(this.deployer).deploy();
    await this.contracts.token.deployed();
    console.log("StabulumToken deployed:", this.contracts.token.address);
    
    // Deploy reserve manager
    const ReserveManager = await ethers.getContractFactory("StabulumReserveManager");
    this.contracts.reserveManager = await ReserveManager.connect(this.deployer).deploy(
      this.contracts.token.address,
      this.treasury.address
    );
    await this.contracts.reserveManager.deployed();
    console.log("ReserveManager deployed:", this.contracts.reserveManager.address);
    
    // Deploy governance contract
    const Governance = await ethers.getContractFactory("StabulumGovernance");
    this.contracts.governance = await Governance.connect(this.deployer).deploy(
      this.contracts.token.address
    );
    await this.contracts.governance.deployed();
    console.log("Governance deployed:", this.contracts.governance.address);
    
    // Deploy stability mechanism
    const StabilityMechanism = await ethers.getContractFactory("StabulumStabilityMechanism");
    this.contracts.stabilityMechanism = await StabilityMechanism.connect(this.deployer).deploy(
      this.contracts.token.address,
      this.contracts.reserveManager.address
    );
    await this.contracts.stabilityMechanism.deployed();
    console.log("StabilityMechanism deployed:", this.contracts.stabilityMechanism.address);
    
    // Initialize token with controllers
    await this.contracts.token.connect(this.deployer).initialize(
      "Stabulum",
      "STAB",
      this.contracts.reserveManager.address,
      this.contracts.stabilityMechanism.address
    );
    
    // Initialize reserve manager with required parameters
    await this.contracts.reserveManager.connect(this.deployer).initialize();
    
    // Setup access controls
    await this.setupAccessControls();
    
    console.log("Core contract deployment complete");
  }
  
  // Deploy auxiliary contracts
  async deployAuxiliary() {
    console.log("Deploying auxiliary contracts...");
    
    // Deploy KYC provider
    const KYCProvider = await ethers.getContractFactory("StabulumKYCProvider");
    this.contracts.kycProvider = await KYCProvider.connect(this.deployer).deploy();
    await this.contracts.kycProvider.deployed();
    console.log("KYCProvider deployed:", this.contracts.kycProvider.address);
    
    // Deploy cross-chain bridge
    const CrossChainBridge = await ethers.getContractFactory("StabulumCrossChainBridge");
    this.contracts.bridge = await CrossChainBridge.connect(this.deployer).deploy(
      this.contracts.token.address
    );
    await this.contracts.bridge.deployed();
    console.log("CrossChainBridge deployed:", this.contracts.bridge.address);
    
    // Deploy fee distributor
    const FeeDistributor = await ethers.getContractFactory("StabulumFeeDistributor");
    this.contracts.feeDistributor = await FeeDistributor.connect(this.deployer).deploy(
      this.contracts.token.address,
      this.treasury.address
    );
    await this.contracts.feeDistributor.deployed();
    console.log("FeeDistributor deployed:", this.contracts.feeDistributor.address);
    
    // Deploy oracle integration
    const OracleIntegration = await ethers.getContractFactory("StabulumOracleIntegration");
    this.contracts.oracle = await OracleIntegration.connect(this.deployer).deploy();
    await this.contracts.oracle.deployed();
    console.log("OracleIntegration deployed:", this.contracts.oracle.address);
    
    // Deploy DEX liquidity integration
    const DEXIntegration = await ethers.getContractFactory("StabulumDEXLiquidityIntegration");
    this.contracts.dexIntegration = await DEXIntegration.connect(this.deployer).deploy(
      this.contracts.token.address
    );
    await this.contracts.dexIntegration.deployed();
    console.log("DEXIntegration deployed:", this.contracts.dexIntegration.address);
    
    console.log("Auxiliary contract deployment complete");
  }
  
  // Deploy mock contracts for testing
  async deployMocks() {
    console.log("Deploying mock contracts...");
    
    // Deploy mock price feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    this.contracts.mockPriceFeed = await MockPriceFeed.connect(this.deployer).deploy();
    await this.contracts.mockPriceFeed.deployed();
    console.log("MockPriceFeed deployed:", this.contracts.mockPriceFeed.address);
    
    // Deploy mock reserve assets
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    this.contracts.mockUSDC = await MockERC20.connect(this.deployer).deploy("Mock USDC", "mUSDC", 6);
    await this.contracts.mockUSDC.deployed();
    console.log("MockUSDC deployed:", this.contracts.mockUSDC.address);
    
    this.contracts.mockUSDT = await MockERC20.connect(this.deployer).deploy("Mock USDT", "mUSDT", 6);
    await this.contracts.mockUSDT.deployed();
    console.log("MockUSDT deployed:", this.contracts.mockUSDT.address);
    
    this.contracts.mockDAI = await MockERC20.connect(this.deployer).deploy("Mock DAI", "mDAI", 18);
    await this.contracts.mockDAI.deployed();
    console.log("MockDAI deployed:", this.contracts.mockDAI.address);
    
    // Deploy mock exchange
    const MockExchange = await ethers.getContractFactory("MockExchange");
    this.contracts.mockExchange = await MockExchange.connect(this.deployer).deploy(
      this.contracts.token.address,
      this.contracts.mockUSDC.address
    );
    await this.contracts.mockExchange.deployed();
    console.log("MockExchange deployed:", this.contracts.mockExchange.address);
    
    console.log("Mock contract deployment complete");
  }
  
  // Setup access controls for contracts
  async setupAccessControls() {
    // Grant admin role to admin account
    const ADMIN_ROLE = await this.contracts.token.ADMIN_ROLE();
    await this.contracts.token.connect(this.deployer).grantRole(ADMIN_ROLE, this.admin.address);
    await this.contracts.reserveManager.connect(this.deployer).grantRole(ADMIN_ROLE, this.admin.address);
    await this.contracts.stabilityMechanism.connect(this.deployer).grantRole(ADMIN_ROLE, this.admin.address);
    
    // Setup minter role
    const MINTER_ROLE = await this.contracts.token.MINTER_ROLE();
    await this.contracts.token.connect(this.deployer).grantRole(MINTER_ROLE, this.contracts.reserveManager.address);
    
    // Setup burner role
    const BURNER_ROLE = await this.contracts.token.BURNER_ROLE();
    await this.contracts.token.connect(this.deployer).grantRole(BURNER_ROLE, this.contracts.reserveManager.address);
    
    console.log("Access controls configured");
  }
  
  // Helper method to mint initial tokens and distribute
  async setupInitialState() {
    // Mint tokens to users through reserve manager
    const mintAmount = ethers.utils.parseEther("1000000"); // 1 million tokens
    
    // Fund mock reserves
    await this.contracts.mockUSDC.connect(this.deployer).mint(this.deployer.address, ethers.utils.parseUnits("1000000", 6));
    await this.contracts.mockUSDT.connect(this.deployer).mint(this.deployer.address, ethers.utils.parseUnits("1000000", 6));
    await this.contracts.mockDAI.connect(this.deployer).mint(this.deployer.address, ethers.utils.parseEther("1000000"));
    
    // Add reserves to reserve manager
    await this.contracts.mockUSDC.connect(this.deployer).approve(this.contracts.reserveManager.address, ethers.utils.parseUnits("1000000", 6));
    await this.contracts.mockUSDT.connect(this.deployer).approve(this.contracts.reserveManager.address, ethers.utils.parseUnits("1000000", 6));
    await this.contracts.mockDAI.connect(this.deployer).approve(this.contracts.reserveManager.address, ethers.utils.parseEther("1000000"));
    
    await this.contracts.reserveManager.connect(this.deployer).addReserveAsset(this.contracts.mockUSDC.address, true);
    await this.contracts.reserveManager.connect(this.deployer).addReserveAsset(this.contracts.mockUSDT.address, true);
    await this.contracts.reserveManager.connect(this.deployer).addReserveAsset(this.contracts.mockDAI.address, true);
    
    // Deposit reserves and mint stablecoins
    await this.contracts.reserveManager.connect(this.deployer).depositReserve(
      this.contracts.mockUSDC.address,
      ethers.utils.parseUnits("500000", 6),
      this.deployer.address
    );
    
    await this.contracts.reserveManager.connect(this.deployer).depositReserve(
      this.contracts.mockUSDT.address,
      ethers.utils.parseUnits("300000", 6),
      this.deployer.address
    );
    
    await this.contracts.reserveManager.connect(this.deployer).depositReserve(
      this.contracts.mockDAI.address,
      ethers.utils.parseEther("200000"),
      this.deployer.address
    );
    
    // Transfer some tokens to testing accounts
    await this.contracts.token.connect(this.deployer).transfer(this.user1.address, ethers.utils.parseEther("100000"));
    await this.contracts.token.connect(this.deployer).transfer(this.user2.address, ethers.utils.parseEther("100000"));
    await this.contracts.token.connect(this.deployer).transfer(this.liquidityProvider.address, ethers.utils.parseEther("500000"));
    
    console.log("Initial state setup completed");
  }
  
  // Snapshot and revert functionality
  async takeSnapshot() {
    return await network.provider.send("evm_snapshot", []);
  }
  
  async revertToSnapshot(id) {
    await network.provider.send("evm_revert", [id]);
    this.snapshotId = await this.takeSnapshot();
  }
  
  // Reset to initial state between tests
  async reset() {
    await this.revertToSnapshot(this.snapshotId);
  }
  
  // Testing functions
  
  // Core token functionality tests
  async testTokenFunctionality() {
    console.log("Testing token functionality...");
    
    // Test basic transfer
    const transferAmount = ethers.utils.parseEther("1000");
    const initialBalance = await this.contracts.token.balanceOf(this.user1.address);
    await this.contracts.token.connect(this.user1).transfer(this.user3.address, transferAmount);
    
    const finalBalance = await this.contracts.token.balanceOf(this.user1.address);
    const recipientBalance = await this.contracts.token.balanceOf(this.user3.address);
    
    expect(finalBalance).to.equal(initialBalance.sub(transferAmount));
    expect(recipientBalance).to.equal(transferAmount);
    
    console.log("Basic transfer test: PASSED");
    
    // Test approval and transferFrom
    await this.contracts.token.connect(this.user2).approve(this.user1.address, transferAmount);
    const user2InitialBalance = await this.contracts.token.balanceOf(this.user2.address);
    
    await this.contracts.token.connect(this.user1).transferFrom(
      this.user2.address,
      this.user3.address,
      transferAmount
    );
    
    const user2FinalBalance = await this.contracts.token.balanceOf(this.user2.address);
    const user3Balance = await this.contracts.token.balanceOf(this.user3.address);
    
    expect(user2FinalBalance).to.equal(user2InitialBalance.sub(transferAmount));
    expect(user3Balance).to.equal(transferAmount.mul(2));
    
    console.log("Approval and transferFrom test: PASSED");
    
    console.log("Token functionality tests complete");
  }
  
  // Reserve manager functionality tests
  async testReserveManagerFunctionality() {
    console.log("Testing reserve manager functionality...");
    
    // Test reserve asset addition
    const newReserveAsset = this.contracts.mockUSDC.address;
    await this.contracts.reserveManager.connect(this.admin).addReserveAsset(newReserveAsset, true);
    const isReserveAsset = await this.contracts.reserveManager.isReserveAsset(newReserveAsset);
    expect(isReserveAsset).to.be.true;
    console.log("Reserve asset addition test: PASSED");
    
    // Test reserve deposit
    const depositAmount = ethers.utils.parseUnits("10000", 6); // 10,000 USDC
    await this.contracts.mockUSDC.connect(this.deployer).mint(this.user1.address, depositAmount);
    await this.contracts.mockUSDC.connect(this.user1).approve(this.contracts.reserveManager.address, depositAmount);
    
    const initialStabBalance = await this.contracts.token.balanceOf(this.user1.address);
    await this.contracts.reserveManager.connect(this.user1).depositReserve(
      newReserveAsset,
      depositAmount,
      this.user1.address
    );
    
    const finalStabBalance = await this.contracts.token.balanceOf(this.user1.address);
    expect(finalStabBalance).to.be.gt(initialStabBalance);
    console.log("Reserve deposit test: PASSED");
    
    // Test reserve withdrawal
    const withdrawAmount = ethers.utils.parseEther("5000"); // 5,000 STAB
    const initialReserveBalance = await this.contracts.mockUSDC.balanceOf(this.user1.address);
    
    await this.contracts.token.connect(this.user1).approve(this.contracts.reserveManager.address, withdrawAmount);
    await this.contracts.reserveManager.connect(this.user1).withdrawReserve(
      newReserveAsset,
      withdrawAmount,
      this.user1.address
    );
    
    const finalReserveBalance = await this.contracts.mockUSDC.balanceOf(this.user1.address);
    expect(finalReserveBalance).to.be.gt(initialReserveBalance);
    console.log("Reserve withdrawal test: PASSED");
    
    // Test reserve ratio calculation
    const reserveRatio = await this.contracts.reserveManager.getReserveRatio();
    expect(reserveRatio).to.be.gte(ethers.BigNumber.from("10000")); // Assuming 100% = 10000 basis points
    console.log("Reserve ratio calculation test: PASSED");
    
    console.log("Reserve manager functionality tests complete");
  }
  
  // Stability mechanism tests
  async testStabilityMechanism() {
    console.log("Testing stability mechanism...");
    
    // Test price oracle integration
    await this.contracts.mockPriceFeed.connect(this.deployer).setPrice(
      ethers.utils.parseUnits("0.98", 8) // Price slightly below peg
    );
    
    await this.contracts.stabilityMechanism.connect(this.admin).setPriceFeed(this.contracts.mockPriceFeed.address);
    const currentPrice = await this.contracts.stabilityMechanism.getCurrentPrice();
    expect(currentPrice).to.equal(ethers.utils.parseUnits("0.98", 8));
    console.log("Price oracle integration test: PASSED");
    
    // Test stability fee adjustment
    await this.contracts.stabilityMechanism.connect(this.admin).adjustStabilityFee(true, 50); // Increase fee by 0.5%
    const newFee = await this.contracts.stabilityMechanism.getStabilityFee();
    expect(newFee).to.be.gt(0);
    console.log("Stability fee adjustment test: PASSED");
    
    // Test rebasing mechanism
    if (await this.contracts.stabilityMechanism.supportsRebasing()) {
      await this.contracts.mockPriceFeed.connect(this.deployer).setPrice(
        ethers.utils.parseUnits("1.05", 8) // Price above peg
      );
      
      const initialSupply = await this.contracts.token.totalSupply();
      await this.contracts.stabilityMechanism.connect(this.admin).executeRebase();
      const finalSupply = await this.contracts.token.totalSupply();
      
      expect(finalSupply).to.not.equal(initialSupply);
      console.log("Rebasing mechanism test: PASSED");
    } else {
      console.log("Rebasing not supported, skipping test");
    }
    
    console.log("Stability mechanism tests complete");
  }
  
  // Governance functionality tests
  async testGovernanceFunctionality() {
    console.log("Testing governance functionality...");
    
    // Test proposal creation
    const proposalDescription = "Increase reserve requirement to 110%";
    const callData = this.contracts.reserveManager.interface.encodeFunctionData(
      "setRequiredReserveRatio",
      [11000] // 110.00%
    );
    
    await this.contracts.token.connect(this.deployer).transfer(
      this.admin.address,
      ethers.utils.parseEther("100000")
    );
    
    await this.contracts.governance.connect(this.admin).propose(
      [this.contracts.reserveManager.address],
      [0],
      [callData],
      proposalDescription
    );
    
    const proposalId = await this.contracts.governance.getLatestProposalId();
    expect(proposalId).to.be.gt(0);
    console.log("Proposal creation test: PASSED");
    
    // Test voting
    // Advance blocks to voting period
    await network.provider.send("hardhat_mine", ["0x100"]); // Mine 256 blocks
    
    await this.contracts.governance.connect(this.admin).castVote(proposalId, true);
    await this.contracts.governance.connect(this.user1).castVote(proposalId, true);
    await this.contracts.governance.connect(this.user2).castVote(proposalId, false);
    
    const proposal = await this.contracts.governance.proposals(proposalId);
    expect(proposal.forVotes).to.be.gt(proposal.againstVotes);
    console.log("Voting test: PASSED");
    
    // Test proposal execution
    // Advance blocks to execution period
    await network.provider.send("hardhat_mine", ["0x500"]); // Mine 1280 blocks
    
    await this.contracts.governance.connect(this.admin).execute(proposalId);
    const newReserveRatio = await this.contracts.reserveManager.requiredReserveRatio();
    expect(newReserveRatio).to.equal(11000);
    console.log("Proposal execution test: PASSED");
    
    console.log("Governance functionality tests complete");
  }
  
  // KYC provider tests
  async testKYCProvider() {
    console.log("Testing KYC provider...");
    
    // Test adding a KYC verifier
    await this.contracts.kycProvider.connect(this.admin).addVerifier(this.validator.address);
    const isVerifier = await this.contracts.kycProvider.isVerifier(this.validator.address);
    expect(isVerifier).to.be.true;
    console.log("Add verifier test: PASSED");
    
    // Test KYC approval
    await this.contracts.kycProvider.connect(this.validator).approveAddress(this.user1.address);
    const isApproved = await this.contracts.kycProvider.isKYCApproved(this.user1.address);
    expect(isApproved).to.be.true;
    console.log("KYC approval test: PASSED");
    
    // Test KYC enforcement
    if (await this.contracts.token.requiresKYC()) {
      // Transfer to KYC'd address should succeed
      const transferAmount = ethers.utils.parseEther("1000");
      await this.contracts.token.connect(this.deployer).transfer(this.user1.address, transferAmount);
      
      // Transfer to non-KYC'd address should fail
      try {
        await this.contracts.token.connect(this.deployer).transfer(this.user3.address, transferAmount);
        throw new Error("Transfer to non-KYC'd address should have failed");
      } catch (error) {
        if (error.message.includes("Transfer to non-KYC'd address should have failed")) {
          throw error;
        }
        console.log("KYC enforcement test: PASSED");
      }
    } else {
      console.log("KYC not required for token, skipping enforcement test");
    }
    
    console.log("KYC provider tests complete");
  }
  
  // Security tests
  async testSecurity() {
    console.log("Running security tests...");
    
    // Test access controls
    try {
      // Non-admin trying to add reserve asset
      await this.contracts.reserveManager.connect(this.attacker).addReserveAsset(
        this.attacker.address,
        true
      );
      throw new Error("Should have reverted");
    } catch (error) {
      if (error.message === "Should have reverted") {
        throw new Error("Access control test failed: attacker could add reserve asset");
      }
      console.log("Access control test: PASSED");
    }
    
    // Test reentrancy protection
    const MaliciousContract = await ethers.getContractFactory("MaliciousReentrancyContract");
    this.contracts.maliciousContract = await MaliciousContract.connect(this.attacker).deploy(
      this.contracts.reserveManager.address,
      this.contracts.token.address
    );
    
    // Fund the malicious contract
    await this.contracts.token.connect(this.deployer).transfer(
      this.contracts.maliciousContract.address,
      ethers.utils.parseEther("10000")
    );
    
    // Attempt reentrancy attack
    try {
      await this.contracts.maliciousContract.connect(this.attacker).attack();
      throw new Error("Reentrancy attack should have failed");
    } catch (error) {
      if (error.message === "Reentrancy attack should have failed") {
        throw new Error("Reentrancy protection test failed");
      }
      console.log("Reentrancy protection test: PASSED");
    }
    
    // Test flash loan protection
    if (this.contracts.flashLoanGuard) {
      try {
        await this.contracts.flashLoanGuard.connect(this.attacker).simulateFlashLoanAttack();
        throw new Error("Flash loan attack should have failed");
      } catch (error) {
        if (error.message === "Flash loan attack should have failed") {
          throw new Error("Flash loan protection test failed");
        }
        console.log("Flash loan protection test: PASSED");
      }
    } else {
      console.log("Flash loan guard not deployed, skipping test");
    }
    
    console.log("Security tests complete");
  }
  
  // Integration tests
  async testIntegrations() {
    console.log("Running integration tests...");
    
    // Test DEX integration
    if (this.contracts.dexIntegration) {
      // Setup liquidity pool
      await this.contracts.token.connect(this.liquidityProvider).approve(
        this.contracts.dexIntegration.address,
        ethers.utils.parseEther("100000")
      );
      
      await this.contracts.mockUSDC.connect(this.deployer).mint(
        this.liquidityProvider.address,
        ethers.utils.parseUnits("100000", 6)
      );
      
      await this.contracts.mockUSDC.connect(this.liquidityProvider).approve(
        this.contracts.dexIntegration.address,
        ethers.utils.parseUnits("100000", 6)
      );
      
      await this.contracts.dexIntegration.connect(this.liquidityProvider).addLiquidity(
        this.contracts.mockUSDC.address,
        ethers.utils.parseUnits("100000", 6),
        ethers.utils.parseEther("100000")
      );
      
      // Test swap
      await this.contracts.token.connect(this.user1).approve(
        this.contracts.dexIntegration.address,
        ethers.utils.parseEther("1000")
      );
      
      const initialUSDCBalance = await this.contracts.mockUSDC.balanceOf(this.user1.address);
      
      await this.contracts.dexIntegration.connect(this.user1).swap(
        this.contracts.token.address,
        this.contracts.mockUSDC.address,
        ethers.utils.parseEther("1000")
      );
      
      const finalUSDCBalance = await this.contracts.mockUSDC.balanceOf(this.user1.address);
      expect(finalUSDCBalance).to.be.gt(initialUSDCBalance);
      console.log("DEX integration test: PASSED");
    } else {
      console.log("DEX integration not deployed, skipping test");
    }
    
    // Test cross-chain bridge
    if (this.contracts.bridge) {
      // Mock a cross-chain transfer
      const bridgeAmount = ethers.utils.parseEther("5000");
      await this.contracts.token.connect(this.user1).approve(
        this.contracts.bridge.address,
        bridgeAmount
      );
      
      await this.contracts.bridge.connect(this.user1).lockTokens(
        bridgeAmount,
        "destination_chain",
        "0xDestinationAddress"
      );
      
      // Verify tokens locked in bridge
      const bridgeBalance = await this.contracts.token.balanceOf(this.contracts.bridge.address);
      expect(bridgeBalance).to.be.gte(bridgeAmount);
      console.log("Cross-chain bridge test: PASSED");
    } else {
      console.log("Bridge not deployed, skipping test");
    }
    
    console.log("Integration tests complete");
  }
  
  // Run all tests
  async runAllTests() {
    try {
      console.log("\n============= STABULUM TEST SUITE =============\n");
      
      await this.initialize();
      await this.deployCore();
      await this.deployAuxiliary();
      await this.deployMocks();
      await this.setupInitialState();
      
      console.log("\n============= STARTING TESTS =============\n");
      
      await this.testTokenFunctionality();
      await this.reset();
      
      await this.testReserveManagerFunctionality();
      await this.reset();
      
      await this.testStabilityMechanism();
      await this.reset();
      
      await this.testGovernanceFunctionality();
      await this.reset();
      
      await this.testKYCProvider();
      await this.reset();
      
      await this.testSecurity();
      await this.reset();
      
      await this.testIntegrations();
      
      console.log("\n============= ALL TESTS COMPLETED SUCCESSFULLY =============\n");
      return true;
    } catch (error) {
      console.error("\n============= TEST FAILURE =============\n");
      console.error(error);
      return false;
    }
  }
}

module.exports = StabulumTestFramework;
