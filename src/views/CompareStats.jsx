import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Calendar, CheckCircle2, Trophy, Target, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DartFlowHeader from '../components/DartFlowHeader';

export default function CompareStats({ players, matches }) {
  const navigate = useNavigate();

  const topPriority = ['ferdinand', 'ted', 'petrus', 'chanique'];
  const backPriority = ['emil', 'max'];

  const getPlayerPriority = (p) => {
    const pId = (p.id || '').toLowerCase();
    const pName = (p.name || '').toLowerCase();

    for (let i = 0; i < topPriority.length; i++) {
      const target = topPriority[i];
      if (pId === target || pName.includes(target)) {
        return i;
      }
    }

    for (let i = 0; i < backPriority.length; i++) {
      const target = backPriority[i];
      if (pId === target || pName.includes(target)) {
        return 1000 + i;
      }
    }

    return 500;
  };

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aPriority = getPlayerPriority(a);
      const bPriority = getPlayerPriority(b);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => {
    const sorted = [...players].sort((a, b) => {
      const aPriority = getPlayerPriority(a);
      const bPriority = getPlayerPriority(b);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });
    return sorted.map(p => p.id).slice(0, 2);
  });
  const [metric, setMetric] = useState('avgScore'); // avgScore, wins, winRate, highestCheckout, avgNineDarts, bustRate
  const [duration, setDuration] = useState('all_time'); // 7_days, 30_days, all_time

  // Signature DartFlow Line Colors (Teal, Purple, Orange, Gold, Cyan, Rose)
  const colors = [
    '#00f0a8', // Neon Mint / Teal
    '#a855f7', // Electric Violet
    '#f97316', // Warm Orange
    '#eab308', // Radiant Gold
    '#06b6d4', // Cyan
    '#f43f5e', // Rose
  ];

  const getPlayerColor = (id) => {
    const idx = sortedPlayers.findIndex(p => p.id === id);
    return colors[idx >= 0 ? idx % colors.length : 0];
  };

  // Comparative Head-to-Head Stats for Selected Players
  const headToHead = useMemo(() => {
    return selectedPlayerIds.map(pid => {
      const player = players.find(p => p.id === pid);
      if (!player) return null;

      const playerMatches = matches.filter(m => 
        (m.participantIds && m.participantIds.includes(pid)) || 
        m.winnerId === pid
      );

      const wins = playerMatches.filter(m => m.winnerId === pid).length;
      let validThrows = 0;
      let totalScore = 0;
      let highestCheckout = 0;
      let legsWonCount = 0;

      playerMatches.forEach(m => {
        if (!m.turns) return;
        const pTurns = m.turns.filter(t => t.playerId === pid);
        let running = m.startingScore || 501;

        pTurns.forEach(t => {
          if (!t.isBust) {
            validThrows++;
            totalScore += t.score;
            running -= t.score;
            if (running === 0) {
              legsWonCount++;
              if (t.score > highestCheckout) highestCheckout = t.score;
              running = m.startingScore || 501;
            }
          }
        });
      });

      const avg = validThrows > 0 ? (totalScore / validThrows).toFixed(1) : '0.0';

      return {
        id: pid,
        name: player.name,
        color: getPlayerColor(pid),
        avg,
        highestCheckout: highestCheckout || player.bestScore || 0,
        wins,
        legsWon: legsWonCount || wins,
        gamesPlayed: playerMatches.length
      };
    }).filter(Boolean);
  }, [selectedPlayerIds, players, matches]);

  const chartData = useMemo(() => {
    if (selectedPlayerIds.length === 0) return [];

    const now = new Date();
    const periods = [];

    if (duration === '7_days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        periods.push({
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
          name: d.toLocaleDateString(undefined, { weekday: 'short' })
        });
      }
    } else if (duration === '30_days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        periods.push({
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
          name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        });
      }
    } else {
      for (let i = 9; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))).getTime();
        periods.push({
          start: weekStart,
          end: weekStart + 7 * 24 * 60 * 60 * 1000,
          name: `W${i === 0 ? 'Now' : i}`
        });
      }
    }

    return periods.map(period => {
      const dataPoint = { name: period.name };
      const periodMatches = matches.filter(m => m.timestamp >= period.start && m.timestamp < period.end);

      selectedPlayerIds.forEach(pid => {
        const playerMatches = periodMatches.filter(m => 
          (m.participantIds && m.participantIds.includes(pid)) || 
          m.winnerId === pid
        );

        if (metric === 'wins') {
          dataPoint[pid] = playerMatches.filter(m => m.winnerId === pid).length;
        } else if (metric === 'winRate') {
          const wins = playerMatches.filter(m => m.winnerId === pid).length;
          dataPoint[pid] = playerMatches.length > 0 ? Number(((wins / playerMatches.length) * 100).toFixed(1)) : 0;
        } else if (metric === 'avgScore' || metric === 'bustRate' || metric === 'highestCheckout' || metric === 'avgNineDarts') {
          let validThrows = 0;
          let totalScore = 0;
          let totalThrows = 0;
          let busts = 0;
          let highOut = 0;
          let nineDartScores = [];

          playerMatches.forEach(m => {
            if (!m.turns) return;
            const pTurns = m.turns.filter(t => t.playerId === pid);
            if (pTurns.length === 0) return;

            const firstThree = pTurns.slice(0, 3);
            nineDartScores.push(firstThree.reduce((acc, t) => acc + (t.isBust ? 0 : t.score), 0));

            let currentTotal = m.startingScore || 501;
            pTurns.forEach(t => {
              totalThrows++;
              if (t.isBust) {
                busts++;
              } else {
                validThrows++;
                totalScore += t.score;
                currentTotal -= t.score;
                if (currentTotal === 0 && t.score > highOut) highOut = t.score;
                if (currentTotal === 0) currentTotal = m.startingScore || 501;
              }
            });
          });

          if (metric === 'avgScore') dataPoint[pid] = validThrows > 0 ? Number((totalScore / validThrows).toFixed(1)) : 0;
          if (metric === 'bustRate') dataPoint[pid] = totalThrows > 0 ? Number(((busts / totalThrows) * 100).toFixed(1)) : 0;
          if (metric === 'highestCheckout') dataPoint[pid] = highOut;
          if (metric === 'avgNineDarts') dataPoint[pid] = nineDartScores.length > 0 ? Number(((nineDartScores.reduce((a, b) => a + b, 0) / nineDartScores.length) / 3).toFixed(1)) : 0;
        }
      });
      return dataPoint;
    });
  }, [selectedPlayerIds, metric, duration, matches]);

  const togglePlayer = (id) => {
    setSelectedPlayerIds(prev => 
      prev.includes(id) 
        ? prev.length > 1 ? prev.filter(pid => pid !== id) : prev 
        : [...prev, id]
    );
  };

  const metricLabels = {
    avgScore: 'Average Score',
    wins: 'Total Wins',
    winRate: 'Win Rate %',
    highestCheckout: 'High Checkout',
    avgNineDarts: 'Avg 9 Darts',
    bustRate: 'Bust Rate %',
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Title */}
        <header className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-2.5">
            <TrendingUp className="w-8 h-8 text-[#00f0a8]" />
            <span>Match Stats</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Head-to-head performance comparison</p>
        </header>

        {/* Head-to-Head Comparative Cards (from Screen 3) */}
        {headToHead.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Player Average Comparison */}
            <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Player Avg</span>
              <div className="flex items-center justify-around gap-2">
                {headToHead.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 truncate max-w-[90px]">{p.name.split(' ')[0]}</span>
                    <span className="text-2xl md:text-3xl font-black mt-0.5" style={{ color: p.color }}>
                      {p.avg}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* High Checkouts Comparison */}
            <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">High Checkouts</span>
              <div className="flex items-center justify-around gap-2">
                {headToHead.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 truncate max-w-[90px]">{p.name.split(' ')[0]}</span>
                    <span className="text-2xl md:text-3xl font-black mt-0.5" style={{ color: p.color }}>
                      {p.highestCheckout}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legs Won Comparison */}
            <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Legs / Wins</span>
              <div className="flex items-center justify-around gap-2">
                {headToHead.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 truncate max-w-[90px]">{p.name.split(' ')[0]}</span>
                    <span className="text-2xl md:text-3xl font-black mt-0.5" style={{ color: p.color }}>
                      {p.legsWon}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Multi-Player Filter Pills */}
        <div className="bg-[#131b2a] border border-white/[0.08] p-4 rounded-2xl shadow-lg flex flex-col gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">Select Players to Compare</span>
            <div className="flex flex-wrap gap-2">
              {sortedPlayers.map(p => {
                const isSelected = selectedPlayerIds.includes(p.id);
                const color = getPlayerColor(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                      isSelected 
                        ? 'bg-[#182438] text-white' 
                        : 'bg-[#0e1420] border-white/5 text-slate-400 hover:text-white'
                    }`}
                    style={isSelected ? { borderColor: color, boxShadow: `0 0 12px ${color}33` } : {}}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>{p.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" style={{ color }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metric & Duration Selectors */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/5">
            <div className="flex-1 flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {Object.entries(metricLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    metric === key 
                      ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)]' 
                      : 'bg-[#0e1420] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 shrink-0">
              {[
                { id: '7_days', label: '7D' },
                { id: '30_days', label: '30D' },
                { id: 'all_time', label: 'All' }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                    duration === d.id 
                      ? 'bg-[#a855f7] text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                      : 'bg-[#0e1420] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accuracy / Trend Glowing Neon Wave Chart (from Screen 3) */}
        <div className="bg-[#131b2a] border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-white">{metricLabels[metric]} Accuracy Trend</h2>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Smooth comparison curves</p>
            </div>
          </div>

          <div className="h-[280px] md:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }} 
                  dy={8}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#101726', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '16px', 
                    color: '#f8fafc',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '16px' }}
                  formatter={(value) => {
                    const player = players.find(p => p.id === value);
                    return <span className="text-slate-300 font-bold text-xs ml-1">{player?.name || value}</span>;
                  }}
                />
                {selectedPlayerIds.map(pid => {
                  const strokeColor = getPlayerColor(pid);
                  return (
                    <Line
                      key={pid}
                      type="monotone"
                      dataKey={pid}
                      stroke={strokeColor}
                      strokeWidth={3.5}
                      dot={{ r: 4, fill: strokeColor, strokeWidth: 2, stroke: "#0a0e17" }}
                      activeDot={{ r: 7, strokeWidth: 3, stroke: "#0a0e17" }}
                      animationDuration={1200}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

