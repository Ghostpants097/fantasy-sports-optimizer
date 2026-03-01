"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { LayoutDashboard, Settings2, BarChart3, Users, Download, Play, ShieldBan, Lock, Unplug, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface Player {
  id: number;
  name: string;
  sport: string;
  team: string;
  position: string;
  salary: number;
  projected_points: number;
  stats?: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'optimizer' | 'lineups' | 'analysis' | 'roster'>('optimizer');

  // Optimizer State
  const [selectedSport, setSelectedSport] = useState<string>('LaLiga');
  const [salaryCap, setSalaryCap] = useState<number>(100000);
  const [lineup, setLineup] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState({ points: 0, salary: 0 });
  const [error, setError] = useState<string | null>(null);

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [lockedPlayers, setLockedPlayers] = useState<number[]>([]);
  const [bannedPlayers, setBannedPlayers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [numVariations, setNumVariations] = useState<number>(1);
  const [allLineups, setAllLineups] = useState<any[]>([]);
  const [currentLineupIndex, setCurrentLineupIndex] = useState<number>(0);
  const [simulationData, setSimulationData] = useState<any[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<Player | null>(null);

  const sports = ['LaLiga', 'IPL'];

  const getCurrencySymbol = (sport: string) => sport === 'LaLiga' ? '€' : '₹';

  useEffect(() => {
    // Reset selections on sport change
    setLockedPlayers([]);
    setBannedPlayers([]);
    setLineup([]);
    setAllLineups([]);
    setCurrentLineupIndex(0);
    setSimulationData([]);
    fetchPlayers();
  }, [selectedSport]);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/?sport=${selectedSport}`);
      if (res.ok) {
        const data = await res.json();
        setAvailablePlayers(data);
      }
    } catch (e) {
      console.error("Failed to fetch players", e);
    }
  };

  const toggleLock = (id: number) => {
    if (bannedPlayers.includes(id)) setBannedPlayers(bannedPlayers.filter(pid => pid !== id));
    setLockedPlayers(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const toggleBan = (id: number) => {
    if (lockedPlayers.includes(id)) setLockedPlayers(lockedPlayers.filter(pid => pid !== id));
    setBannedPlayers(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      setLoading(true);
      setError('');

      const payload = {
        sport: selectedSport,
        salary_cap: salaryCap,
        locked_players: lockedPlayers,
        banned_players: bannedPlayers,
        num_variations: 3 // Request our specific quantity of lineups!
      };

      const response = await fetch(`${API_BASE_URL}/optimize/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate optimized lineup');
      }

      const data = await response.json();

      if (data.success) {
        setAllLineups(data.lineups || []);
        setCurrentLineupIndex(0);
        setLineup(data.lineup);
        setSimulationData([]); // clear previous simulation
        setSummary({ points: data.total_points, salary: data.total_salary });

        // Auto-switch to the new beautiful Lineups tab!
        setActiveTab('lineups');
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const positionDistribution = lineup.reduce((acc, player) => {
    const existing = acc.find(item => item.name === player.position);
    if (existing) {
      existing.value += player.salary;
    } else {
      acc.push({ name: player.position, value: player.salary });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const projectionsData = lineup.map(p => ({
    name: p.name.split(" ")[0], // Use first name for space
    points: p.projected_points
  }));

  const handleExportCSV = () => {
    if (lineup.length === 0) return;
    const headers = ['Name', 'Position', 'Team', `Salary (${getCurrencySymbol(selectedSport)})`, 'Projected Points'];
    const rows = lineup.map(p => [p.name, p.position, p.team, p.salary, p.projected_points.toFixed(1)]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fantasy_Lineup_${selectedSport}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulate = async () => {
    if (lineup.length === 0) return;
    try {
      setSimulating(true);
      const projectedScores = lineup.map(p => p.projected_points);

      const response = await fetch(`${API_BASE_URL}/simulate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projected_points: projectedScores }),
      });

      if (!response.ok) throw new Error('Simulation failed');

      const data = await response.json();
      if (data.success && data.simulations) {
        // Bin into 20 distribution buckets to create a bell curve graph
        const bins = Array.from({ length: 20 }, () => 0);
        const min = Math.min(...data.simulations);
        const max = Math.max(...data.simulations);
        const step = (max - min) / 20;

        data.simulations.forEach((score: number) => {
          const binIndex = Math.min(Math.floor((score - min) / step), 19);
          bins[binIndex]++;
        });

        const chartData = bins.map((count, i) => ({
          score: Math.round(min + (i * step)),
          frequency: count
        }));
        setSimulationData(chartData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSyncLiveData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/sync/`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to sync API data');

      alert(data.message);
      fetchPlayers(); // Refresh the grid to show new data!

    } catch (err: any) {
      setError(err.message || "Could not reach live API.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------------------------
  const renderSidebar = () => (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col hidden md:flex shrink-0 relative z-10">
      <div className="p-6">
        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text flex items-center gap-2">
          <Unplug className="w-6 h-6 text-emerald-400" />
          FantasyOpt V4
        </h1>
        <p className="text-xs text-slate-500 mt-1">AI Match Prediction Engine</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {[
          { id: 'dashboard', label: 'Dashboard Home', icon: LayoutDashboard },
          { id: 'optimizer', label: 'Optimizer Studio', icon: Settings2 },
          { id: 'lineups', label: 'Generated Lineups', icon: Play },
          { id: 'analysis', label: 'Roster Analysis', icon: BarChart3 },
          { id: 'roster', label: 'Player Database', icon: Users },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <button
          onClick={handleSyncLiveData}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors mb-4 border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing...' : 'Sync Live Data'}
        </button>

        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Active Server Engine</div>
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            scikit-learn active
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-5xl mx-auto w-full">
      <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
      <p className="text-slate-400 mb-8">System status and previous generation aggregates.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 border-t-2 border-t-blue-500">
          <h3 className="text-slate-400 text-sm font-medium">Selected Sport</h3>
          <p className="text-2xl font-bold text-white mt-1">{selectedSport}</p>
        </div>
        <div className="glass-panel p-6 border-t-2 border-t-emerald-500">
          <h3 className="text-slate-400 text-sm font-medium">Last Proj. Score</h3>
          <p className="text-2xl font-bold text-white mt-1">{summary.points.toFixed(1)} <span className="text-sm text-slate-500 font-normal">pts</span></p>
        </div>
        <div className="glass-panel p-6 border-t-2 border-t-amber-500">
          <h3 className="text-slate-400 text-sm font-medium">Database Active</h3>
          <p className="text-2xl font-bold text-white mt-1">{availablePlayers.length} <span className="text-sm text-slate-500 font-normal">athletes</span></p>
        </div>
      </div>

      <div className="glass-panel p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-700/50">
        <Settings2 className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-xl text-slate-200 font-medium mb-2">Ready to Build</h3>
        <p className="text-slate-400 max-w-md mx-auto mb-6">Head over to the Optimizer Studio to configure your salary constraints and generate the absolute mathematically optimal DFS lineup.</p>
        <button
          onClick={() => setActiveTab('optimizer')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
        >
          Open Studio
        </button>
      </div>
    </motion.div>
  );

  const renderOptimizer = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-6 xl:p-8 max-w-7xl mx-auto w-full h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
            Fantasy Sports Optimizer
          </h1>
          <p className="text-slate-400 text-lg">AI-Driven Daily Lineup Generation</p>
        </div>
        <button
          onClick={handleOptimize}
          disabled={loading}
          className="primary-btn mt-6 md:mt-0 flex items-center justify-center min-w-[160px]"
        >
          {loading ? (
            <span className="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span>
          ) : (
            "Optimize Lineup"
          )}
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-400 text-sm flex items-center">
          <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {sports.map((sport) => (
          <div
            key={sport}
            onClick={() => setSelectedSport(sport)}
            className={`glass-panel stat-card p-6 flex flex-col items-center justify-center cursor-pointer group ${selectedSport === sport ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''
              }`}
          >
            <h2 className={`text-2xl font-bold transition-colors ${selectedSport === sport ? 'text-blue-400' : 'group-hover:text-blue-400/70'
              }`}>
              {sport}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {selectedSport === sport ? 'Selected' : 'Select Settings'}
            </p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-6 min-h-[400px]">
          <h3 className="text-xl font-semibold mb-6 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-3 animate-pulse"></span>
            Player Pool Overview &amp; Settings
          </h3>
          <div className="space-y-6 text-slate-400 text-sm">
            <div className="p-4 bg-slate-800/40 rounded border border-slate-700/50">
              <strong className="text-slate-200 block mb-2">Algorithm Settings</strong>
              The AI incorporates a Linear Programming approach (PuLP) to maximize the overall projected points while strictly adhering to positional constraints and keeping the total team salary under the {getCurrencySymbol(selectedSport)}{salaryCap.toLocaleString()} cap threshold.
            </div>
            <div className="p-4 bg-slate-800/40 rounded border border-slate-700/50">
              <strong className="text-slate-200 block mb-2 flex justify-between">
                <span>Threshold Limit (Salary Cap)</span>
                <span className="text-blue-400 font-mono">{getCurrencySymbol(selectedSport)}{salaryCap.toLocaleString()}</span>
              </strong>
              <input
                type="range"
                min="50000"
                max="250000"
                step="5000"
                value={salaryCap}
                onChange={(e) => setSalaryCap(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>{getCurrencySymbol(selectedSport)}50,000</span>
                <span>{getCurrencySymbol(selectedSport)}250,000</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded border border-slate-700/50">
              <strong className="text-slate-200 block mb-2 flex justify-between items-center">
                <span>Lineup Variations</span>
                <select
                  value={numVariations}
                  onChange={(e) => setNumVariations(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded p-1 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>Generate 1 Lineup</option>
                  <option value={3}>Top 3 Variations</option>
                  <option value={5}>Top 5 Variations</option>
                </select>
              </strong>
              <p className="text-xs text-slate-400">Generate multiple slightly distinct optimal configurations instead of just one.</p>
            </div>

            <div className="p-4 bg-slate-800/40 rounded border border-slate-700/50">
              <strong className="text-slate-200 block mb-3 flex justify-between">
                <span>Player Pool Configuration</span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  {lockedPlayers.length} Locked | {bannedPlayers.length} Banned
                </span>
              </strong>

              <input
                type="text"
                placeholder="Search athletes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 mb-3 text-sm focus:outline-none focus:border-blue-500"
              />

              <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {availablePlayers
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-800 hover:border-slate-600 transition-all cursor-pointer hover:bg-slate-800/80" onClick={(e) => {
                      // Prevent modal if clicking button
                      if ((e.target as HTMLElement).tagName.toLowerCase() !== 'button') {
                        setSelectedPlayerModal(player);
                      }
                    }}>
                      <div className="flex flex-col">
                        <span className="text-slate-200 text-sm font-medium">{player.name}</span>
                        <span className="text-slate-500 text-xs">{player.team} | {player.position} | {getCurrencySymbol(selectedSport)}{player.salary}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLock(player.id); }}
                          className={`text-xs px-2 py-1 rounded transition-colors ${lockedPlayers.includes(player.id) ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Force Include"
                        >
                          <Lock className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleBan(player.id); }}
                          className={`text-xs px-2 py-1 rounded transition-colors ${bannedPlayers.includes(player.id) ? 'bg-rose-600 text-white shadow shadow-rose-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Force Exclude"
                        >
                          <ShieldBan className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded border border-slate-700/50">
              <strong className="text-slate-200 block mb-2">Current Mode: {selectedSport}</strong>
              Position constraints are dynamically adapted to strictly fit official daily fantasy {selectedSport} guidelines, limited to a max of {selectedSport === 'IPL' ? 7 : 5} players per real-world team.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderLineups = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-6 xl:p-8 max-w-7xl mx-auto w-full h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Play className="w-8 h-8 text-emerald-400" />
            Active DFS Lineups
          </h2>
          <p className="text-slate-400 mt-2 text-sm">Visual field representations and detailed rosters of your AI-generated optimal configurations.</p>
        </div>
      </div>

      {lineup.length === 0 ? (
        <div className="glass-panel p-16 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-700/50">
          <Settings2 className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
          <h3 className="text-xl text-slate-200 font-medium mb-2">Configure Your Engine First</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">You currently have no generated lineups. Head to the Optimizer section to build one.</p>
          <button
            onClick={() => setActiveTab('optimizer')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg"
          >
            Go to Optimizer
          </button>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Visual Pitch Area */}
          {selectedSport === 'LaLiga' && (
            <div className="w-full xl:w-1/2 relative bg-gradient-to-b from-green-600 to-green-800 rounded-lg overflow-hidden border-2 border-slate-700 h-[600px] flex flex-col items-center shadow-inner pt-8">
              {/* Field Lines */}
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="w-full h-1/2 border-b-2 border-white"></div>
                <div className="absolute top-1/2 left-1/2 w-32 h-32 -mt-16 -ml-16 rounded-full border-2 border-white"></div>
                <div className="absolute top-0 left-1/2 w-48 h-32 -ml-24 border-2 border-t-0 border-white"></div>
                <div className="absolute bottom-0 left-1/2 w-48 h-32 -ml-24 border-2 border-b-0 border-white"></div>
              </div>

              {/* Render Players on Field By Position */}
              {['FWD', 'MID', 'DEF', 'GK'].map((posStr, pIdx) => {
                const playersInPos = lineup.filter(p => p.position === posStr);
                return (
                  <div key={posStr} className="w-full relative flex justify-around px-8" style={{ marginTop: posStr === 'GK' ? 'auto' : (pIdx === 0 ? '5%' : '15%'), marginBottom: posStr === 'GK' ? '5%' : '0' }}>
                    {playersInPos.map((p, i) => (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: (pIdx * 0.1) + (i * 0.1) }}
                        key={p.id}
                        onClick={() => setSelectedPlayerModal(p)}
                        className="flex flex-col items-center cursor-pointer group z-10"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-300 shadow-xl flex items-center justify-center text-xs font-bold text-slate-100 group-hover:border-emerald-400 group-hover:bg-slate-800 transition-colors">
                          {p.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                        </div>
                        <div className="mt-1 bg-black/70 px-2 py-0.5 rounded text-[10px] font-medium text-white backdrop-blur-sm whitespace-nowrap min-w-[60px] text-center border border-white/10 group-hover:border-emerald-400/50">
                          {p.name.split(" ").pop()}
                        </div>
                        <div className="text-[#38bdf8] text-[10px] font-bold drop-shadow-md bg-black/40 px-1 rounded mt-0.5">
                          {p.projected_points.toFixed(1)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {selectedSport === 'IPL' && (
            <div className="w-full xl:w-1/2 relative bg-gradient-to-br from-emerald-600 to-green-700 rounded-full overflow-hidden border-4 border-slate-400/50 h-[600px] flex flex-col items-center shadow-inner pt-8">
              {/* Oval Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 w-[15%] h-[30%] -mt-[15%] -ml-[7.5%] bg-amber-800/80 rounded border border-amber-900 shadow-inner"></div>
                <div className="w-[90%] h-[90%] left-[5%] top-[5%] absolute rounded-full border border-white border-dashed"></div>
              </div>

              {/* Render IPL Roster roughly map radial */}
              <div className="w-full h-full relative z-10 flex flex-col justify-between py-12 px-16">
                {['BAT', 'ALL', 'WK', 'BOWL'].map((posStr, pIdx) => {
                  const playersInPos = lineup.filter(p => p.position === posStr);
                  return (
                    <div key={posStr} className="w-full flex justify-around px-8">
                      {playersInPos.map((p, i) => (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: (pIdx * 0.1) + (i * 0.1) }}
                          key={p.id}
                          onClick={() => setSelectedPlayerModal(p)}
                          className="flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-200 group-hover:border-amber-400">
                            {p.name.split(" ")[0].substring(0, 3)}
                          </div>
                          <div className="mt-1 bg-slate-900/80 px-1.5 py-0.5 rounded text-[9px] font-medium text-amber-400 border border-amber-400/20 whitespace-nowrap">
                            {p.name.split(" ").pop()}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List View Controls container */}
          <div className="w-full xl:w-1/2 glass-panel p-6 flex flex-col justify-between h-[600px]">
            <div>
              <h3 className="text-xl font-semibold mb-6 text-slate-200 flex justify-between items-center">
                Lineup Matrix {allLineups.length > 1 ? `(#${currentLineupIndex + 1})` : ''}
                <div className="flex gap-2 items-center">
                  {allLineups.length > 1 && (
                    <div className="flex bg-slate-800 rounded overflow-hidden">
                      <button
                        disabled={currentLineupIndex === 0}
                        onClick={() => {
                          const prev = currentLineupIndex - 1;
                          setCurrentLineupIndex(prev);
                          setLineup(allLineups[prev].lineup);
                          setSummary({ points: allLineups[prev].total_points, salary: allLineups[prev].total_salary });
                        }}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        disabled={currentLineupIndex === allLineups.length - 1}
                        onClick={() => {
                          const nxt = currentLineupIndex + 1;
                          setCurrentLineupIndex(nxt);
                          setLineup(allLineups[nxt].lineup);
                          setSimulationData([]);
                          setSummary({ points: allLineups[nxt].total_points, salary: allLineups[nxt].total_salary });
                        }}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition-colors shadow"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    CSV Export
                  </button>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 flex items-center rounded border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                    Active Roster
                  </span>
                </div>
              </h3>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {lineup.map((player) => (
                  <div key={player.id} onClick={() => setSelectedPlayerModal(player)} className="flex items-center p-3 rounded bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 mr-4 flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                      {player.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-200 truncate">{player.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{player.team}</div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <div className="text-emerald-400 font-mono text-sm font-semibold">{player.projected_points.toFixed(1)}</div>
                      <div className="text-slate-400 text-xs mt-1 font-mono">{getCurrencySymbol(selectedSport)}{player.salary.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col xl:flex-row justify-between xl:items-center tracking-wide text-sm bg-slate-900/40 p-3 rounded gap-4 shrink-0">
              <div>
                <span className="text-slate-400">Total Proj: <strong className="text-emerald-400 font-mono ml-1">{summary.points.toFixed(1)}</strong></span>
                <span className="text-slate-400 ml-4">Total Salary: <strong className="text-blue-400 font-mono ml-1">{getCurrencySymbol(selectedSport)}{summary.salary.toLocaleString()}</strong></span>
              </div>
              <button
                onClick={() => { setActiveTab('analysis'); handleSimulate(); }}
                disabled={simulating}
                className="flex items-center text-xs px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded text-white shadow-lg shadow-emerald-500/20 font-semibold transition-all"
              >
                <Play className="w-3 h-3 mr-2" />
                Monte-Carlo Insights
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderAnalysis = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-6 xl:p-8 max-w-7xl mx-auto w-full h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-400" />
          Roster Analysis
        </h2>
        <p className="text-slate-400 mt-2 text-sm">Monte-Carlo variance simulations and deep AI statistical distributions for your currently active Optimizer build.</p>
      </div>

      {simulationData.length > 0 && (
        <section className="mt-8">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-2 text-emerald-400 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Monte-Carlo Simulation Results
            </h3>
            <p className="text-sm text-slate-400 mb-6">Results across 1,000 matches incorporating massive dynamic variance based on real-world randomness components.</p>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFrequency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="score" stroke="#64748b" fontSize={11} tickFormatter={(tick) => `${tick} pts`} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label) => `Score: ~${label}`}
                  />
                  <Area type="monotone" dataKey="frequency" stroke="#10b981" fillOpacity={1} fill="url(#colorFrequency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {lineup.length > 0 && (
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-6 h-[350px]">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Salary Distribution</h3>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={positionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {positionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any) => [`${getCurrencySymbol(selectedSport)}${value.toLocaleString()}`, 'Salary']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-panel p-6 h-[350px]">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Projected Points Breakdown</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={projectionsData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  cursor={{ fill: '#334155' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="points" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </motion.div>
  );

  const renderPlayerDatabase = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-6 xl:p-8 max-w-7xl mx-auto w-full h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          Player Database
        </h2>
        <p className="text-slate-400 mt-2 text-sm">Full dataset of all {availablePlayers.length} active athletes in the AI projection memory.</p>
      </div>

      <div className="glass-panel p-6 shadow-xl">
        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-300 uppercase bg-slate-800/80">
              <tr>
                <th scope="col" className="px-6 py-4 rounded-tl-lg">Athlete Name</th>
                <th scope="col" className="px-6 py-4">Position</th>
                <th scope="col" className="px-6 py-4">Club / Franchise</th>
                <th scope="col" className="px-6 py-4">Draft Salary</th>
                <th scope="col" className="px-6 py-4 rounded-tr-lg">Projected Points</th>
              </tr>
            </thead>
            <tbody>
              {availablePlayers.map((player, idx) => (
                <tr key={player.id} onClick={() => setSelectedPlayerModal(player)} className={`bg-slate-900/40 border-b border-slate-800 hover:bg-slate-800/80 cursor-pointer transition-colors ${idx === availablePlayers.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-6 py-4 font-medium text-slate-200 whitespace-nowrap">{player.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">{player.position}</span>
                  </td>
                  <td className="px-6 py-4">{player.team}</td>
                  <td className="px-6 py-4 font-mono">{getCurrencySymbol(selectedSport)}{player.salary.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-emerald-400">{player.projected_points.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );

  const getRandomMatchup = (name: string) => {
    // deterministic based on name length for stability in modal
    const val = (name.length * 7) % 100;
    if (val > 75) return { text: "Favorable", color: "text-emerald-400" };
    if (val > 40) return { text: "Neutral", color: "text-blue-400" };
    return { text: "Tough", color: "text-rose-400" };
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0f1c] bg-grid-pattern overflow-hidden">
      {renderSidebar()}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 md:hidden z-20">
          <select
            onChange={(e) => setActiveTab(e.target.value as any)}
            value={activeTab}
            className="bg-slate-800 text-white rounded p-2 text-sm border border-slate-700"
          >
            <option value="dashboard">Dashboard</option>
            <option value="optimizer">Optimizer Studio</option>
            <option value="lineups">Generated Lineups</option>
            <option value="analysis">Roster Analysis</option>
            <option value="roster">Player Database</option>
          </select>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto pt-16 md:pt-0 custom-scrollbar relative z-0">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'optimizer' && renderOptimizer()}
            {activeTab === 'lineups' && renderLineups()}
            {activeTab === 'analysis' && renderAnalysis()}
            {activeTab === 'roster' && renderPlayerDatabase()}
          </AnimatePresence>
        </div>

        {/* Advanced Player Analytics Modal */}
        <AnimatePresence>
          {selectedPlayerModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-md p-0 overflow-hidden shadow-2xl border border-slate-700/50"
              >
                <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                  <button
                    onClick={() => setSelectedPlayerModal(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-xl font-bold text-white mr-4 shadow-lg border-2 border-slate-700">
                      {selectedPlayerModal.position}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-100 leading-tight">{selectedPlayerModal.name}</h2>
                      <p className="text-slate-400 text-sm font-medium">{selectedPlayerModal.team} • {selectedPlayerModal.sport}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800/80 p-3 rounded border border-slate-700/50">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Salary</div>
                      <div className="text-lg font-mono text-slate-200">{getCurrencySymbol(selectedSport)}{selectedPlayerModal.salary.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded border border-slate-700/50">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Projected</div>
                      <div className="text-lg font-mono text-emerald-400 font-bold">{selectedPlayerModal.projected_points.toFixed(1)} <span className="text-slate-500 text-xs font-normal">pts</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-1">AI Machine Learning Insights</h4>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Matchup Difficulty</span>
                      <span className={`font-semibold ${getRandomMatchup(selectedPlayerModal.name).color}`}>{getRandomMatchup(selectedPlayerModal.name).text}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Status</span>
                      <span className="font-semibold text-emerald-400 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span> Healthy
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-slate-400 text-sm inline-block mb-1">Recent Form Projection</span>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(Math.random() * 60) + 40}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedPlayerModal(null);
                      toggleLock(selectedPlayerModal.id);
                    }}
                    className={`text-sm px-4 py-2 rounded font-medium transition-colors ${lockedPlayers.includes(selectedPlayerModal.id) ? 'bg-slate-800 text-white border border-slate-700' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                  >
                    {lockedPlayers.includes(selectedPlayerModal.id) ? 'Unlock Player' : 'Lock Player'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
