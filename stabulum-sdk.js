/**
 * Stabulum Integration SDK
 * 
 * A comprehensive JavaScript SDK for integrating with the Stabulum stablecoin ecosystem.
 * Provides functions for interacting with Stabulum contracts, managing transactions,
 * and integrating with web and mobile applications.
 */

import { ethers } from 'ethers';
import StabulumTokenABI from './abis/StabulumToken.json';
import StabulumAMMABI from './abis/StabulumAMM.json';
import StabulumGasOptimizerABI from './abis/StabulumGasOptimizer.json';
import StabulumReserveManagerABI from './abis/StabulumReserveManager.json';
import StabulumGovernanceABI from './abis/StabulumGovernance.json';

class StabulumSDK {
  constructor(providerOrSigner, config = {}) {
    this.provider = providerOrSigner;
    this.config = {
      stabulumAddress: config.stabulumAddress || '',
      ammAddress: config.ammAddress || '',
      gasOptimizerAddress: config.gasOptimizerAddress || '',
      reserveManagerAddress: config.reserveManagerAddress || '',
      governanceAddress: config.governanceAddress || '',
      networkId: config.networkId || 1, // Default to Ethereum mainnet
      ...config
    };
    
    this.initializeContracts();
  }

  /**
   * Initialize contract instances
   */
  initializeContracts() {
    if (this.config.stabulumAddress) {
      this.stabulumToken = new ethers.Contract(
        this.config.stabulumAddress,
        StabulumTokenABI,
        this.provider
      );
    }
    
    if (this.config.ammAddress) {
      this.stabulumAMM = new ethers.Contract(
        this.config.ammAddress,
        StabulumAMMABI,
        this.provider
      );
    }
    
    if (this.config.gasOptimizerAddress) {
      this.gasOptimizer = new ethers.Contract(
        this.config.gasOptimizerAddress,
        StabulumGasOptimizerABI,
        this.provider
      );
    }
    
    if (this.config.reserveManagerAddress) {
      this.reserveManager = new ethers.Contract(
        this.config.reserveManagerAddress,
        StabulumReserveManagerABI,
        this.provider
      );
    }
    
    if (this.config.governanceAddress) {
      this.governance = new ethers.Contract(
        this.config.governanceAddress,
        StabulumGovernanceABI,
        this.provider
      );
    }
  }

  /**
   * Get Stabulum token balance for a given address
   * @param {string} address - The address to check balance for
   * @returns {Promise<string>} - The balance in Stabulum tokens
   */
  async getBalance(address) {
    this.validateStabulumToken();
    const balance = await this.stabulumToken.balanceOf(address);
    return ethers.utils.formatUnits(balance, 18);
  }

  /**
   * Transfer Stabulum tokens
   * @param {string} to - Recipient address
   * @param {string|number} amount - Amount to transfer
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async transfer(to, amount) {
    this.validateStabulumToken();
    const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
    const tx = await this.stabulumToken.transfer(to, amountWei);
    return await tx.wait();
  }

  /**
   * Execute a meta-transaction (gasless transfer)
   * @param {string} from - Sender address
   * @param {string} to - Recipient address
   * @param {string|number} amount - Amount to transfer
   * @param {number} deadline - Transaction deadline (Unix timestamp)
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async executeMetaTransfer(from, to, amount, deadline) {
    this.validateGasOptimizer();
    
    const signer = this.provider.getSigner ? this.provider.getSigner(from) : this.provider;
    const nonce = await this.gasOptimizer.getNonce(from);
    const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
    
    // Prepare EIP-712 signature
    const domain = {
      name: 'Stabulum Gas Optimizer',
      version: '1',
      chainId: this.config.networkId,
      verifyingContract: this.config.gasOptimizerAddress
    };
    
    const types = {
      Transfer: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    const value = {
      from,
      to,
      amount: amountWei,
      nonce,
      deadline
    };
    
    const signature = await signer._signTypedData(domain, types, value);
    const { v, r, s } = ethers.utils.splitSignature(signature);
    
    // Execute the meta-transaction
    const tx = await this.gasOptimizer.executeMetaTransfer(
      from,
      to,
      amountWei,
      deadline,
      v,
      r,
      s
    );
    
    return await tx.wait();
  }

  /**
   * Execute a batch transfer
   * @param {string} from - Sender address
   * @param {string[]} to - Array of recipient addresses
   * @param {(string|number)[]} amounts - Array of amounts to transfer
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async executeBatchTransfer(from, to, amounts) {
    this.validateGasOptimizer();
    
    const amountsWei = amounts.map(amount => 
      ethers.utils.parseUnits(amount.toString(), 18)
    );
    
    const tx = await this.gasOptimizer.executeBatchTransfer(
      from,
      to,
      amountsWei
    );
    
    return await tx.wait();
  }

  /**
   * Swap collateral for Stabulum tokens
   * @param {string} collateralToken - Address of the collateral token
   * @param {string|number} amount - Amount of collateral to swap
   * @param {string|number} minAmountOut - Minimum amount of Stabulum to receive
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async swapCollateralForStabulum(collateralToken, amount, minAmountOut) {
    this.validateAMM();
    
    const collateralContract = new ethers.Contract(
      collateralToken,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      this.provider
    );
    
    const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
    const minOutWei = ethers.utils.parseUnits(minAmountOut.toString(), 18);
    
    // Approve AMM to spend collateral
    const approveTx = await collateralContract.approve(this.config.ammAddress, amountWei);
    await approveTx.wait();
    
    // Execute swap
    const tx = await this.stabulumAMM.swapCollateralForStabulum(
      collateralToken,
      amountWei,
      minOutWei
    );
    
    return await tx.wait();
  }

  /**
   * Swap Stabulum tokens for collateral
   * @param {string} collateralToken - Address of the collateral token
   * @param {string|number} amount - Amount of Stabulum to swap
   * @param {string|number} minAmountOut - Minimum amount of collateral to receive
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async swapStabulumForCollateral(collateralToken, amount, minAmountOut) {
    this.validateAMM();
    
    // Approve AMM to spend Stabulum
    const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
    const minOutWei = ethers.utils.parseUnits(minAmountOut.toString(), 18);
    
    const approveTx = await this.stabulumToken.approve(this.config.ammAddress, amountWei);
    await approveTx.wait();
    
    // Execute swap
    const tx = await this.stabulumAMM.swapStabulumForCollateral(
      collateralToken,
      amountWei,
      minOutWei
    );
    
    return await tx.wait();
  }

  /**
   * Get reserve information
   * @returns {Promise<Object>} - Reserve information
   */
  async getReserveInfo() {
    this.validateReserveManager();
    
    const totalReserve = await this.reserveManager.getTotalReserve();
    const collateralRatio = await this.reserveManager.getCollateralRatio();
    const supportedCollaterals = await this.reserveManager.getSupportedCollaterals();
    
    const collateralBalances = await Promise.all(
      supportedCollaterals.map(async (collateral) => {
        const balance = await this.reserveManager.getCollateralBalance(collateral);
        return {
          token: collateral,
          balance: ethers.utils.formatUnits(balance, 18)
        };
      })
    );
    
    return {
      totalReserve: ethers.utils.formatUnits(totalReserve, 18),
      collateralRatio: collateralRatio.toString(),
      collateralBalances
    };
  }

