/**
 * Stabulum Frontend API
 * 
 * This API provides interfaces for web applications to interact with the Stabulum stablecoin ecosystem.
 * It includes functionality for wallet connection, token operations, governance participation,
 * reserve transparency, and cross-chain operations.
 */

// Import required libraries
const Web3 = require('web3');
const ethers = require('ethers');

// Import ABIs (these would be generated from your smart contracts)
const STABULUM_CORE_ABI = require('./abis/StabulumCore.json');
const STABULUM_GOVERNANCE_ABI = require('./abis/StabulumGovernance.json');
const STABULUM_RESERVE_MANAGER_ABI = require('./abis/StabulumReserveManager.json');
const STABULUM_BRIDGE_ABI = require('./abis/StabulumBridge.json');
const STABULUM_KYC_PROVIDER_ABI = require('./abis/StabulumKYCProvider.json');

class StabulumAPI {
  constructor(config = {}) {
    this.config = {
      coreContractAddress: config.coreContractAddress || '',
      governanceContractAddress: config.governanceContractAddress || '',
      reserveManagerAddress: config.reserveManagerAddress || '',
      bridgeContractAddress: config.bridgeContractAddress || '',
      kycProviderAddress: config.kycProviderAddress || '',
      rpcUrl: config.rpcUrl || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      chainId: config.chainId || 1, // Ethereum mainnet by default
    };
    
    this.web3 = null;
    this.provider = null;
    this.coreContract = null;
    this.governanceContract = null;
    this.reserveManagerContract = null;
    this.bridgeContract = null;
    this.kycProviderContract = null;
    this.userAddress = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the API with web3 provider
   * @param {Object} providerOrSigner - Web3 provider or ethers signer
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(providerOrSigner = null) {
    try {
      if (providerOrSigner) {
        if (providerOrSigner.provider) {
          // It's an ethers signer
          this.provider = providerOrSigner.provider;
          const network = await this.provider.getNetwork();
          this.config.chainId = network.chainId;
          
          this.coreContract = new ethers.Contract(
            this.config.coreContractAddress,
            STABULUM_CORE_ABI,
            providerOrSigner
          );
          
          this.governanceContract = new ethers.Contract(
            this.config.governanceContractAddress,
            STABULUM_GOVERNANCE_ABI,
            providerOrSigner
          );
          
          this.reserveManagerContract = new ethers.Contract(
            this.config.reserveManagerAddress,
            STABULUM_RESERVE_MANAGER_ABI,
            providerOrSigner
          );
          
          this.bridgeContract = new ethers.Contract(
            this.config.bridgeContractAddress,
            STABULUM_BRIDGE_ABI,
            providerOrSigner
          );
          
          this.kycProviderContract = new ethers.Contract(
            this.config.kycProviderAddress,
            STABULUM_KYC_PROVIDER_ABI,
            providerOrSigner
          );
          
          this.userAddress = await providerOrSigner.getAddress();
        } else {
          // It's a web3 provider
          this.web3 = new Web3(providerOrSigner);
          this.provider = providerOrSigner;
          
          const chainId = await this.web3.eth.getChainId();
          this.config.chainId = chainId;
          
          const accounts = await this.web3.eth.getAccounts();
          this.userAddress = accounts[0];
          
          this.coreContract = new this.web3.eth.Contract(
            STABULUM_CORE_ABI,
            this.config.coreContractAddress
          );
          
          this.governanceContract = new this.web3.eth.Contract(
            STABULUM_GOVERNANCE_ABI,
            this.config.governanceContractAddress
          );
          
          this.reserveManagerContract = new this.web3.eth.Contract(
            STABULUM_RESERVE_MANAGER_ABI,
            this.config.reserveManagerAddress
          );
          
          this.bridgeContract = new this.web3.eth.Contract(
            STABULUM_BRIDGE_ABI,
            this.config.bridgeContractAddress
          );
          
          this.kycProviderContract = new this.web3.eth.Contract(
            STABULUM_KYC_PROVIDER_ABI,
            this.config.kycProviderAddress
          );
        }
      } else {
        // Default provider
        this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
        const network = await this.provider.getNetwork();
        this.config.chainId = network.chainId;
        
        this.coreContract = new ethers.Contract(
          this.config.coreContractAddress,
          STABULUM_CORE_ABI,
          this.provider
        );
        
        this.governanceContract = new ethers.Contract(
          this.config.governanceContractAddress,
          STABULUM_GOVERNANCE_ABI,
          this.provider
        );
        
        this.reserveManagerContract = new ethers.Contract(
          this.config.reserveManagerAddress,
          STABULUM_RESERVE_MANAGER_ABI,
          this.provider
        );
        
        this.bridgeContract = new ethers.Contract(
          this.config.bridgeContractAddress,
          STABULUM_BRIDGE_ABI,
          this.provider
        );
        
        this.kycProviderContract = new ethers.Contract(
          this.config.kycProviderAddress,
          STABULUM_KYC_PROVIDER_ABI,
          this.provider
        );
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Stabulum API:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Connect wallet using Web3Modal or other provider
   * @param {Object} provider - Web3 provider from wallet connection
   * @returns {Promise<string>} - Connected address
   */
  async connectWallet(provider) {
    try {
      await this.initialize(provider);
      return this.userAddress;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Check if user is KYC verified
   * @param {string} address - User address to check
   * @returns {Promise<boolean>} - KYC status
   */
  async isKYCVerified(address = null) {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    const targetAddress = address || this.userAddress;
    if (!targetAddress) throw new Error('No address provided');
    
    try {
      if (this.web3) {
        return await this.kycProviderContract.methods.isVerified(targetAddress).call();
      } else {
        return await this.kycProviderContract.isVerified(targetAddress);
      }
    } catch (error) {
      console.error('Failed to check KYC status:', error);
      throw error;
    }
  }

  /**
   * Submit KYC information
   * @param {Object} kycData - KYC data object
   * @returns {Promise<string>} - Transaction hash
   */
  async submitKYC(kycData) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      // Hash and encrypt sensitive KYC data before submission
      const encryptedData = this._encryptKYCData(kycData);
      
      if (this.web3) {
        const tx = await this.kycProviderContract.methods.submitKYC(encryptedData).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.kycProviderContract.submitKYC(encryptedData);
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      throw error;
    }
  }

  /**
   * Get Stabulum token balance
   * @param {string} address - Address to check balance for
   * @returns {Promise<string>} - Balance in token units
   */
  async getBalance(address = null) {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    const targetAddress = address || this.userAddress;
    if (!targetAddress) throw new Error('No address provided');
    
    try {
      let balance;
      if (this.web3) {
        balance = await this.coreContract.methods.balanceOf(targetAddress).call();
      } else {
        balance = await this.coreContract.balanceOf(targetAddress);
      }
      
      return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimals
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Transfer Stabulum tokens
   * @param {string} recipient - Recipient address
   * @param {string} amount - Amount to transfer (in token units)
   * @returns {Promise<string>} - Transaction hash
   */
  async transfer(recipient, amount) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18); // Assuming 18 decimals
      
      if (this.web3) {
        const tx = await this.coreContract.methods.transfer(recipient, amountInWei).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.coreContract.transfer(recipient, amountInWei);
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to transfer tokens:', error);
      throw error;
    }
  }

  /**
   * Mint Stabulum tokens (requires appropriate permissions)
   * @param {string} recipient - Recipient address
   * @param {string} amount - Amount to mint (in token units)
   * @returns {Promise<string>} - Transaction hash
   */
  async mint(recipient, amount) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    // Check if user has minter role
    const hasMinterRole = await this._checkMinterRole();
    if (!hasMinterRole) throw new Error('User does not have minter role');
    
    try {
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18); // Assuming 18 decimals
      
      if (this.web3) {
        const tx = await this.coreContract.methods.mint(recipient, amountInWei).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.coreContract.mint(recipient, amountInWei);
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to mint tokens:', error);
      throw error;
    }
  }

  /**
   * Burn Stabulum tokens
   * @param {string} amount - Amount to burn (in token units)
   * @returns {Promise<string>} - Transaction hash
   */
  async burn(amount) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18); // Assuming 18 decimals
      
      if (this.web3) {
        const tx = await this.coreContract.methods.burn(amountInWei).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.coreContract.burn(amountInWei);
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to burn tokens:', error);
      throw error;
    }
  }

  /**
   * Get reserve status information
   * @returns {Promise<Object>} - Reserve status object
   */
  async getReserveStatus() {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      let totalSupply, reserves, collateralizationRatio;
      
      if (this.web3) {
        totalSupply = await this.coreContract.methods.totalSupply().call();
        reserves = await this.reserveManagerContract.methods.getTotalReserves().call();
        collateralizationRatio = await this.reserveManagerContract.methods.getCollateralizationRatio().call();
      } else {
        totalSupply = await this.coreContract.totalSupply();
        reserves = await this.reserveManagerContract.getTotalReserves();
        collateralizationRatio = await this.reserveManagerContract.getCollateralizationRatio();
      }
      
      const formattedSupply = ethers.utils.formatUnits(totalSupply, 18); // Assuming 18 decimals
      const formattedReserves = ethers.utils.formatUnits(reserves, 18); // Assuming 18 decimals
      const formattedRatio = ethers.utils.formatUnits(collateralizationRatio, 6); // Assuming 6 decimals for percentage
      
      return {
        totalSupply: formattedSupply,
        reserves: formattedReserves,
        collateralizationRatio: formattedRatio,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get reserve status:', error);
      throw error;
    }
  }

  /**
   * Get list of governance proposals
   * @param {number} limit - Maximum number of proposals to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - Array of proposal objects
   */
  async getProposals(limit = 10, offset = 0) {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      let proposalCount;
      
      if (this.web3) {
        proposalCount = await this.governanceContract.methods.getProposalCount().call();
      } else {
        proposalCount = await this.governanceContract.getProposalCount();
      }
      
      const end = Math.min(parseInt(proposalCount), offset + limit);
      const proposals = [];
      
      for (let i = offset; i < end; i++) {
        let proposal;
        
        if (this.web3) {
          proposal = await this.governanceContract.methods.getProposal(i).call();
        } else {
          proposal = await this.governanceContract.getProposal(i);
        }
        
        proposals.push(this._formatProposal(proposal));
      }
      
      return proposals;
    } catch (error) {
      console.error('Failed to get proposals:', error);
      throw error;
    }
  }

  /**
   * Submit a new governance proposal
   * @param {string} title - Proposal title
   * @param {string} description - Proposal description
   * @param {Array} actions - Array of contract calls to execute if approved
   * @returns {Promise<string>} - Transaction hash
   */
  async createProposal(title, description, actions) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      const encodedActions = actions.map(action => ({
        target: action.target,
        value: action.value || 0,
        signature: action.signature,
        callData: this._encodeCallData(action.callData)
      }));
      
      const metadataIPFS = await this._uploadToIPFS({
        title,
        description,
        proposer: this.userAddress,
        created: new Date().toISOString()
      });
      
      if (this.web3) {
        const tx = await this.governanceContract.methods.propose(
          encodedActions.map(a => a.target),
          encodedActions.map(a => a.value),
          encodedActions.map(a => a.signature),
          encodedActions.map(a => a.callData),
          metadataIPFS
        ).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.governanceContract.propose(
          encodedActions.map(a => a.target),
          encodedActions.map(a => a.value),
          encodedActions.map(a => a.signature),
          encodedActions.map(a => a.callData),
          metadataIPFS
        );
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to create proposal:', error);
      throw error;
    }
  }

