import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, TrendingUp, Skull } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Helper to get ISO week number securely
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

export default function PlayerDetail({ players, matches }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const player = players.find(p => p.id === id);
  const [chartMetric, setChartMetric] = useState('wins'); // 'wins', 'winRate', 'avgScore', 'bustRate', 'highestCheckout'

  // ── Lifetime stats (across ALL matches) ─────────────────────────────
  const lifetimeStats = useMemo(() => {
    let highestCheckout = 0;
    const nineDartTotals = [];
    let lifetimeBusts = 0;
    let lifetimeTotalThrows = 0;

    matches.forEach(m => {
      if (!m.turns) return;
      const playerTurns = m.turns.filter(t => t.playerId === player.id);
      if (playerTurns.length === 0) return;

      // ── Avg 9 Darts: first 3 turns = 9 darts ──
      const firstThree = playerTurns.slice(0, 3);
      nineDartTotals.push(firstThree.reduce((acc, t) => acc + (t.isBust ? 0 : t.score), 0));

      // ── Highest Checkout: simulate running score ──
      let running = m.startingScore || 501;
      playerTurns.forEach(t => {
        lifetimeTotalThrows++;
        if (t.isBust) {
          lifetimeBusts++;
          return; // score stays the same
        }
        running -= t.score;
        if (running === 0) {
          if (t.score > highestCheckout) highestCheckout = t.score;
          running = m.startingScore || 501; // reset for next leg in same match
        }
        if (running < 0) {
          // shouldn't happen with valid data, but guard anyway
          running += t.score;
        }
      });
    });

    const avgNineDarts =
      nineDartTotals.length > 0
        ? Number((nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length).toFixed(1))
        : 0;

    const bustPct =
      lifetimeTotalThrows > 0
        ? Number(((lifetimeBusts / lifetimeTotalThrows) * 100).toFixed(1))
        : 0;

    return { highestCheckout, avgNineDarts, bustPct };
  }, [matches, player.id]);

  // ── Weekly chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    // Generates last 10 weeks
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      // Align to start of the week (Monday)
      const weekStart = new Date(d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))).getTime();
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
      
      const weekMatches = matches.filter(m => m.timestamp >= weekStart && m.timestamp < weekEnd);
      
      // Calculate Games Played reliably (via participantIds if available, or fallback to older wins)
      const gamesPlayed = weekMatches.filter(m => 
        (m.participantIds && m.participantIds.includes(player.id)) || 
        m.winnerId === player.id
      ).length;

      const wins = weekMatches.filter(m => m.winnerId === player.id).length;
      const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

      let validThrows = 0;
      let totalThrowScore = 0;
      let totalThrowsCount = 0;
      let bustCount = 0;
      let highestCheckout = 0;
      let nineDartTotals = [];

      weekMatches.forEach(m => {
        if (m.turns) {
          const playerTurns = m.turns.filter(t => t.playerId === player.id);
          
          if (playerTurns.length > 0) {
             const firstThree = playerTurns.slice(0, 3);
             nineDartTotals.push(firstThree.reduce((acc, t) => acc + t.score, 0));
          }

          let currentTotal = m.startingScore || 501;
          playerTurns.forEach(t => {
            if (!t.isBust) {
              validThrows++;
              totalThrowScore += t.score;
              currentTotal -= t.score;
              if (currentTotal === 0 && t.score > highestCheckout) {
                highestCheckout = t.score;
              }
              if (currentTotal === 0) currentTotal = m.startingScore || 501;
            }
            totalThrowsCount++;
            if (t.isBust) bustCount++;
          });
        }
      });

      const avgScore = validThrows > 0 ? totalThrowScore / validThrows : 0;
      const bustRate = totalThrowsCount > 0 ? (bustCount / totalThrowsCount) * 100 : 0;
      const avgNineDarts = nineDartTotals.length > 0 ? nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length : 0;

      data.push({
        name: `W${getWeekNumber(new Date(weekStart))}`,
        wins: wins,
        winRate: Number(winRate.toFixed(1)),
        avgScore: Number(avgScore.toFixed(1)),
        bustRate: Number(bustRate.toFixed(1)),
        highestCheckout: highestCheckout,
        avgNineDarts: Number(avgNineDarts.toFixed(1))
      });
    }
    return data;
  }, [matches, player.id]);

  if (!player) return <div className="p-8 text-center text-white">Player not found</div>;

  return (
    <div className="pb-28 min-h-[100dvh] flex flex-col items-center relative overflow-x-hidden md:px-12 bg-slate-950 font-sans">
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-indigo-900/40 to-transparent -z-10"></div>
      
      <div className="w-full max-w-5xl flex flex-col md:flex-row mt-8 px-6 md:px-0 gap-8">
        
        {/* Left Side: Avatar/Full Image */}
        <div className="flex flex-col items-center md:sticky md:top-8 w-full md:w-[400px]">
          {/* Mobile Image (Circle Cut) */}
          <div className="md:hidden w-36 h-36 rounded-full p-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-indigo-500/20 mb-8 mt-4">
            <img src={player.pfpUrl || null} alt={player.name} className="w-full h-full rounded-full object-cover border-[6px] border-slate-950" />
          </div>
          
          {/* Desktop Image (Full Image, Transparent Background) */}
          <div className="hidden md:block w-full max-h-[500px] mb-12 drop-shadow-[0_20px_20px_rgba(99,102,241,0.2)]">
            <img src={player.pfpUrl || null} alt={player.name} className="w-full h-full object-contain" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight text-center">{player.name}</h1>
        </div>
        
        {/* Right Side: Data */}
        <div className="flex-1 w-full flex flex-col">
          <div className="grid grid-cols-3 gap-2 md:gap-4 w-full mb-8">
            <div className="bg-white/[0.03] border border-white/5 p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center shadow-lg hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-2 md:mb-3 relative z-10">
                <Trophy className="w-5 h-5 md:w-8 md:h-8 text-indigo-400" />
              </div>
              <p className="text-slate-400 text-xs md:text-base font-medium truncate w-full text-center relative z-10">Total Wins</p>
              <p className="text-2xl md:text-5xl font-black text-white leading-tight relative z-10">{player.totalWins}</p>
            </div>
            
            <div className="bg-white/[0.03] border border-white/5 p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center shadow-lg hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
              <div className="absolute inset-0 bg-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-2 md:mb-3 relative z-10">
                <Target className="w-5 h-5 md:w-8 md:h-8 text-pink-400" />
              </div>
              <p className="text-slate-400 text-xs md:text-base font-medium truncate w-full text-center relative z-10">Best Score</p>
              <p className="text-2xl md:text-5xl font-black text-white leading-tight relative z-10">{player.bestScore}</p>
            </div>
            
            <div className="bg-white/[0.03] border border-white/5 p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center shadow-lg hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 md:mb-3 relative z-10">
                <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-emerald-400" />
              </div>
              <p className="text-slate-400 text-xs md:text-base font-medium truncate w-full text-center relative z-10">Winrate</p>
              <p className="text-2xl md:text-5xl font-black text-white leading-tight relative z-10">{player.gamesPlayed ? Math.round((player.totalWins / player.gamesPlayed)*100) : 0}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
            <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex items-center gap-6 shadow-lg hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
               <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                  <Skull className="w-7 h-7 text-rose-400" />
               </div>
               <div>
                  <p className="text-slate-400 text-sm font-medium">Bust %</p>
                  <p className="text-2xl font-black text-white">{lifetimeStats.bustPct}%</p>
               </div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex items-center gap-6 shadow-lg hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-indigo-400" />
               </div>
               <div>
                  <p className="text-slate-400 text-sm font-medium">Avg 9 Darts</p>
                  <p className="text-3xl font-black text-white">{lifetimeStats.avgNineDarts}</p>
               </div>
            </div>

            <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex items-center gap-6 shadow-lg hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
               <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Target className="w-7 h-7 text-emerald-400" />
               </div>
               <div>
                  <p className="text-slate-400 text-sm font-medium">Highest Checkout</p>
                  <p className="text-3xl font-black text-white">{lifetimeStats.highestCheckout || '—'}</p>
               </div>
            </div>
          </div>

          <div className="w-full bg-white/[0.02] border border-white/5 p-5 md:p-8 rounded-3xl shadow-xl flex-1 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="font-bold text-xl md:text-2xl text-slate-100 flex items-center gap-2">
                10-Week Trend
              </h3>
              <select 
                value={chartMetric}
                onChange={e => setChartMetric(e.target.value)}
                className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-sm font-bold tracking-wide focus:outline-none focus:border-indigo-500/50 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <option value="wins" className="bg-slate-900">Wins</option>
                <option value="winRate" className="bg-slate-900">Win Rate %</option>
                <option value="avgScore" className="bg-slate-900">Average Score</option>
                <option value="bustRate" className="bg-slate-900">Bust Rate %</option>
                <option value="highestCheckout" className="bg-slate-900">Highest Checkout</option>
              </select>
            </div>
            
            <div className="h-48 md:h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} dy={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(99,102,241,0.2)', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    formatter={(value) => {
                       if (chartMetric.includes('Rate')) return [`${value}%`];
                       return [value];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chartMetric} 
                    stroke="#818cf8" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: "#818cf8", strokeWidth: 2, stroke: "#0f172a" }} 
                    activeDot={{ r: 8, fill: "#f472b6", stroke: "#0f172a", strokeWidth: 3 }} 
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
      
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-4 left-4 md:top-8 md:left-8 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors text-slate-300 shadow-xl z-20"
      >
        <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );
}
