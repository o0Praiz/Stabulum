/**
 * Stabulum Reserve Verification System
 * 
 * This system provides transparent proof of reserves for the Stabulum stablecoin.
 * It includes both on-chain verification and off-chain attestation mechanisms.
 */

// Import required libraries
const ethers = require('ethers');
const crypto = require('crypto');
const axios = require('axios');

// Import ABIs (these would be generated from your smart contracts)
const STABULUM_RESERVE_MANAGER_ABI = require('./abis/StabulumReserveManager.json');

class StabulumReserveVerification {
  constructor(config = {}) {
    this.config = {
      reserveManagerAddress: config.reserveManagerAddress || '',
      rpcUrl: config.rpcUrl || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      chainId: config.chainId || 1, // Ethereum mainnet by default
      auditorPublicKeys: config.auditorPublicKeys || [],
      attestationEndpoint: config.attestationEndpoint || 'https://api.stabulum.io/attestations',
      refreshInterval: config.refreshInterval || 3600000, // 1 hour in milliseconds
    };
    
    this.provider = null;
    this.reserveManagerContract = null;
    this.isInitialized = false;
    this.cachedReserveData = null;
    this.lastRefreshTime = 0;
    this.refreshIntervalId = null;
  }

  /**
   * Initialize the verification system
   * @param {Object} provider - Ethers provider (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(provider = null) {
    try {
      this.provider = provider || new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
      const network = await this.provider.getNetwork();
      this.config.chainId = network.chainId;
      
      this.reserveManagerContract = new ethers.Contract(
        this.config.reserveManagerAddress,
        STABULUM_RESERVE_MANAGER_ABI,
        this.provider
      );
      
      // Perform initial data fetch
      await this.refreshReserveData();
      
      // Set up automatic refresh
      this.refreshIntervalId = setInterval(
        () => this.refreshReserveData(),
        this.config.refreshInterval
      );
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Reserve Verification System:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Stop the verification system and clear resources
   */
  stop() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    this.isInitialized = false;
  }

  /**
   * Refresh reserve data from blockchain and attestation service
   * @returns {Promise<Object>} - Latest reserve data
   */
  async refreshReserveData() {
    if (!this.reserveManagerContract) {
      throw new Error('Reserve verification system not initialized');
    }
    
    try {
      // Fetch on-chain reserve data
      const onChainData = await this._fetchOnChainReserveData();
      
      // Fetch off-chain attestations
      const attestations = await this._fetchAttestations();
      
      // Combine and validate data
      const reserveData = {
        ...onChainData,
        attestations,
        verified: this._verifyAttestations(attestations, onChainData),
        timestamp: Date.now(),
      };
      
      this.cachedReserveData = reserveData;
      this.lastRefreshTime = Date.now();
      
      return reserveData;
    } catch (error) {
      console.error('Failed to refresh reserve data:', error);
      throw error;
    }
  }

  /**
   * Get latest reserve data (from cache if available and not expired)
   * @param {boolean} forceRefresh - Force a refresh regardless of cache
   * @returns {Promise<Object>} - Reserve data
   */
  async getReserveData(forceRefresh = false) {
    if (!this.isInitialized) {
      throw new Error('Reserve verification system not initialized');
    }
    
    const now = Date.now();
    const cacheExpired = now - this.lastRefreshTime > this.config.refreshInterval;
    
    if (!this.cachedReserveData || cacheExpired || forceRefresh) {
      return await this.refreshReserveData();
    }
    
    return this.cachedReserveData;
  }

  /**
   * Verify a specific attestation
   * @param {Object} attestation - Attestation to verify
   * @returns {boolean} - Verification result
   */
  verifyAttestation(attestation) {
    try {
      // Get the auditor's public key
      const auditorKey = this.config.auditorPublicKeys.find(k => k.id === attestation.auditorId);
      if (!auditorKey) {
        console.error(`Unknown auditor ID: ${attestation.auditorId}`);
        return false;
      }
      
      // Verify the signature
      const message = this._formatAttestationMessage(attestation.data);
      return this._verifySignature(message, attestation.signature, auditorKey.key);
    } catch (error) {
      console.error('Failed to verify attestation:', error);
      return false;
    }
  }

  /**
   * Generate a Merkle proof for a specific reserve asset
   * @param {string} assetId - ID of the asset to generate proof for
   * @returns {Promise<Object>} - Merkle proof
   */
  async generateMerkleProof(assetId) {
    if (!this.isInitialized) {
      throw new Error('Reserve verification system not initialized');
    }
    
    try {
      // Fetch the latest reserve data
      const reserveData = await this.getReserveData();
      
      // Find the asset in the reserve data
      const asset = reserveData.assets.find(a => a.id === assetId);
      if (!asset) {
        throw new Error(`Asset not found: ${assetId}`);
      }
      
      // Generate Merkle proof
      return await this._generateProof(asset, reserveData.assets);
    } catch (error) {
      console.error('Failed to generate Merkle proof:', error);
      throw error;
    }
  }

  /**
   * Verify the overall reserve ratio
   * @returns {Promise<Object>} - Verification result
   */
  async verifyReserveRatio() {
    if (!this.isInitialized) {
      throw new Error('Reserve verification system not initialized');
    }
    
    try {
      // Fetch the latest reserve data
      const reserveData = await this.getReserveData(true); // Force refresh
      
      // Check if the reserve ratio meets the required threshold
      const requiredRatio = await this.reserveManagerContract.getRequiredCollateralizationRatio();
      const currentRatio = ethers.BigNumber.from(reserveData.collateralizationRatio);
      
      const isValid = currentRatio.gte(requiredRatio);
      
      return {
        isValid,
        requiredRatio: ethers.utils.formatUnits(requiredRatio, 6), // Assuming 6 decimals for percentage
        currentRatio: ethers.utils.formatUnits(currentRatio, 6), // Assuming 6 decimals for percentage
        timestamp: new Date().toISOString(),
        attestationsValid: reserveData.verified
      };
    } catch (error) {
      console.error('Failed to verify reserve ratio:', error);
      throw error;
    }
  }

  /**
   * Get the historical reserve data
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} - Historical reserve data
   */
  async getHistoricalReserveData(days = 30) {
    if (!this.isInitialized) {
      throw new Error('Reserve verification system not initialized');
    }
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const results = await axios.get(
        `${this.config.attestationEndpoint}/history`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      );
      
      return results.data.map(item => ({
        ...item,
        collateralizationRatio: ethers.utils.formatUnits(item.collateralizationRatio, 6),
        totalReserves: ethers.utils.formatUnits(item.totalReserves, 18),
        totalSupply: ethers.utils.formatUnits(item.totalSupply, 18)
      }));
    } catch (error) {
      console.error('Failed to get historical reserve data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time reserve updates
   * @param {Function} callback - Callback function to handle updates
   * @returns {Object} - Subscription object
   */
  subscribeToUpdates(callback) {
    if (!this.isInitialized) {
      throw new Error('Reserve verification system not initialized');
    }
    
    // Set up event listener for reserve updates
    const filter = this.reserveManagerContract.filters.ReserveUpdated();
    const listener = (...args) => {
      const event = args[args.length - 1];
      this.getReserveData(true).then(data => {
        callback(null, data);
      }).catch(error => {
        callback(error);
      });
    };
    
    this.reserveManagerContract.on(filter, listener);
    
    // Return subscription object
    return {
      unsubscribe: () => {
        this.reserveManagerContract.off(filter, listener);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Private helper methods
  // ---------------------------------------------------------------------------

  /**
   * Fetch on-chain reserve data
   * @returns {Promise<Object>} - On-chain reserve data
   * @private
   */
  async _fetchOnChainReserveData() {
    try {
      // Get total supply
      const totalSupply = await this.reserveManagerContract.getTotalSupply();
      
      // Get total reserves
      const totalReserves = await this.reserveManagerContract.getTotalReserves();
      
      // Get collateralization ratio
      const collateralizationRatio = await this.reserveManagerContract.getCollateralizationRatio();
      
      // Get reserve assets
      const assetCount = await this.reserveManagerContract.getReserveAssetCount();
      const assets = [];
      
      for (let i = 0; i < assetCount; i++) {
        const asset = await this.reserveManagerContract.getReserveAsset(i);
        assets.push({
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          amount: asset.amount.toString(),
          value: asset.value.toString(),
          lastUpdated: new Date(asset.lastUpdated.toNumber() * 1000).toISOString()
        });
      }
      
      // Get reserve root hash
      const reserveRootHash = await this.reserveManagerContract.getReserveRootHash();
      
      return {
        totalSupply: totalSupply.toString(),
        totalReserves: totalReserves.toString(),
        collateralizationRatio: collateralizationRatio.toString(),
        assets,
        reserveRootHash,
        chainId: this.config.chainId,
        blockNumber: await this.provider.getBlockNumber()
      };
    } catch (error) {
      console.error('Failed to fetch on-chain reserve data:', error);
      throw error;
    }
  }

  /**
   * Fetch off-chain attestations
   * @returns {Promise<Array>} - Attestations
   * @private
   */
  async _fetchAttestations() {
    try {
      const response = await axios.get(this.config.attestationEndpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch attestations:', error);
      return [];
    }
  }

  /**
   * Verify attestations against on-chain data
   * @param {Array} attestations - Attestations to verify
   * @param {Object} onChainData - On-chain data to verify against
   * @returns {boolean} - Verification result
   * @private
   */
  _verifyAttestations(attestations, onChainData) {
    if (!attestations || attestations.length === 0) {
      return false;
    }
    
    // Verify each attestation
    const verificationResults = attestations.map(attestation => {
      // Verify the signature
      const isSignatureValid = this.verifyAttestation(attestation);
      
      // Verify the data matches on-chain data
      const isDataValid = this._compareAttestationData(attestation.data, onChainData);
      
      return isSignatureValid && isDataValid;
    });
    
    // Check if we have at least one valid attestation
    return verificationResults.some(result => result === true);
  }

  /**
   * Compare attestation data with on-chain data
   * @param {Object} attestationData - Attestation data
   * @param {Object} onChainData - On-chain data
   * @returns {boolean} - Comparison result
   * @private
   */
  _compareAttestationData(attestationData, onChainData) {
    // Convert BigNumber strings to BN objects for comparison
    const onChainTotalSupply = ethers.BigNumber.from(onChainData.totalSupply);
    const attestationTotalSupply = ethers.BigNumber.from(attestationData.totalSupply);
    
    const onChainTotalReserves = ethers.BigNumber.from(onChainData.totalReserves);
    const attestationTotalReserves = ethers.BigNumber.from(attestationData.totalReserves);
    
    // Allow small difference in values (e.g., due to timing differences)
    const tolerance = ethers.BigNumber.from('1000000000000000'); // 0.001 tokens with 18 decimals
    
    const supplyDiff = onChainTotalSupply.sub(attestationTotalSupply).abs();
    const reserveDiff = onChainTotalReserves.sub(attestationTotalReserves).abs();
    
    return (
      supplyDiff.lte(tolerance) &&
      reserveDiff.lte(tolerance) &&
      onChainData.reserveRootHash === attestationData.reserveRootHash
    );
  }

  /**
   * Format attestation message for signature verification
   * @param {Object} data - Attestation data
   * @returns {string} - Formatted message
   * @private
   */
  _formatAttestationMessage(data) {
    // Create a deterministic message from attestation data
    const message = JSON.stringify({
      totalSupply: data.totalSupply,
      totalReserves: data.totalReserves,
      collateralizationRatio: data.collateralizationRatio,
      reserveRootHash: data.reserveRootHash,
      timestamp: data.timestamp
    });
    
    return ethers.utils.id(message);
  }

  /**
   * Verify a signature
   * @param {string} message - Message that was signed
   * @param {string} signature - Signature to verify
   * @param {string} publicKey - Public key to verify against
   * @returns {boolean} - Verification result
   * @private
   */
  _verifySignature(message, signature, publicKey) {
    try {
      // Convert message to Buffer if it's a string
      const messageBuffer = typeof message === 'string'
        ? Buffer.from(ethers.utils.arrayify(message))
        : message;
      
      // Convert signature to Buffer if it's a string
      const signatureBuffer = typeof signature === 'string'
        ? Buffer.from(signature, 'hex')
        : signature;
      
      // Verify the signature using the public key
      const verify = crypto.createVerify('SHA256');
      verify.update(messageBuffer);
      return verify.verify(publicKey, signatureBuffer);
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Generate a Merkle proof for an asset
   * @param {Object} asset - Asset to generate proof for
   * @param {Array} assets - All assets in the tree
   * @returns {Object} - Merkle proof
   * @private
   */
  async _generateProof(asset, assets) {
    try {
      // Sort assets by ID for consistent ordering
      const sortedAssets = [...assets].sort((a, b) => a.id.localeCompare(b.id));
      
      // Hash each asset
      const leaves = sortedAssets.map(a => this._hashAsset(a));
      
      // Build the Merkle tree
      const tree = this._buildMerkleTree(leaves);
      
      // Find the index of the target asset
      const targetIndex = sortedAssets.findIndex(a => a.id === asset.id);
      
      // Generate the proof
      const proof = this._getMerkleProof(tree, targetIndex);
      
      return {
        asset,
        proof,
        root: tree[0][0]
      };
    } catch (error) {
      console.error('Failed to generate Merkle proof:', error);
      throw error;
    }
  }

  /**
   * Hash an asset for Merkle tree
   * @param {Object} asset - Asset to hash
   * @returns {string} - Hash
   * @private
   */
  _hashAsset(asset) {
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ['string', 'string', 'string', 'uint256', 'uint256', 'string'],
      [
        asset.id,
        asset.name,
        asset.symbol,
        asset.amount,
        asset.value,
        asset.lastUpdated
      ]
    );
    
    return ethers.utils.keccak256(encoded);
  }

  /**
   * Build a Merkle tree from leaf nodes
   * @param {Array} leaves - Leaf nodes
   * @returns {Array} - Merkle tree
   * @private
   */
  _buildMerkleTree(leaves) {
    if (leaves.length === 0) {
      return [['0x0000000000000000000000000000000000000000000000000000000000000000']];
    }
    
    const tree = [leaves];
    
    let level = 0;
    while (tree[level].length > 1) {
      tree.push([]);
      for (let i = 0; i < tree[level].length; i += 2) {
        if (i + 1 === tree[level].length) {
          // Odd number of nodes, duplicate the last one
          tree[level + 1].push(this._hashPair(tree[level][i], tree[level][i]));
        } else {
          tree[level + 1].push(this._hashPair(tree[level][i], tree[level][i + 1]));
        }
      }
      level++;
    }
    
    return tree.reverse();
  }

  /**
   * Hash a pair of nodes
   * @param {string} left - Left node
   * @param {string} right - Right node
   * @returns {string} - Hash
   * @private
   */
  _hashPair(left, right) {
    if (left === right) {
      return left;
    }
    
    const concat = ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32'],
      [left, right]
    );
    
    return ethers.utils.keccak256(concat);
  }

  /**
   * Get a Merkle proof for a leaf node
   * @param {Array} tree - Merkle tree
   * @param {number} index - Index of the leaf node
   * @returns {Array} - Merkle proof
   * @private
   */
  _getMerkleProof(tree, index) {
    const proof = [];
    let idx = index;
    
    for (let i = tree.length - 1; i > 0; i--) {
      const level = tree[i];
      const isRight = idx % 2 === 1;
      const siblingIndex = isRight ? idx - 1 : idx + 1;
      
      if (siblingIndex < level.length) {
        proof.push({
          position: isRight ? 'left' : 'right',
          data: level[siblingIndex]
        });
      }
      
      idx = Math.floor(idx / 2);
    }
    
    return proof;
  }
}

// Export the system
module.exports = StabulumReserveVerification;