  /**
   * Vote on a governance proposal
   * @param {number} proposalId - Proposal ID
   * @param {boolean} support - Whether to support the proposal
   * @returns {Promise<string>} - Transaction hash
   */
  async castVote(proposalId, support) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      if (this.web3) {
        const tx = await this.governanceContract.methods.castVote(proposalId, support).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.governanceContract.castVote(proposalId, support);
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  }

  /**
   * Bridge tokens to another blockchain
   * @param {string} destinationChainId - Target chain ID
   * @param {string} recipient - Recipient address on target chain
   * @param {string} amount - Amount to bridge (in token units)
   * @returns {Promise<string>} - Transaction hash
   */
  async bridgeTokens(destinationChainId, recipient, amount) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18); // Assuming 18 decimals
      
      if (this.web3) {
        const tx = await this.bridgeContract.methods.bridgeTokens(
          destinationChainId,
          recipient,
          amountInWei
        ).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.bridgeContract.bridgeTokens(
          destinationChainId,
          recipient,
          amountInWei
        );
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to bridge tokens:', error);
      throw error;
    }
  }

  /**
   * Get bridge transaction status
   * @param {string} txHash - Bridge transaction hash
   * @returns {Promise<Object>} - Transaction status
   */
  async getBridgeTransactionStatus(txHash) {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      let status;
      
      if (this.web3) {
        status = await this.bridgeContract.methods.getTransactionStatus(txHash).call();
      } else {
        status = await this.bridgeContract.getTransactionStatus(txHash);
      }
      
      return {
        hash: txHash,
        status: this._mapBridgeStatus(status.status),
        sourceChain: status.sourceChain,
        destinationChain: status.destinationChain,
        sender: status.sender,
        recipient: status.recipient,
        amount: ethers.utils.formatUnits(status.amount, 18), // Assuming 18 decimals
        timestamp: new Date(status.timestamp * 1000).toISOString()
      };
    } catch (error) {
      console.error('Failed to get bridge transaction status:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for an address
   * @param {string} address - Address to get history for
   * @param {number} limit - Maximum number of transactions to return
   * @returns {Promise<Array>} - Array of transaction objects
   */
  async getTransactionHistory(address = null, limit = 10) {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    const targetAddress = address || this.userAddress;
    if (!targetAddress) throw new Error('No address provided');
    
    try {
      // This would typically require an indexer or subgraph
      // For now, we'll simulate with a placeholder that should be replaced with actual implementation
      const events = await this._fetchTransferEvents(targetAddress, limit);
      return events.map(event => this._formatTransferEvent(event));
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  /**
   * Approve spending of tokens by another address (e.g., for DEX)
   * @param {string} spender - Spender address
   * @param {string} amount - Amount to approve (in token units)
   * @returns {Promise<string>} - Transaction hash
   */
  async approve(spender, amount) {
    if (!this.isInitialized) throw new Error('API not initialized');
    if (!this.userAddress) throw new Error('Wallet not connected');
    
    try {
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18); // Assuming 18 decimals
      
      if (this.web3) {
        const tx = await this.coreContract.methods.approve(spender, amountInWei).send({
          from: this.userAddress
        });
        return tx.transactionHash;
      } else {
        const tx = await this.coreContract.approve(spender, amountInWei);
        await tx.wait();
        return tx.hash;
      }
    } catch (error) {
      console.error('Failed to approve tokens:', error);
      throw error;
    }
  }

  /**
   * Get allowance for a spender
   * @param {string} owner - Owner address
   * @param {string} spender - Spender address
   * @returns {Promise<string>} - Allowance in token units
   */
  async getAllowance(owner, spender) {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      let allowance;
      
      if (this.web3) {
        allowance = await this.coreContract.methods.allowance(owner, spender).call();
      } else {
        allowance = await this.coreContract.allowance(owner, spender);
      }
      
      return ethers.utils.formatUnits(allowance, 18); // Assuming 18 decimals
    } catch (error) {
      console.error('Failed to get allowance:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helper methods
  // ---------------------------------------------------------------------------

  /**
   * Check if user has minter role
   * @returns {Promise<boolean>} - Whether user has minter role
   * @private
   */
  async _checkMinterRole() {
    try {
      const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
      
      if (this.web3) {
        return await this.coreContract.methods.hasRole(MINTER_ROLE, this.userAddress).call();
      } else {
        return await this.coreContract.hasRole(MINTER_ROLE, this.userAddress);
      }
    } catch (error) {
      console.error('Failed to check minter role:', error);
      return false;
    }
  }

  /**
   * Encrypt KYC data for secure transmission
   * @param {Object} data - Raw KYC data
   * @returns {string} - Encrypted data
   * @private
   */
  _encryptKYCData(data) {
    // This is a placeholder for actual encryption implementation
    // In a real implementation, use proper encryption methods
    return JSON.stringify(data);
  }

  /**
   * Encode call data for governance proposals
   * @param {Array|Object} callData - Call data parameters
   * @returns {string} - Encoded call data
   * @private
   */
  _encodeCallData(callData) {
    // This is a placeholder for actual encoding implementation
    // In a real implementation, use proper ABI encoding
    return ethers.utils.defaultAbiCoder.encode(['uint256'], [0]);
  }

  /**
   * Upload data to IPFS
   * @param {Object} data - Data to upload
   * @returns {Promise<string>} - IPFS hash
   * @private
   */
  async _uploadToIPFS(data) {
    // This is a placeholder for actual IPFS upload implementation
    // In a real implementation, use IPFS client library
    return "ipfs://QmExample";
  }

  /**
   * Format proposal data
   * @param {Object} proposal - Raw proposal data
   * @returns {Object} - Formatted proposal
   * @private
   */
  _formatProposal(proposal) {
    // This is a placeholder for actual proposal formatting
    return {
      id: proposal.id.toString(),
      proposer: proposal.proposer,
      description: proposal.description,
      status: this._mapProposalStatus(proposal.status),
      forVotes: ethers.utils.formatUnits(proposal.forVotes, 18),
      againstVotes: ethers.utils.formatUnits(proposal.againstVotes, 18),
      startBlock: proposal.startBlock.toString(),
      endBlock: proposal.endBlock.toString(),
      executed: proposal.executed
    };
  }

  /**
   * Map numerical proposal status to string
   * @param {number} status - Status code
   * @returns {string} - Status string
   * @private
   */
  _mapProposalStatus(status) {
    const statuses = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
    return statuses[status] || 'Unknown';
  }

  /**
   * Map numerical bridge status to string
   * @param {number} status - Status code
   * @returns {string} - Status string
   * @private
   */
  _mapBridgeStatus(status) {
    const statuses = ['Pending', 'Completed', 'Failed'];
    return statuses[status] || 'Unknown';
  }

  /**
   * Fetch transfer events
   * @param {string} address - Address to fetch events for
   * @param {number} limit - Maximum number of events to fetch
   * @returns {Promise<Array>} - Array of event objects
   * @private
   */
  async _fetchTransferEvents(address, limit) {
    // This is a placeholder for actual event fetching implementation
    // In a real implementation, use provider or web3 to fetch events
    return [];
  }

  /**
   * Format transfer event
   * @param {Object} event - Raw event data
   * @returns {Object} - Formatted event
   * @private
   */
  _formatTransferEvent(event) {
    // This is a placeholder for actual event formatting
    return {
      transactionHash: event.transactionHash,
      from: event.returnValues.from,
      to: event.returnValues.to,
      value: ethers.utils.formatUnits(event.returnValues.value, 18),
      blockNumber: event.blockNumber,
      timestamp: event.timestamp
    };
  }
}

// Export the API
module.exports = StabulumAPI;
