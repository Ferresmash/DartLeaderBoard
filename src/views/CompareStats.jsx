import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CompareStats({ players, matches }) {
  const navigate = useNavigate();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(players.map(p => p.id).slice(0, 3));
  const [metric, setMetric] = useState('wins'); // wins, winRate, avgScore, bustRate, highestCheckout, avgNineDarts
  const [duration, setDuration] = useState('all_time'); // 7_days, 30_days, all_time

  const colors = [
    '#818cf8', // indigo
    '#f472b6', // pink
    '#34d399', // emerald
    '#fb923c', // orange
    '#22d3ee', // cyan
    '#a78bfa', // purple
    '#f87171', // red
    '#fbbf24'  // amber
  ];

  const getPlayerColor = (id) => {
    const idx = players.findIndex(p => p.id === id);
    return colors[idx % colors.length];
  };

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
    } else { // all_time (show last 12 weeks)
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))).getTime();
        periods.push({
          start: weekStart,
          end: weekStart + 7 * 24 * 60 * 60 * 1000,
          name: `W${i === 0 ? 'Now' : i}` // Simple labeling
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

            // 9 darts
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
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const metricLabels = {
    wins: 'Wins',
    winRate: 'Win Rate %',
    avgScore: 'Avg Score',
    bustRate: 'Bust Rate %',
    highestCheckout: 'Highest Checkout',
    avgNineDarts: 'Avg 9 Darts'
  };

  return (
    <div className="pb-28 min-h-[100dvh] flex flex-col items-center bg-slate-950 font-sans">
      <div className="w-full max-w-5xl mt-8 px-6 md:px-0">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors text-slate-300"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Comparison Graph</h1>
        </div>

        {/* Filters */}
        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl mb-8 backdrop-blur-sm shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Player Selection */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-slate-100 font-bold uppercase tracking-wider text-sm">Select Players</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...players].sort((a,b) => b.totalWins - a.totalWins).map(p => {
                  const isSelected = selectedPlayerIds.includes(p.id);
                  const color = getPlayerColor(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-white/10 border-indigo-500/50 text-white' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${isSelected ? '' : 'grayscale'}`} style={{ backgroundColor: color }}></div>
                      <span className="font-bold text-sm">{p.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Metric Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-slate-100 font-bold uppercase tracking-wider text-sm">Statistic</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(metricLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setMetric(key)}
                      className={`px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                        metric === key 
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-pink-400" />
                  <h3 className="text-slate-100 font-bold uppercase tracking-wider text-sm">Duration</h3>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: '7_days', label: '7 Days' },
                    { id: '30_days', label: '30 Days' },
                    { id: 'all_time', label: 'All Time' }
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id)}
                      className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                        duration === d.id 
                          ? 'bg-pink-500/10 border-pink-500/50 text-pink-300' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white/[0.02] border border-white/5 p-6 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-sm min-h-[400px] flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">{metricLabels[metric]} Trend</h2>
              <p className="text-slate-500 text-sm font-medium">Comparing {selectedPlayerIds.length} players over {duration.replace('_', ' ')}</p>
            </div>
          </div>
          
          <div className="h-[400px] md:h-[500px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} 
                  dy={15}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '20px', 
                    color: '#f8fafc',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '30px', paddingRight: '10px' }}
                  formatter={(value) => {
                    const player = players.find(p => p.id === value);
                    return <span className="text-slate-300 font-bold ml-1">{player?.name || value}</span>;
                  }}
                />
                {selectedPlayerIds.map(pid => (
                  <Line
                    key={pid}
                    type="monotone"
                    dataKey={pid}
                    stroke={getPlayerColor(pid)}
                    strokeWidth={4}
                    dot={{ r: 4, fill: getPlayerColor(pid), strokeWidth: 2, stroke: "#0f172a" }}
                    activeDot={{ r: 8, strokeWidth: 4, stroke: "#0f172a" }}
                    animationDuration={1000}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
