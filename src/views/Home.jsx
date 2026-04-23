import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, TrendingUp, ArrowLeft, Trophy, Target, Star, Skull } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

export default function Home({ players, matches }) {
  const navigate = useNavigate();
  const [timeSpan, setTimeSpan] = useState('7_days');
  const [statType, setStatType] = useState('wins');
  const [onlyBigFour, setOnlyBigFour] = useState(false);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);

  const BIG_FOUR_IDS = ['ferdinand', 'max', 'emil', 'ted'];

  const leaderboard = useMemo(() => {
    const now = new Date().getTime();
    
    return players.map(p => {
      let activeMatches = matches;
      if (onlyBigFour) {
        activeMatches = matches.filter(m => m.participantIds && BIG_FOUR_IDS.every(id => m.participantIds.includes(id)));
      }
      
      const timeFilteredMatches = activeMatches.filter(m => {
        if (timeSpan === 'all_time') return true;
        const diffDays = (now - m.timestamp) / (1000 * 60 * 60 * 24);
        if (timeSpan === '7_days') return diffDays <= 7;
        if (timeSpan === '30_days') return diffDays <= 30;
        return true;
      });

      const playerWinnerMatches = timeFilteredMatches.filter(m => m.winnerId === p.id);
      const filteredWins = playerWinnerMatches.length;

      const gamesPlayed = timeFilteredMatches.filter(m => 
        (m.participantIds && m.participantIds.includes(p.id)) || 
        m.winnerId === p.id
      ).length;
      const winRate = gamesPlayed > 0 ? Number(((filteredWins / gamesPlayed) * 100).toFixed(1)) : 0;

      let computedTotalWins = playerWinnerMatches.length;
      let computedBestScore = 0;
      let computedHighestCheckout = 0;
      let nineDartTotals = [];
      let totalThrowsCount = 0;
      let bustCount = 0;
      let validThrows = 0;
      let totalThrowScore = 0;
      
      const pool = timeFilteredMatches;

      pool.forEach(m => {
        if (!m.turns) return;
        const playerTurns = m.turns.filter(t => t.playerId === p.id);
        if (playerTurns.length === 0) return;

        // ── Avg 9 Darts: first 3 turns = 9 darts ──
        const firstThree = playerTurns.slice(0, 3);
        nineDartTotals.push(firstThree.reduce((acc, t) => acc + (t.isBust ? 0 : t.score), 0));

        // ── Best Score (highest single turn score) ──
        playerTurns.forEach(t => {
          if (!t.isBust && t.score > computedBestScore) {
            computedBestScore = t.score;
          }
        });

        // ── Highest Checkout: simulate running score ──
        let running = m.startingScore || 501;
        playerTurns.forEach(t => {
          if (t.isBust) {
              bustCount++;
          } else {
              validThrows++;
              totalThrowScore += t.score;
              running -= t.score;
              if (running === 0) {
                if (t.score > computedHighestCheckout) computedHighestCheckout = t.score;
                running = m.startingScore || 501; // next leg in same match
              }
              if (running < 0) running += t.score; // guard against bad data
          }
          totalThrowsCount++;
        });
      });

      const avgNineDarts = nineDartTotals.length > 0 ? Number(((nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length) / 3).toFixed(1)) : 0;
      const avgScore = validThrows > 0 ? (totalThrowScore / validThrows).toFixed(1) : 0;
      const bustRate = totalThrowsCount > 0 ? ((bustCount / totalThrowsCount) * 100).toFixed(1) : 0;

      return {
        ...p,
        filteredWins,
        totalWins: p.totalWins,
        gamesPlayed,
        winRate,
        bestScore: computedBestScore,
        highestCheckout: computedHighestCheckout,
        avgNineDarts: avgNineDarts,
        avgScore: Number(avgScore),
        bustRate: Number(bustRate)
      };
    }).sort((a, b) => {
      if (statType === 'best_score') return (b.bestScore||0) - (a.bestScore||0) || (b.filteredWins - a.filteredWins);
      if (statType === 'highest_checkout') return (b.highestCheckout||0) - (a.highestCheckout||0) || (b.filteredWins - a.filteredWins);
      if (statType === 'avg_nine_darts') return (b.avgNineDarts||0) - (a.avgNineDarts||0) || (b.filteredWins - a.filteredWins);
      if (statType === 'win_rate') return (b.winRate||0) - (a.winRate||0) || (b.filteredWins - a.filteredWins);
      return (b.filteredWins - a.filteredWins) || (b.totalWins - a.totalWins) || (b.bestScore - a.bestScore);
    });
  }, [players, matches, timeSpan, statType, onlyBigFour]);

  // Auto-select the #1 player whenever the leaderboard sorting filters change
  useEffect(() => {
    if (leaderboard.length > 0) {
        setSelectedPlayerId(leaderboard[0].id);
    }
  }, [timeSpan, statType, onlyBigFour]); // Trigger only on filter changes

  // Fallback to ensure we have a valid selection if the selected player disappears
  useEffect(() => {
    if (leaderboard.length > 0) {
        if (!selectedPlayerId || !leaderboard.find(p => p.id === selectedPlayerId)) {
            setSelectedPlayerId(leaderboard[0].id);
        }
    }
  }, [leaderboard, selectedPlayerId]);

  const chartData = useMemo(() => {
    if (!selectedPlayerId) return [];
    const data = [];
    const now = new Date();
    
    // Determine periods based on selectedWeekStart (10 weeks vs daily)
    const periods = [];
    if (selectedWeekStart === null) {
      for (let i = 9; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))).getTime();
        periods.push({
          start: weekStart,
          end: weekStart + 7 * 24 * 60 * 60 * 1000,
          name: `W${getWeekNumber(new Date(weekStart))}`,
          weekStart
        });
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const dayStart = selectedWeekStart + i * 24 * 60 * 60 * 1000;
        const dObj = new Date(dayStart);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        periods.push({
          start: dayStart,
          end: dayStart + 24 * 60 * 60 * 1000,
          name: dayNames[dObj.getDay()],
          weekStart: null 
        });
      }
    }

    periods.forEach(period => {
      let activeMatches = matches.filter(m => m.timestamp >= period.start && m.timestamp < period.end);
      if (onlyBigFour) {
        activeMatches = activeMatches.filter(m => m.participantIds && BIG_FOUR_IDS.every(id => m.participantIds.includes(id)));
      }

      const gamesPlayed = activeMatches.filter(m => 
        (m.participantIds && m.participantIds.includes(selectedPlayerId)) || 
        m.winnerId === selectedPlayerId
      ).length;

      const wins = activeMatches.filter(m => m.winnerId === selectedPlayerId).length;
      const win_rate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

      let best_score = 0;
      let highest_checkout = 0;
      let nineDartTotals = [];
      let totalThrowsCount = 0;
      let bustCount = 0;
      let validThrows = 0;
      let totalThrowScore = 0;

      activeMatches.forEach(m => {
        if (!m.turns) return;
        const playerTurns = m.turns.filter(t => t.playerId === selectedPlayerId);
        if (playerTurns.length === 0) return;

        const firstThree = playerTurns.slice(0, 3);
        nineDartTotals.push(firstThree.reduce((acc, t) => acc + (t.isBust ? 0 : t.score), 0));

        let currentTotal = m.startingScore || 501;
        playerTurns.forEach(t => {
            if (!t.isBust && t.score > best_score) {
              best_score = t.score;
            }
            if (!t.isBust) {
              validThrows++;
              totalThrowScore += t.score;
              currentTotal -= t.score;
              if (currentTotal === 0 && t.score > highest_checkout) {
                highest_checkout = t.score;
              }
              if (currentTotal === 0) currentTotal = m.startingScore || 501;
            }
            totalThrowsCount++;
            if (t.isBust) bustCount++;
        });
      });

      const avg_nine_darts = nineDartTotals.length > 0 ? (nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length) / 3 : 0;
      const avgScore = validThrows > 0 ? totalThrowScore / validThrows : 0;
      const bustRate = totalThrowsCount > 0 ? (bustCount / totalThrowsCount) * 100 : 0;

      data.push({
        name: period.name,
        weekStart: period.weekStart,
        wins: wins,
        win_rate: Number(win_rate.toFixed(1)),
        best_score: best_score,
        highest_checkout: highest_checkout,
        avg_nine_darts: Number(avg_nine_darts.toFixed(1)),
      });
    });
    
    return data;
  }, [matches, selectedPlayerId, selectedWeekStart, onlyBigFour]);

  const statLabels = {
    'wins': 'Total Wins',
    'win_rate': 'Win Rate',
    'best_score': 'Highest Score',
    'highest_checkout': 'Highest Checkout',
    'avg_nine_darts': '9 Darts Avg'
  };

  const timeLabels = {
    '7_days': 'Last 7 Days',
    '30_days': 'Last 30 Days',
    'all_time': 'All Time'
  };

  const handleChartClick = (data) => {
    if (data?.activePayload?.[0]?.payload?.weekStart) {
      setSelectedWeekStart(data.activePayload[0].payload.weekStart);
    } else if (data?.activeTooltipIndex !== undefined && chartData[data.activeTooltipIndex]?.weekStart) {
      setSelectedWeekStart(chartData[data.activeTooltipIndex].weekStart);
    }
  };

  const selectedPlayer = leaderboard.find(p => p.id === selectedPlayerId);

  return (
    <div className="pb-28 min-h-[100dvh] bg-slate-950 flex justify-center items-start pt-8 px-4 md:px-8">
      {/* Background elements */}
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/30 to-transparent -z-10 pointer-events-none"></div>

      {/* Main Dashboard Wrapping Panel */}
      <div className="w-full max-w-[1400px] bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-2xl backdrop-blur-xl p-4 md:p-8 flex flex-col gap-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                 <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">Stats Dashboard</span>
              </h1>
              <p className="text-slate-400 font-medium tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                In-depth analytics and live leaderboard
              </p>
            </div>
            
            {/* Global Settings (Time, Big 4, Stat Type is handled below globally) */}
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-4 py-3 md:py-2 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-sm shadow-md h-full w-full sm:w-auto whitespace-nowrap">
                  <input type="checkbox" className="hidden" checked={onlyBigFour} onChange={() => setOnlyBigFour(!onlyBigFour)} />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${onlyBigFour ? 'bg-indigo-500 border-indigo-400' : 'bg-transparent border-slate-500'}`}>
                    {onlyBigFour && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                  </div>
                  <span className="text-slate-300 font-bold text-sm select-none">Big 4 Matches</span>
                </label>

                <div className="relative group/time flex-1 sm:flex-initial">
                  <select 
                    value={timeSpan}
                    onChange={(e) => setTimeSpan(e.target.value)}
                    className="w-full appearance-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-3 md:py-2 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-indigo-500/20 transition-colors cursor-pointer text-sm md:text-base backdrop-blur-sm shadow-lg h-full"
                  >
                    <option value="7_days" className="bg-slate-900">Last 7 Days</option>
                    <option value="30_days" className="bg-slate-900">Last 30 Days</option>
                    <option value="all_time" className="bg-slate-900">All Time</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-4 md:right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover/time:text-indigo-300 transition-colors" />
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
            {/* LEFT SIDE: Leaderboard */}
            <div className="w-full lg:w-[40%] flex flex-col gap-4">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-xl font-bold text-slate-200">Leaderboard</h2>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                       Sorted by {statLabels[statType]}
                    </span>
                </div>
                
                {/* Leaderboard List */}
                <div className="flex flex-col gap-3 rounded-3xl overflow-y-auto pr-2 max-h-[800px] custom-scrollbar">
                    {leaderboard.map((player, index) => {
                        const isSelected = selectedPlayerId === player.id;
                        
                        return (
                        <div 
                            key={player.id} 
                            onClick={() => setSelectedPlayerId(player.id)}
                            className={`relative cursor-pointer overflow-hidden rounded-3xl p-4 transition-all duration-300 backdrop-blur-sm shadow-xl group border ${isSelected ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'}`}
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="relative w-14 h-14 shrink-0">
                                    <div className={`absolute inset-0 rounded-full border-[3px] z-10 transition-colors ${isSelected ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : index === 0 && player.filteredWins > 0 ? 'border-amber-400' : 'border-slate-700'}`}></div>
                                    <img src={player.pfpUrl || undefined} alt={player.name} className="w-full h-full object-cover rounded-full relative z-0" />
                                    {index === 0 && player.filteredWins > 0 && !isSelected && (
                                        <div className="absolute -top-3 -right-2 text-xl drop-shadow-md z-20">👑</div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-xl truncate mb-0.5 ${isSelected ? 'text-white' : 'text-slate-200'}`}>{player.name}</h3>
                                    <div className="flex flex-wrap text-sm gap-2 mt-1">
                                        {statType === 'best_score' ? (
                                            <span className={`font-bold ${isSelected ? 'text-pink-300' : 'text-slate-400'}`}>Score: <span className={isSelected ? 'text-pink-200 font-black' : 'text-white'}>{player.bestScore}</span></span>
                                        ) : statType === 'win_rate' ? (
                                            <span className={`font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>Win %: <span className={isSelected ? 'text-cyan-200 font-black' : 'text-white'}>{player.winRate}%</span></span>
                                        ) : statType === 'highest_checkout' ? (
                                            <span className={`font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>CO: <span className={isSelected ? 'text-emerald-200 font-black' : 'text-white'}>{player.highestCheckout}</span></span>
                                        ) : statType === 'avg_nine_darts' ? (
                                            <span className={`font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>9D: <span className={isSelected ? 'text-indigo-200 font-black' : 'text-white'}>{player.avgNineDarts}</span></span>
                                        ) : (
                                            <span className={`font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>Wins: <span className={isSelected ? 'text-indigo-200 font-black' : 'text-white'}>{player.filteredWins}</span></span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[40px] md:text-[50px] font-black text-white/[0.05] leading-none select-none italic absolute right-2 -bottom-2 pointer-events-none group-hover:text-white/[0.08] transition-colors">
                                        #{index + 1}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            {/* RIGHT SIDE: Player Info & Graph Details */}
            <div className="w-full lg:w-[60%] flex flex-col gap-6">
                {selectedPlayer ? (
                    <>
                        {/* Selected Player Identity and Value Banner */}
                        <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group">
                            {/* Decorative flare */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors"></div>
                            
                            <img onClick={() => navigate(`/profile/${selectedPlayer.id}`)} src={selectedPlayer.pfpUrl} alt={selectedPlayer.name} className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-full border-[4px] border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer hover:scale-105 transition-transform shrink-0" />
                            
                            <div className="flex-1 min-w-0 text-center sm:text-left z-10">
                                <h2 onClick={() => navigate(`/profile/${selectedPlayer.id}`)} className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight cursor-pointer hover:text-indigo-300 transition-colors break-words leading-tight">{selectedPlayer.name}</h2>
                                <p className="text-indigo-400 font-bold tracking-wide mt-2 break-words text-sm md:text-base leading-snug">
                                    {timeLabels[timeSpan]} • {statLabels[statType]}
                                </p>
                            </div>
                            
                            <div className="bg-black/30 border border-white/5 rounded-3xl p-4 md:p-5 min-w-[120px] md:min-w-[140px] text-center flex flex-col items-center justify-center relative shadow-inner z-10 shrink-0">
                                <span className="text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-1">Current</span>
                                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter break-all leading-none">
                                    {statType === 'win_rate' ? `${selectedPlayer.winRate}%` : 
                                     statType === 'best_score' ? selectedPlayer.bestScore :
                                     statType === 'highest_checkout' ? selectedPlayer.highestCheckout :
                                     statType === 'avg_nine_darts' ? selectedPlayer.avgNineDarts :
                                     selectedPlayer.filteredWins}
                                </span>
                            </div>
                        </div>

                        {/* Interactive Stat Selectors */}
                        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-3xl flex flex-wrap gap-2 shadow-lg justify-center">
                            {Object.entries(statLabels).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setStatType(key)}
                                    className={`py-3 px-4 md:px-5 rounded-2xl text-xs md:text-sm font-black tracking-wide transition-all border flex-1 whitespace-nowrap ${statType === key ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.02]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Graph Panel */}
                        <div className="bg-white/[0.02] border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-xl flex-1 backdrop-blur-sm min-h-[400px] flex flex-col">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <div className="flex items-center gap-3">
                                    {selectedWeekStart !== null && (
                                    <button 
                                        onClick={() => setSelectedWeekStart(null)}
                                        className="p-2 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 rounded-xl transition-colors border border-white/5 hover:border-indigo-500/30 shadow-sm"
                                        title="Back to Weekly View"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    )}
                                    <h3 className="font-bold text-xl md:text-2xl text-slate-100 flex items-center gap-2">
                                        <TrendingUp className="w-6 h-6 text-indigo-400" />
                                        {selectedWeekStart === null ? "10-Week Trend" : `Week ${getWeekNumber(new Date(selectedWeekStart))} Trend`}
                                    </h3>
                                </div>
                            </div>
                            
                            <div className="flex-1 w-full relative min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart 
                                        data={chartData} 
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        onClick={handleChartClick}
                                        style={selectedWeekStart === null ? { cursor: 'pointer', outline: 'none' } : { outline: 'none' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600}} dy={15} axisLine={false} tickLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(99,102,241,0.3)', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}
                                            formatter={(value) => {
                                                if (statType === 'win_rate') return [`${value}%`, statLabels[statType]];
                                                return [value, statLabels[statType]];
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey={statType} 
                                            stroke="#818cf8" 
                                            strokeWidth={4} 
                                            dot={{ r: 5, fill: "#818cf8", strokeWidth: 2, stroke: "#0f172a" }} 
                                            activeDot={{ 
                                                onClick: (e, payload) => {
                                                    if (payload?.payload?.weekStart) {
                                                        setSelectedWeekStart(payload.payload.weekStart);
                                                    }
                                                },
                                                r: 8, fill: "#f472b6", stroke: "#0f172a", strokeWidth: 3, cursor: 'pointer' 
                                            }} 
                                            animationDuration={1500}
                                            animationEasing="ease-out"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full border border-white/5 bg-white/[0.02] rounded-[2rem] mt-4 min-h-[400px]">
                        <p className="text-slate-500 font-bold italic">Loading player data...</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
