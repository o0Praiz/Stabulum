import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'recharts';
import { Wallet, ArrowRight, BarChart3, History, Layers, Settings, Shield, ArrowUpRight, Users, PieChart, DollarSign } from 'lucide-react';

// Assuming StabulumAPI is available via import
// import StabulumAPI from './StabulumAPI';

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

  // Mock API (would be replaced with actual StabulumAPI instance)
  const api = {
    connectWallet: async () => {
      // Simulating wallet connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      return '0x1234...5678';
    },
    getBalance: async () => {
      // Simulating balance fetch
      await new Promise(resolve => setTimeout(resolve, 500));
      return '1000.00';
    },
    getReserveStatus: async () => {
      // Simulating reserve status fetch
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        totalSupply: '1204000',
        reserves: '1250000',
        collateralizationRatio: '103.8',
        lastUpdated: new Date().toISOString()
      };
    },
    isKYCVerified: async () => {
      // Simulating KYC status check
      await new Promise(resolve => setTimeout(resolve, 600));
      return true;
    },
    getTransactionHistory: async () => {
      // Simulating transaction history fetch
      await new Promise(resolve => setTimeout(resolve, 700));
      return [
        { transactionHash: '0xabc...123', from: '0x1234...5678', to: '0x5678...9012', value: '100', timestamp: new Date().toISOString() },
        { transactionHash: '0xdef...456', from: '0x5678...9012', to: '0x1234...5678', value: '50', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { transactionHash: '0xghi...789', from: '0x1234...5678', to: '0x9012...3456', value: '25', timestamp: new Date(Date.now() - 172800000).toISOString() },
      ];
    },
    getProposals: async () => {
      // Simulating proposals fetch
      await new Promise(resolve => setTimeout(resolve, 900));
      return [
        { id: '1', proposer: '0xabcd...1234', description: 'Adjust reserve ratio to 105%', status: 'Active', forVotes: '500000', againstVotes: '200000' },
        { id: '2', proposer: '0xefgh...5678', description: 'Add new reserve asset', status: 'Succeeded', forVotes: '700000', againstVotes: '100000' },
      ];
    }
  };

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In a real app, uncomment and use the actual API
        // const api = new StabulumAPI({ ... });
        // await api.initialize();
        
        // Fetch reserve history
        setReserveHistory(sampleReserveHistory);
        
        // Fetch market data
        setMarketData(sampleMarketData);
        
        // Fetch proposals
        const proposalsData = await api.getProposals();
        setProposals(proposalsData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      const address = await api.connectWallet();
      setAccount(address);
      setConnected(true);
      
      // Fetch user data
      const balanceData = await api.getBalance();
      setBalance(balanceData);
      
      // Fetch KYC status
      const kycStatus = await api.isKYCVerified();
      setIsKYCVerified(kycStatus);
      
      // Fetch transaction history
      const history = await api.getTransactionHistory();
      setTxHistory(history);
      
      // Fetch reserve status
      const reserveData = await api.getReserveStatus();
      setReserves(reserveData);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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
          <p className="text-sm text-gray-500 mt-1">1 USD = 0.998 STAB</p>
        </div>
        
        {/* Reserve Ratio */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-semibold">Reserve Ratio</h3>
            <Shield className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold mt-2">{reserves?.collateralizationRatio}%</p>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date(reserves?.lastUpdated).toLocaleString()}</p>
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
            <LineChart width={800} height={250} data={reserveHistory}>
              <Line type="monotone" dataKey="ratio" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Bar dataKey="reserves" fill="#8884d8" />
            </LineChart>
          </div>
        </div>
        
        {/* Active Proposals */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-semibold">Active Proposals</h3>
            <Users className="text-indigo-500" size={20} />
          </div>
          <div className="space-y-3">
            {proposals.map(proposal => (
              <div key={proposal.id} className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{proposal.description}</span>
                  <span className={`px