  /**
   * Create a governance proposal
   * @param {string} title - Proposal title
   * @param {string} description - Proposal description
   * @param {string[]} targets - Contract addresses to call
   * @param {string[]} calldatas - Function call data
   * @param {number[]} values - ETH values to send with calls
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async createProposal(title, description, targets, calldatas, values) {
    this.validateGovernance();
    
    const tx = await this.governance.propose(
      title,
      description,
      targets,
      calldatas,
      values
    );
    
    return await tx.wait();
  }
  
  /**
   * Vote on a governance proposal
   * @param {number} proposalId - ID of the proposal
   * @param {boolean} support - Whether to support the proposal
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async castVote(proposalId, support) {
    this.validateGovernance();
    
    const tx = await this.governance.castVote(proposalId, support ? 1 : 0);
    return await tx.wait();
  }

  /**
   * Get all active proposals
   * @returns {Promise<Array>} - List of active proposals
   */
  async getActiveProposals() {
    this.validateGovernance();
    
    const filter = this.governance.filters.ProposalCreated();
    const events = await this.governance.queryFilter(filter);
    
    const activeProposals = await Promise.all(
      events.map(async (event) => {
        const proposalId = event.args.proposalId;
        const state = await this.governance.state(proposalId);
        
        // Only return active proposals (Pending, Active, or in Voting)
        if (state < 3) {
          return {
            id: proposalId.toString(),
            title: event.args.title,
            description: event.args.description,
            proposer: event.args.proposer,
            startBlock: event.args.startBlock.toString(),
            endBlock: event.args.endBlock.toString(),
            state
          };
        }
        return null;
      })
    );
    
    return activeProposals.filter(Boolean);
  }

  /**
   * Approve spending of Stabulum tokens
   * @param {string} spender - Address of the spender
   * @param {string|number} amount - Amount to approve
   * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
   */
  async approve(spender, amount) {
    this.validateStabulumToken();
    
    const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
    const tx = await this.stabulumToken.approve(spender, amountWei);
    
    return await tx.wait();
  }

  /**
   * Get the allowance for a spender
   * @param {string} owner - Owner address
   * @param {string} spender - Spender address
   * @returns {Promise<string>} - Allowance amount
   */
  async allowance(owner, spender) {
    this.validateStabulumToken();
    
    const allowance = await this.stabulumToken.allowance(owner, spender);
    return ethers.utils.formatUnits(allowance, 18);
  }

  /**
   * Validate that the Stabulum token contract is initialized
   */
  validateStabulumToken() {
    if (!this.stabulumToken) {
      throw new Error('Stabulum token contract not initialized');
    }
  }

  /**
   * Validate that the AMM contract is initialized
   */
  validateAMM() {
    if (!this.stabulumAMM) {
      throw new Error('Stabulum AMM contract not initialized');
    }
  }

  /**
   * Validate that the gas optimizer contract is initialized
   */
  validateGasOptimizer() {
    if (!this.gasOptimizer) {
      throw new Error('Stabulum gas optimizer contract not initialized');
    }
  }

  /**
   * Validate that the reserve manager contract is initialized
   */
  validateReserveManager() {
    if (!this.reserveManager) {
      throw new Error('Stabulum reserve manager contract not initialized');
    }
  }

  /**
   * Validate that the governance contract is initialized
   */
  validateGovernance() {
    if (!this.governance) {
      throw new Error('Stabulum governance contract not initialized');
    }
  }
}

export default StabulumSDK;
