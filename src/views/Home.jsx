import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, TrendingUp, ArrowLeft, Trophy, Target, Star, Skull, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DartFlowHeader from '../components/DartFlowHeader';

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
  const [onlyInOffice, setOnlyInOffice] = useState(true);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);

  const isInOfficeMatch = (m) => {
    if (!m || !m.timestamp) return false;
    const date = new Date(m.timestamp);
    const day = date.getDay();
    const hour = date.getHours();

    const isWorkHours = day >= 1 && day <= 5 && hour >= 7 && hour < 18;
    if (!isWorkHours) return false;

    if (!m.participantIds || !Array.isArray(m.participantIds)) return false;

    const companyParticipants = m.participantIds.filter(
      id => typeof id === 'string' && !id.startsWith('guest')
    );

    return companyParticipants.length > 1;
  };

  const leaderboard = useMemo(() => {
    const now = new Date().getTime();
    
    return players.map(p => {
      let activeMatches = matches;
      if (onlyInOffice) {
        activeMatches = matches.filter(isInOfficeMatch);
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

        const firstThree = playerTurns.slice(0, 3);
        nineDartTotals.push(firstThree.reduce((acc, t) => acc + (t.isBust ? 0 : t.score), 0));

        let running = m.startingScore || 501;
        playerTurns.forEach(t => {
          if (!t.isBust && t.score > computedBestScore) {
            computedBestScore = t.score;
          }
          if (t.isBust) {
              bustCount++;
          } else {
              validThrows++;
              totalThrowScore += t.score;
              running -= t.score;
              if (running === 0) {
                if (t.score > computedHighestCheckout) computedHighestCheckout = t.score;
                running = m.startingScore || 501;
              }
              if (running < 0) running += t.score;
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
  }, [players, matches, timeSpan, statType, onlyInOffice]);

  useEffect(() => {
    if (leaderboard.length > 0) {
      setSelectedPlayerId(leaderboard[0].id);
    }
  }, [timeSpan, statType, onlyInOffice]);

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
      if (onlyInOffice) {
        activeMatches = activeMatches.filter(isInOfficeMatch);
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
            currentTotal -= t.score;
            if (currentTotal === 0 && t.score > highest_checkout) {
              highest_checkout = t.score;
            }
            if (currentTotal === 0) currentTotal = m.startingScore || 501;
          }
        });
      });

      const avg_nine_darts = nineDartTotals.length > 0 ? (nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length) / 3 : 0;

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
  }, [matches, selectedPlayerId, selectedWeekStart, onlyInOffice]);

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
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader />

      <div className="max-w-[1300px] mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* Top Header Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#131b2a] border border-white/[0.08] p-4 md:p-6 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Leaderboard & Analytics</span>
            </h1>
            <p className="text-slate-400 text-xs font-semibold mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f0a8] shadow-[0_0_8px_#00f0a8]" />
              Live office performance rankings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* In Office Filter */}
            <label className="flex items-center gap-2 cursor-pointer bg-[#0e1420] border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:border-[#00f0a8]/40 transition-colors">
              <input type="checkbox" className="hidden" checked={onlyInOffice} onChange={() => setOnlyInOffice(!onlyInOffice)} />
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${onlyInOffice ? 'bg-[#00f0a8] border-[#00f0a8]' : 'border-slate-500'}`}>
                {onlyInOffice && <div className="w-1.5 h-1.5 bg-[#0a0e17] rounded-sm" />}
              </div>
              <span>In Office</span>
            </label>

            {/* Time Span Filter */}
            <div className="relative">
              <select 
                value={timeSpan}
                onChange={(e) => setTimeSpan(e.target.value)}
                className="appearance-none bg-[#0e1420] border border-white/10 text-white px-3.5 py-2 pr-8 rounded-xl font-bold text-xs focus:outline-none focus:border-[#00f0a8] cursor-pointer"
              >
                <option value="7_days" className="bg-[#131b2a]">Last 7 Days</option>
                <option value="30_days" className="bg-[#131b2a]">Last 30 Days</option>
                <option value="all_time" className="bg-[#131b2a]">All Time</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Stat Type Filter (Mobile) */}
            <div className="relative md:hidden w-full">
              <select 
                value={statType}
                onChange={(e) => setStatType(e.target.value)}
                className="w-full appearance-none bg-[#0e1420] border border-white/10 text-white px-3.5 py-2 pr-8 rounded-xl font-bold text-xs focus:outline-none focus:border-[#00f0a8]"
              >
                {Object.entries(statLabels).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[#131b2a]">{label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 2-Column Dashboard Body */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Leaderboard List */}
          <div className="w-full lg:w-[42%] flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Competitors</span>
              <span className="text-[11px] font-extrabold text-[#00f0a8] bg-[#00f0a8]/10 px-2.5 py-0.5 rounded-full border border-[#00f0a8]/20">
                Sorted by {statLabels[statType]}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
              {leaderboard.map((player, index) => {
                const isSelected = selectedPlayerId === player.id;
                const isCrown = index === 0 && player.filteredWins > 0;

                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`relative rounded-2xl p-3.5 flex items-center justify-between border-2 transition-all cursor-pointer shadow-sm group ${
                      isSelected 
                        ? 'bg-[#182438] border-[#00f0a8] shadow-[0_0_15px_rgba(0,240,168,0.25)]' 
                        : 'bg-[#131b2a] border-white/[0.06] hover:border-white/20 hover:bg-[#162032]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative w-11 h-11 shrink-0">
                        <div className={`w-full h-full rounded-full overflow-hidden border ${
                          isCrown ? 'border-amber-400' : isSelected ? 'border-[#00f0a8]' : 'border-white/10'
                        } bg-[#1a2336] flex items-center justify-center`}>
                          {player.pfpUrl ? (
                            <img src={player.pfpUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-extrabold text-white text-xs uppercase">{player.name.substring(0, 2)}</span>
                          )}
                        </div>
                        {isCrown && (
                          <div className="absolute -top-2 -right-1 text-xs">👑</div>
                        )}
                      </div>

                      {/* Name & Primary Stat */}
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-white text-sm tracking-tight truncate">{player.name}</h3>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          {statType === 'best_score' ? (
                            <span className="text-slate-400 font-semibold">High: <strong className="text-white">{player.bestScore}</strong></span>
                          ) : statType === 'win_rate' ? (
                            <span className="text-slate-400 font-semibold">Win: <strong className="text-white">{player.winRate}%</strong></span>
                          ) : statType === 'highest_checkout' ? (
                            <span className="text-slate-400 font-semibold">CO: <strong className="text-white">{player.highestCheckout}</strong></span>
                          ) : statType === 'avg_nine_darts' ? (
                            <span className="text-slate-400 font-semibold">9D: <strong className="text-white">{player.avgNineDarts}</strong></span>
                          ) : (
                            <span className="text-slate-400 font-semibold">Wins: <strong className="text-[#00f0a8] font-black">{player.filteredWins}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white/20 italic group-hover:text-white/40 transition-colors">
                        #{index + 1}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${player.id}`); }}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#00f0a8]/20 hover:text-[#00f0a8] flex items-center justify-center text-slate-400 transition-colors"
                        title="View Profile"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Player Spotlight & Trend Chart */}
          <div className="w-full lg:w-[58%] flex flex-col gap-4">
            {selectedPlayer ? (
              <>
                {/* Spotlight Banner Card */}
                <div className="bg-[#131b2a] border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
                  <div 
                    onClick={() => navigate(`/profile/${selectedPlayer.id}`)}
                    className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#00f0a8] shadow-[0_0_15px_rgba(0,240,168,0.3)] bg-[#1a2336] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    {selectedPlayer.pfpUrl ? (
                      <img src={selectedPlayer.pfpUrl} alt={selectedPlayer.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-white text-2xl uppercase">{selectedPlayer.name.substring(0, 2)}</span>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <h2 
                      onClick={() => navigate(`/profile/${selectedPlayer.id}`)}
                      className="text-2xl font-black text-white tracking-tight cursor-pointer hover:text-[#00f0a8] transition-colors truncate"
                    >
                      {selectedPlayer.name}
                    </h2>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">
                      {timeLabels[timeSpan]} • {statLabels[statType]}
                    </p>
                  </div>

                  <div className="bg-[#0a0e17] border border-white/10 px-5 py-3 rounded-2xl text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Value</span>
                    <span className="text-3xl font-black text-[#00f0a8]">
                      {statType === 'win_rate' ? `${selectedPlayer.winRate}%` : 
                       statType === 'best_score' ? selectedPlayer.bestScore :
                       statType === 'highest_checkout' ? selectedPlayer.highestCheckout :
                       statType === 'avg_nine_darts' ? selectedPlayer.avgNineDarts :
                       selectedPlayer.filteredWins}
                    </span>
                  </div>
                </div>

                {/* Desktop Stat Pill Selectors */}
                <div className="hidden md:flex bg-[#131b2a] border border-white/[0.08] p-1.5 rounded-2xl gap-1 shadow-md">
                  {Object.entries(statLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setStatType(key)}
                      className={`py-2 px-3 rounded-xl text-xs font-black tracking-wide flex-1 transition-all cursor-pointer ${
                        statType === key 
                          ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)]' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Performance Chart Panel */}
                <div className="bg-[#131b2a] border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-xl flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {selectedWeekStart !== null && (
                        <button 
                          onClick={() => setSelectedWeekStart(null)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                          title="Back to Weeks"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      )}
                      <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#00f0a8]" />
                        <span>{selectedWeekStart === null ? "10-Week Trend" : `Week ${getWeekNumber(new Date(selectedWeekStart))} Trend`}</span>
                      </h3>
                    </div>
                  </div>

                  <div className="h-64 md:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={chartData} 
                        margin={{ top: 10, right: 15, left: -25, bottom: 5 }}
                        onClick={handleChartClick}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} dy={6} axisLine={false} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#101726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#00f0a8', fontWeight: 'bold' }}
                          formatter={(value) => {
                            if (statType === 'win_rate') return [`${value}%`, statLabels[statType]];
                            return [value, statLabels[statType]];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={statType} 
                          stroke="#00f0a8" 
                          strokeWidth={3} 
                          dot={{ r: 3, fill: "#00f0a8", stroke: "#0a0e17", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "#2dd4bf", stroke: "#0a0e17", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center bg-[#131b2a] rounded-3xl border border-white/5 text-slate-500 font-semibold text-xs">
                No player selected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

