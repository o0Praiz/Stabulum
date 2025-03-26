// Stabulum Analytics Module
// This module provides comprehensive analytics for the Stabulum stablecoin ecosystem
// including on-chain metrics, reserve health monitoring, and user adoption statistics

const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const axios = require('axios');
const ethers = require('ethers');

// Import ABIs (would typically be in separate files)
const STABULUM_ABI = require('./abis/StabulumToken.json');
const RESERVE_MANAGER_ABI = require('./abis/ReserveManager.json');
const GOVERNANCE_ABI = require('./abis/Governance.json');

class StabulumAnalytics {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.web3 = new Web3(config.rpcUrl);
    
    // Initialize contract instances
    this.stabulumToken = new ethers.Contract(
      config.contracts.token,
      STABULUM_ABI,
      this.provider
    );
    
    this.reserveManager = new ethers.Contract(
      config.contracts.reserveManager,
      RESERVE_MANAGER_ABI,
      this.provider
    );
    
    this.governance = new ethers.Contract(
      config.contracts.governance,
      GOVERNANCE_ABI,
      this.provider
    );
    
    // Initialize data stores
    this.metricsCache = {
      lastUpdated: 0,
      data: {}
    };
    
    this.exchangeRates = {};
  }
  
  // Core analytics methods
  
  async getTokenMetrics() {
    try {
      const [
        totalSupply,
        circulatingSupply,
        holders,
        averageHoldingTime
      ] = await Promise.all([
        this.stabulumToken.totalSupply(),
        this._getCirculatingSupply(),
        this._getUniqueHolders(),
        this._getAverageHoldingTime()
      ]);
      
      return {
        totalSupply: ethers.utils.formatEther(totalSupply),
        circulatingSupply: ethers.utils.formatEther(circulatingSupply),
        holders,
        averageHoldingTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching token metrics:", error);
      throw new Error("Failed to fetch token metrics");
    }
  }
  
  async getReserveMetrics() {
    try {
      const [
        totalReserves,
        reserveRatio,
        reserveHealth,
        reserveDistribution
      ] = await Promise.all([
        this.reserveManager.getTotalReserves(),
        this.reserveManager.getReserveRatio(),
        this._calculateReserveHealth(),
        this._getReserveDistribution()
      ]);
      
      return {
        totalReserves: ethers.utils.formatEther(totalReserves),
        reserveRatio: reserveRatio.toString() / 10000, // Assuming ratio is in basis points
        reserveHealth,
        reserveDistribution,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching reserve metrics:", error);
      throw new Error("Failed to fetch reserve metrics");
    }
  }
  
  async getStabilityMetrics(timeframe = '30d') {
    try {
      const priceData = await this._getPriceHistory(timeframe);
      
      return {
        volatility: this._calculateVolatility(priceData),
        pegDeviation: this._calculatePegDeviation(priceData),
        meanReversion: this._calculateMeanReversion(priceData),
        priceData: priceData.slice(-100), // Return last 100 data points
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching stability metrics:", error);
      throw new Error("Failed to fetch stability metrics");
    }
  }
  
  async getGovernanceMetrics() {
    try {
      const [
        activeProposals,
        totalProposals,
        voterParticipation,
        topVoters
      ] = await Promise.all([
        this._getActiveProposals(),
        this.governance.getTotalProposalCount(),
        this._calculateVoterParticipation(),
        this._getTopVoters(10)
      ]);
      
      return {
        activeProposals,
        totalProposals: totalProposals.toString(),
        voterParticipation,
        topVoters,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching governance metrics:", error);
      throw new Error("Failed to fetch governance metrics");
    }
  }
  
  async getMarketMetrics() {
    try {
      const [
        liquidityData,
        volume24h,
        marketCap,
        pairAnalytics
      ] = await Promise.all([
        this._getLiquidityData(),
        this._get24HourVolume(),
        this._getMarketCap(),
        this._getTradingPairAnalytics()
      ]);
      
      return {
        liquidity: liquidityData,
        volume24h,
        marketCap,
        tradingPairs: pairAnalytics,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching market metrics:", error);
      throw new Error("Failed to fetch market metrics");
    }
  }
  
  async getUserAdoptionMetrics() {
    try {
      const [
        newUsers24h,
        activeUsers7d,
        userGrowthRate,
        userRetention,
        geographicDistribution
      ] = await Promise.all([
        this._getNewUsers(1),
        this._getActiveUsers(7),
        this._calculateUserGrowthRate(),
        this._calculateUserRetention(),
        this._getUserGeographicDistribution()
      ]);
      
      return {
        newUsers24h,
        activeUsers7d,
        userGrowthRate,
        userRetention,
        geographicDistribution,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching user adoption metrics:", error);
      throw new Error("Failed to fetch user adoption metrics");
    }
  }
  
  // Helper methods
  
  async _getCirculatingSupply() {
    // Implementation would query non-circulating addresses (team, treasury, etc.)
    const totalSupply = await this.stabulumToken.totalSupply();
    const treasuryBalance = await this.stabulumToken.balanceOf(this.config.contracts.treasury);
    const teamVestingBalance = await this.stabulumToken.balanceOf(this.config.contracts.teamVesting);
    
    return totalSupply.sub(treasuryBalance).sub(teamVestingBalance);
  }
  
  async _getUniqueHolders() {
    // In a real implementation, this would query an indexer or blockchain explorer API
    return 15420; // Placeholder value
  }
  
  async _getAverageHoldingTime() {
    // Would analyze transfer events to calculate average holding time
    return "37.5 days"; // Placeholder value
  }
  
  async _calculateReserveHealth() {
    // Analyze reserve composition and risk factors
    // This would involve more complex logic in a real implementation
    return {
      score: 94.2,
      risk: "Low",
      diversification: "High",
      liquidityRatio: 0.87
    };
  }
  
  async _getReserveDistribution() {
    // Get distribution of reserve assets
    return {
      "USDC": 45.3,
      "USDT": 30.1,
      "DAI": 15.5,
      "TUSD": 5.2,
      "Cash (USD)": 3.9
    };
  }
  
  async _getPriceHistory(timeframe) {
    // Would fetch price data from oracles or price feeds
    // Implementation would vary based on available data sources
    
    // Generate mock data for demonstration
    const dataPoints = timeframe === '7d' ? 168 : 
                       timeframe === '30d' ? 720 : 
                       timeframe === '90d' ? 2160 : 720;
    
    const now = Date.now();
    const data = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (dataPoints - i) * 3600000;
      // Generate price with small variations around $1
      const random = (Math.random() * 0.02) - 0.01;
      const price = 1 + random;
      
      data.push({
        timestamp,
        price: price.toFixed(4)
      });
    }
    
    return data;
  }
  
  _calculateVolatility(priceData) {
    // Calculate standard deviation of price
    const prices = priceData.map(d => parseFloat(d.price));
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const squareDiffs = prices.map(p => (p - avg) ** 2);
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    
    return Math.sqrt(avgSquareDiff);
  }
  
  _calculatePegDeviation(priceData) {
    // Calculate average deviation from the peg ($1)
    const deviations = priceData.map(d => Math.abs(parseFloat(d.price) - 1));
    return {
      average: deviations.reduce((a, b) => a + b, 0) / deviations.length,
      max: Math.max(...deviations),
      current: Math.abs(parseFloat(priceData[priceData.length - 1].price) - 1)
    };
  }
  
  _calculateMeanReversion(priceData) {
    // Analyze how quickly price returns to peg after deviations
    // Simple implementation - could be more sophisticated
    return {
      speed: "High",
      halfLife: "2.4 hours"
    };
  }
  
  async _getActiveProposals() {
    // Would query the governance contract for active proposals
    return [
      {
        id: 42,
        title: "Increase reserve ratio to 120%",
        status: "Voting",
        votesFor: "1,245,302",
        votesAgainst: "876,221",
        endsAt: Date.now() + 172800000 // 48 hours from now
      },
      {
        id: 43,
        title: "Add BUSD to reserve assets",
        status: "Voting",
        votesFor: "952,167",
        votesAgainst: "642,890",
        endsAt: Date.now() + 259200000 // 72 hours from now
      }
    ];
  }
  
  async _calculateVoterParticipation() {
    // Would analyze historical voting patterns
    return {
      last30Days: "23.7%",
      trend: "Increasing",
      byProposalType: {
        "Reserve Changes": "31.2%",
        "Fee Adjustments": "19.8%",
        "Technical Upgrades": "15.4%"
      }
    };
  }
  
  async _getTopVoters(limit) {
    // Would identify most active governance participants
    return [
      { address: "0x1a2b...3c4d", votingPower: "1,245,302", participation: "92%" },
      { address: "0x5e6f...7g8h", votingPower: "987,654", participation: "87%" },
      { address: "0x9i0j...1k2l", votingPower: "765,432", participation: "95%" }
    ].slice(0, limit);
  }
  
  async _getLiquidityData() {
    // Would fetch liquidity information from DEXes and other sources
    return {
      total: "$42,567,890",
      byPlatform: {
        "Uniswap": "$12,345,678",
        "SushiSwap": "$8,765,432",
        "PancakeSwap": "$7,654,321",
        "Curve": "$14,567,890"
      }
    };
  }
  
  async _get24HourVolume() {
    // Would aggregate volume across exchanges
    return {
      total: "$7,654,321",
      change: "+12.3%",
      byPlatform: {
        "Uniswap": "$2,345,678",
        "SushiSwap": "$1,654,321",
        "PancakeSwap": "$1,234,567",
        "Curve": "$2,419,755"
      }
    };
  }
  
  async _getMarketCap() {
    const circulatingSupply = await this._getCirculatingSupply();
    const formattedSupply = ethers.utils.formatEther(circulatingSupply);
    
    // In a real implementation, we'd get the actual price
    const price = 1.002; // Mock price
    
    return {
      value: (parseFloat(formattedSupply) * price).toLocaleString(),
      rank: 32, // Mock value
      change24h: "+0.2%"
    };
  }
  
  async _getTradingPairAnalytics() {
    // Would analyze trading pairs across platforms
    return [
      {
        pair: "STAB/USDC",
        volume24h: "$3,456,789",
        liquidity: "$12,345,678",
        priceImpact: "0.02% (100k STAB)"
      },
      {
        pair: "STAB/ETH",
        volume24h: "$1,234,567",
        liquidity: "$5,678,901",
        priceImpact: "0.05% (100k STAB)"
      }
    ];
  }
  
  async _getNewUsers(days) {
    // Count new addresses interacting with the token
    return {
      count: 2347,
      change: "+5.7%",
      trend: "Growing"
    };
  }
  
  async _getActiveUsers(days) {
    // Count addresses with token activity in time period
    return {
      count: 12568,
      change: "+2.3%",
      uniqueInteractions: 45678
    };
  }
  
  async _calculateUserGrowthRate() {
    // Analyze user growth over time
    return {
      daily: "1.2%",
      weekly: "7.8%",
      monthly: "32.5%",
      quarterly: "85.4%"
    };
  }
  
  async _calculateUserRetention() {
    // Analyze how many users remain active after N days
    return {
      "7 days": "89.2%",
      "30 days": "76.5%",
      "90 days": "62.4%"
    };
  }
  
  async _getUserGeographicDistribution() {
    // In a real implementation, would use IP data from API endpoints
    return {
      "North America": "32.5%",
      "Europe": "28.7%",
      "Asia": "24.3%",
      "South America": "8.2%",
      "Africa": "4.1%",
      "Oceania": "2.2%"
    };
  }
  
  // Event monitoring for real-time analytics
  
  startMonitoring() {
    // Monitor token events
    this.stabulumToken.on("Transfer", this._handleTransfer.bind(this));
    
    // Monitor reserve events
    this.reserveManager.on("ReserveAdded", this._handleReserveAdded.bind(this));
    this.reserveManager.on("ReserveRemoved", this._handleReserveRemoved.bind(this));
    
    // Monitor governance events
    this.governance.on("ProposalCreated", this._handleProposalCreated.bind(this));
    this.governance.on("VoteCast", this._handleVoteCast.bind(this));
    
    console.log("Stabulum Analytics: Event monitoring started");
  }
  
  stopMonitoring() {
    this.stabulumToken.removeAllListeners();
    this.reserveManager.removeAllListeners();
    this.governance.removeAllListeners();
    
    console.log("Stabulum Analytics: Event monitoring stopped");
  }
  
  _handleTransfer(from, to, amount) {
    // Process transfer events
    console.log(`Transfer: ${from} -> ${to}, Amount: ${ethers.utils.formatEther(amount)}`);
    // Would update metrics in real-time
  }
  
  _handleReserveAdded(asset, amount) {
    // Process reserve addition events
    console.log(`Reserve Added: ${asset}, Amount: ${ethers.utils.formatEther(amount)}`);
    // Would update reserve metrics
  }
  
  _handleReserveRemoved(asset, amount) {
    // Process reserve removal events
    console.log(`Reserve Removed: ${asset}, Amount: ${ethers.utils.formatEther(amount)}`);
    // Would update reserve metrics
  }
  
  _handleProposalCreated(id, proposer, description) {
    // Process new proposal events
    console.log(`Proposal Created: ${id}, Proposer: ${proposer}, Description: ${description}`);
    // Would update governance metrics
  }
  
  _handleVoteCast(voter, proposalId, support, weight) {
    // Process voting events
    console.log(`Vote Cast: ${voter} voted ${support ? 'for' : 'against'} proposal ${proposalId} with weight ${weight}`);
    // Would update governance metrics
  }
  
  // API for external data access
  
  async getDashboardData() {
    // Compile all metrics for dashboard display
    const [
      tokenMetrics,
      reserveMetrics,
      stabilityMetrics,
      marketMetrics,
      userMetrics,
      governanceMetrics
    ] = await Promise.all([
      this.getTokenMetrics(),
      this.getReserveMetrics(),
      this.getStabilityMetrics(),
      this.getMarketMetrics(),
      this.getUserAdoptionMetrics(),
      this.getGovernanceMetrics()
    ]);
    
    return {
      token: tokenMetrics,
      reserve: reserveMetrics,
      stability: stabilityMetrics,
      market: marketMetrics,
      users: userMetrics,
      governance: governanceMetrics,
      timestamp: Date.now()
    };
  }
  
  async getHealthScore() {
    // Calculate overall health score for the stablecoin
    const [
      reserveMetrics,
      stabilityMetrics,
      marketMetrics
    ] = await Promise.all([
      this.getReserveMetrics(),
      this.getStabilityMetrics(),
      this.getMarketMetrics()
    ]);
    
    // Calculate score based on multiple factors
    // This is a simplified implementation
    const reserveScore = reserveMetrics.reserveHealth.score * 0.4;
    const stabilityScore = (1 - stabilityMetrics.volatility * 100) * 0.4;
    const marketScore = parseFloat(marketMetrics.liquidity.total.replace(/[$,]/g, '')) > 10000000 ? 20 : 10;
    
    const totalScore = reserveScore + stabilityScore + marketScore;
    
    return {
      score: totalScore.toFixed(1),
      grade: this._scoreToGrade(totalScore),
      breakdown: {
        reserve: reserveScore.toFixed(1),
        stability: stabilityScore.toFixed(1),
        market: marketScore.toFixed(1)
      },
      timestamp: Date.now()
    };
  }
  
  _scoreToGrade(score) {
    if (score >= 90) return "A+";
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "B-";
    if (score >= 60) return "C+";
    if (score >= 55) return "C";
    if (score >= 50) return "C-";
    if (score >= 45) return "D+";
    if (score >= 40) return "D";
    return "F";
  }
  
  // Data export functions
  
  async exportCSV(metrics, timeframe) {
    // Generate CSV data for the requested metrics
    const data = await this._getExportData(metrics, timeframe);
    
    // Convert to CSV format
    let csv = "timestamp," + Object.keys(data[0]).filter(k => k !== 'timestamp').join(',') + '\n';
    
    data.forEach(row => {
      csv += row.timestamp + ',' + 
             Object.keys(row)
               .filter(k => k !== 'timestamp')
               .map(k => row[k])
               .join(',') + '\n';
    });
    
    return csv;
  }
  
  async exportJSON(metrics, timeframe) {
    // Generate JSON data for the requested metrics
    const data = await this._getExportData(metrics, timeframe);
    return JSON.stringify(data, null, 2);
  }
  
  async _getExportData(metrics, timeframe) {
    // Fetch historical data based on metrics and timeframe
    // This would be implemented with historical data storage
    
    // Mock implementation
    const dataPoints = timeframe === '7d' ? 7 : 
                       timeframe === '30d' ? 30 : 
                       timeframe === '90d' ? 90 : 30;
    
    const now = Date.now();
    const data = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = new Date(now - (dataPoints - i) * 86400000).toISOString().split('T')[0];
      
      const row = { timestamp };
      
      if (metrics.includes('price')) {
        row.price = (1 + (Math.random() * 0.02) - 0.01).toFixed(4);
      }
      
      if (metrics.includes('supply')) {
        row.totalSupply = (100000000 + i * 50000).toLocaleString();
        row.circulatingSupply = (75000000 + i * 40000).toLocaleString();
      }
      
      if (metrics.includes('users')) {
        row.activeUsers = (10000 + i * 100).toLocaleString();
        row.newUsers = (Math.floor(Math.random() * 500) + 100).toLocaleString();
      }
      
      if (metrics.includes('reserves')) {
        row.reserveRatio = ((115 + (Math.random() * 2) - 1) / 100).toFixed(2);
      }
      
      data.push(row);
    }
    
    return data;
  }
}

module.exports = StabulumAnalytics;
