import React, { useState, useEffect } from 'react';
import { Line, Bar, LineChart, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Wallet, ArrowRight, BarChart3, History, Layers, Settings, Shield, ArrowUpRight, Users, PieChart, DollarSign } from 'lucide-react';

// Assuming StabulumAPI is available via import
import StabulumAPI from './StabulumAPI';

const StabulumDashboard = () => {
  // State
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [reserves, setReserves] = useState(null);
  const [isKYCVerified, setIsKYCVerified] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [reserveHistory, setReserveHistory] = useState([]);
  const [marketData, setMarketData] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mintAmount, setMintAmount] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAddress, setTransferAddress] = useState('');
  const [kycStatus, setKycStatus] = useState('Not Started');

  // Sample data - in a real app, this would come from the API
  const sampleReserveHistory = [
    { date: '2024-01-01', ratio: 102.5, reserves: 1000000, supply: 975000 },
    { date: '2024-02-01', ratio: 103.1, reserves: 1050000, supply: 1018000 },
    { date: '2024-03-01', ratio: 102.8, reserves: 1100000, supply: 1070000 },
    { date: '2024-04-01', ratio: 103.5, reserves: 1150000, supply: 1111000 },
    { date: '2024-05-01', ratio: 104.2, reserves: 1200000, supply: 1152000 },
    { date: '2024-06-01', ratio: 103.8, reserves: 1250000, supply: 1204000 },
  ];

  const sampleMarketData = {
    price: 1.002,
    volume24h: 8542000,
    marketCap: 1204000,
    exchanges: [
      { name: 'Uniswap', volume: 3200000, pairs: ['USDC', 'ETH'] },
      { name: 'Binance', volume: 2500000, pairs: ['USDT', 'BTC'] },
      { name: 'Curve', volume: 1800000, pairs: ['DAI', '3CRV'] },
    ]
  };

  // Initialize API
  const api = new StabulumAPI();

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await api.initialize();
        
        // Fetch reserve history
        const historyData = await api.getReserveHistory();
        setReserveHistory(historyData || sampleReserveHistory);
        
        // Fetch market data
        const marketStats = await api.getMarketData();
        setMarketData(marketStats || sampleMarketData);
        
        // Fetch proposals
        const proposalsData = await api.getProposals();
        setProposals(proposalsData || []);
        
        // Check if wallet is already connected
        const savedAccount = localStorage.getItem('stabulumAccount');
        if (savedAccount) {
          setAccount(savedAccount);
          setConnected(true);
          
          // Fetch user data
          await fetchUserData(savedAccount);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch user data
  const fetchUserData = async (address) => {
    try {
      // Fetch balance
      const balanceData = await api.getBalance(address);
      setBalance(balanceData);
      
      // Fetch KYC status
      const kycStatus = await api.isKYCVerified(address);
      setIsKYCVerified(kycStatus);
      
      // Fetch transaction history
      const history = await api.getTransactionHistory(address);
      setTxHistory(history);
      
      // Fetch reserve status
      const reserveData = await api.getReserveStatus();
      setReserves(reserveData);
      
      // Fetch KYC status name
      const kycStatusName = await api.getKYCStatus(address);
      setKycStatus(kycStatusName);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      const address = await api.connectWallet();
      setAccount(address);
      setConnected(true);
      
      // Save to local storage
      localStorage.setItem('stabulumAccount', address);
      
      // Fetch user data
      await fetchUserData(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Disconnect wallet handler
  const handleDisconnectWallet = () => {
    setAccount(null);
    setConnected(false);
    setBalance('0');
    setIsKYCVerified(false);
    setTxHistory([]);
    localStorage.removeItem('stabulumAccount');
  };

  // Mint tokens handler
  const handleMint = async () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) return;
    
    try {
      const result = await api.mintTokens(mintAmount);
      if (result.success) {
        // Refresh balance and transaction history
        await fetchUserData(account);
        
        // Reset form
        setMintAmount('');
      }
    } catch (error) {
      console.error('Failed to mint tokens:', error);
    }
  };

  // Burn tokens handler
  const handleBurn = async () => {
    if (!burnAmount || parseFloat(burnAmount) <= 0) return;
    
    try {
      const result = await api.burnTokens(burnAmount);
      if (result.success) {
        // Refresh balance and transaction history
        await fetchUserData(account);
        
        // Reset form
        setBurnAmount('');
      }
    } catch (error) {
      console.error('Failed to burn tokens:', error);
    }
  };

  // Transfer tokens handler
  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0 || !transferAddress) return;
    
    try {
      const result = await api.transferTokens(transferAddress, transferAmount);
      if (result.success) {
        // Refresh balance and transaction history
        await fetchUserData(account);
        
        // Reset form
        setTransferAmount('');
        setTransferAddress('');
      }
    } catch (error) {
      console.error('Failed to transfer tokens:', error);
    }
  };

  // Start KYC process handler
  const handleStartKYC = async () => {
    try {
      const result = await api.startKYCProcess();
      if (result.success) {
        setKycStatus(result.status);
      }
    } catch (error) {
      console.error('Failed to start KYC process:', error);
    }
  };

  // Vote on proposal handler
  const handleVote = async (proposalId, support) => {
    try {
      const result = await api.voteOnProposal(proposalId, support);
      if (result.success) {
        // Refresh proposals
        const proposalsData = await api.getProposals();
        setProposals(proposalsData);
      }
    } catch (error) {
      console.error('Failed to vote on proposal:', error);
    }
  };

  // Render functions
  const renderOverview = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Current Price */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-semibold">Current Price</h3>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <p className="text-3xl font-bold mt-2">${marketData?.price.toFixed(3)}</p>
          <p className="text-sm text-gray-500 mt-1">1 USD = {(1 / (marketData?.price || 1)).toFixed(3)} STAB</p>
        </div>
        
        {/* Reserve Ratio */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-semibold">Reserve Ratio</h3>
            <Shield className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold mt-2">{reserves?.collateralizationRatio}%</p>
          <p className="text-sm text-gray-500 mt-1">Last updated: {reserves?.lastUpdated ? new Date(reserves.lastUpdated).toLocaleString() : '--'}</p>
        </div>
        
        {/* Total Supply */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-semibold">Total Supply</h3>
            <Layers className="text-purple-500" size={20} />
          </div>
          <p className="text-3xl font-bold mt-2">{reserves ? Number(reserves.totalSupply).toLocaleString() : '--'}</p>
          <p className="text-sm text-gray-500 mt-1">Market Cap: ${marketData?.marketCap.toLocaleString()}</p>
        </div>
        
        {/* Reserve History Chart */}
        <div className="bg-white shadow rounded-lg p-4 md:col-span-2">
          <h3 className="text-gray-700 font-semibold mb-4">Reserve Ratio History</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reserveHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ratio" stroke="#3b82f6" strokeWidth={2} name="Reserve Ratio (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Active Proposals */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-semibold">Active Proposals</h3>
            <Users className="text-indigo-500" size={20} />
          </div>
          <div className="space-y-3">
            {proposals.filter(p => p.status === 'Active').slice(0, 3).map(proposal => (
              <div key={proposal.id} className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{proposal.description}</span>
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                    {proposal.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>For: {Number(proposal.forVotes).toLocaleString()}</span>
                    <span>Against: {Number(proposal.againstVotes).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {proposals.filter(p => p.status === 'Active').length > 3 && (
              <div className="text-center mt-2">
                <button 
                  onClick={() => setActiveTab('governance')}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  View all proposals
                </button>
              </div>
            )}
            {proposals.filter(p => p.status === 'Active').length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No active proposals
              </div>
            )}
          </div>
        </div>
        
        {/* 24h Trading Volume */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-semibold">24h Trading Volume</h3>
            <BarChart3 className="text-orange-500" size={20} />
          </div>
          <p className="text-2xl font-bold">${marketData?.volume24h.toLocaleString()}</p>
          
          <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Top Exchanges</h4>
          <div className="space-y-2">
            {marketData?.exchanges.map((exchange, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{exchange.name}</span>
                <span>${exchange.volume.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWallet = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wallet Balance */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-semibold">Wallet Balance</h3>
            <Wallet className="text-green-500" size={20} />
          </div>
          <p className="text-3xl font-bold">{balance} STAB</p>
          <p className="text-sm text-gray-500 mt-1">≈ ${(parseFloat(balance) * (marketData?.price || 1)).toFixed(2)}</p>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">Wallet Address</p>
            <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">{account}</p>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">KYC Status</p>
            <div className="flex items-center mt-1">
              <div className={`w-3 h-3 rounded-full ${isKYCVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p className="ml-2 text-sm">{isKYCVerified ? 'Verified' : 'Not Verified'}</p>
              
              {!isKYCVerified && (
                <button 
                  onClick={handleStartKYC}
                  className="ml-4 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Start KYC
                </button>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleDisconnectWallet}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition w-full"
          >
            Disconnect Wallet
          </button>
        </div>
        
        {/* Transaction History */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-semibold">Transaction History</h3>
            <History className="text-blue-500" size={20} />
          </div>
          
          <div className="space-y-3">
            {txHistory.length > 0 ? (
              txHistory.map((tx, index) => (
                <div key={index} className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">{tx.transactionHash}</span>
                    <span className="text-sm">{new Date(tx.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="truncate w-24">{tx.from}</span>
                      <ArrowRight size={14} className="mx-2" />
                      <span className="truncate w-24">{tx.to}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-semibold">{tx.value} STAB</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No transactions yet
              </div>
            )}
          </div>
        </div>
        
        {/* Token Operations */}
        <div className="bg-white shadow rounded-lg p-4 md:col-span-2">
          <h3 className="text-gray-700 font-semibold mb-4">Token Operations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mint */}
            <div className="border rounded-lg p-4">
              <h4 className="text-gray-700 font-medium mb-2">Mint Tokens</h4>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <input 
                  type="number" 
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              <button 
                onClick={handleMint}
                disabled={!isKYCVerified}
                className={`w-full py-2 rounded transition ${isKYCVerified ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Mint STAB
              </button>
              {!isKYCVerified && (
                <p className="text-xs text-red-500 mt-1">KYC verification required</p>
              )}
            </div>
            
            {/* Burn */}
            <div className="border rounded-lg p-4">
              <h4 className="text-gray-700 font-medium mb-2">Burn Tokens</h4>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <input 
                  type="number" 
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              <button 
                onClick={handleBurn}
                disabled={!isKYCVerified}
                className={`w-full py-2 rounded transition ${isKYCVerified ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Burn STAB
              </button>
              {!isKYCVerified && (
                <p className="text-xs text-red-500 mt-1">KYC verification required</p>
              )}
            </div>
            
            {/* Transfer */}
            <div className="border rounded-lg p-4">
              <h4 className="text-gray-700 font-medium mb-2">Transfer Tokens</h4>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Recipient Address</label>
                <input 
                  type="text" 
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0x..."
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <input 
                  type="number" 
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              <button 
                onClick={handleTransfer}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
              >
                Transfer STAB
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGovernance = () => {
    return (
      <div className="grid grid-cols-1 gap-4">
        {/* Governance Overview */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-gray-700 font-semibold mb-4">Governance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center">
              <h4 className="text-gray-600 text-sm">Total Proposals</h4>
              <p className="text-2xl font-bold mt-2">{proposals.length}</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <h4 className="text-gray-600 text-sm">Active Proposals</h4>
              <p className="text-2xl font-bold mt-2">{proposals.filter(p => p.status === 'Active').length}</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <h4 className="text-gray-600 text-sm">Your Voting Power</h4>
              <p className="text-2xl font-bold mt-2">{balance} STAB</p>
            </div>
          </div>
          
          <h4 className="text-gray-700 font-medium mb-3">Proposals</h4>
          <div className="space-y-4">
            {proposals.length > 0 ? (
              proposals.map(proposal => (
                <div key={proposal.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium">Proposal #{proposal.id}</h5>
                    <span className={`px-2 py-1 rounded text-xs ${proposal.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {proposal.status}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{proposal.description}</p>
                  <div className="text-sm text-gray-600 mb-2">
                    <span>Proposer: {proposal.proposer}</span>
                  </div>
                  
                  <div className="bg-gray-100 rounded p-3 mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>For: {Number(proposal.forVotes).toLocaleString()}</span>
                      <span>Against: {Number(proposal.againstVotes).toLocaleString()}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${(parseInt(proposal.forVotes) / (parseInt(proposal.forVotes) + parseInt(proposal.againstVotes)) * 100) || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {proposal.status === 'Active' && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={!isKYCVerified}
                        className={`flex-1 py-2 rounded transition ${isKYCVerified ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        Vote For
                      </button>
                      <button 
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={!isKYCVerified}
                        className={`flex-1 py-2 rounded transition ${isKYCVerified ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        Vote Against
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No proposals yet
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReserves = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reserve Status */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-semibold">Reserve Status</h3>
            <Shield className="text-blue-500" size={20} />
          </div>
          
          <div className="space-y-4">
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Total Supply</p>
              <p className="text-xl font-bold">{reserves ? Number(reserves.totalSupply).toLocaleString() : '--'} STAB</p>
            </div>
            
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Total Reserves</p>
              <p className="text-xl font-bold">${reserves ? Number(reserves.reserves).toLocaleString() : '--'}</p>
            </div>
            
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Collateralization Ratio</p>
              <p className="text-xl font-bold">{reserves?.collateralizationRatio}%</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="text-sm">{reserves?.lastUpdated ? new Date(reserves.lastUpdated).toLocaleString() : '--'}</p>
            </div>
          </div>
        </div>
        
        {/* Reserve History Chart */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-gray-700 font-semibold mb-4">Reserve History</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reserveHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ratio" stroke="#3b82f6" strokeWidth={2} name="Reserve Ratio (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Reserve Composition */}
        <div className="bg-white shadow rounded-lg p-4 md:col-span-2">
          <h3 className="text-gray-700 font-semibold mb-4">Reserve Composition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="text-gray-700 font-medium mb-3">Assets</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span>USDC</span>
                  </div>
                  <span>60%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span>DAI</span>
                  </div>
                  <span>30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span>USDT</span>
                  </div>
                  <span>10%</span>
                </div>
              