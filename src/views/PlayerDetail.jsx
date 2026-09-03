import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Target, TrendingUp, Skull, Calendar, User, ChevronRight, Award, BarChart2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DartFlowHeader from '../components/DartFlowHeader';

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
  const [chartMetric, setChartMetric] = useState('avgScore'); // avgScore, wins, winRate, bustRate, highestCheckout
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);

  // Player Rank in leaderboard
  const rank = useMemo(() => {
    const sorted = [...players].sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0));
    const idx = sorted.findIndex(p => p.id === id);
    return idx >= 0 ? idx + 1 : '-';
  }, [players, id]);

  // Lifetime Stats
  const lifetimeStats = useMemo(() => {
    if (!player) return { highestCheckout: 0, avgNineDarts: 0, bustPct: 0, avgScore: 0, count180s: 0, count100plus: 0 };
    let highestCheckout = 0;
    const nineDartTotals = [];
    let lifetimeBusts = 0;
    let lifetimeTotalThrows = 0;
    let validThrows = 0;
    let totalScore = 0;
    let count180s = 0;
    let count100plus = 0;

    matches.forEach(m => {
      if (!m.turns) return;
      const playerTurns = m.turns.filter(t => t.playerId === player.id);
      if (playerTurns.length === 0) return;

      const firstThree = playerTurns.slice(0, 3);
      nineDartTotals.push(firstThree.reduce((acc, t) => acc + (t.isBust ? 0 : t.score), 0));

      let running = m.startingScore || 501;
      playerTurns.forEach(t => {
        lifetimeTotalThrows++;
        if (t.isBust) {
          lifetimeBusts++;
          return;
        }
        validThrows++;
        totalScore += t.score;
        if (t.score === 180) count180s++;
        if (t.score >= 100) count100plus++;

        running -= t.score;
        if (running === 0) {
          if (t.score > highestCheckout) highestCheckout = t.score;
          running = m.startingScore || 501;
        }
        if (running < 0) {
          running += t.score;
        }
      });
    });

    const avgNineDarts =
      nineDartTotals.length > 0
        ? Number(((nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length) / 3).toFixed(1))
        : 0;

    const bustPct =
      lifetimeTotalThrows > 0
        ? Number(((lifetimeBusts / lifetimeTotalThrows) * 100).toFixed(1))
        : 0;

    const avgScore = validThrows > 0 ? Number((totalScore / validThrows).toFixed(1)) : 0;

    return { highestCheckout, avgNineDarts, bustPct, avgScore, count180s, count100plus };
  }, [matches, player]);

  // Chart data
  const chartData = useMemo(() => {
    if (!player) return [];
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
      const periodMatches = matches.filter(m => m.timestamp >= period.start && m.timestamp < period.end);
      
      const gamesPlayed = periodMatches.filter(m => 
        (m.participantIds && m.participantIds.includes(player.id)) || 
        m.winnerId === player.id
      ).length;

      const wins = periodMatches.filter(m => m.winnerId === player.id).length;
      const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

      let validThrows = 0;
      let totalThrowScore = 0;
      let totalThrowsCount = 0;
      let bustCount = 0;
      let highestCheckout = 0;
      let nineDartTotals = [];

      periodMatches.forEach(m => {
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
      const avgNineDarts = nineDartTotals.length > 0 ? (nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length) / 3 : 0;

      data.push({
        name: period.name,
        weekStart: period.weekStart,
        wins: wins,
        winRate: Number(winRate.toFixed(1)),
        avgScore: Number(avgScore.toFixed(1)),
        bustRate: Number(bustRate.toFixed(1)),
        highestCheckout: highestCheckout,
        avgNineDarts: Number(avgNineDarts.toFixed(1))
      });
    });
    
    return data;
  }, [matches, player, selectedWeekStart]);

  const playerMatches = useMemo(() => {
    if (!player) return [];
    return matches
      .filter(m => 
        (m.participantIds && m.participantIds.includes(player.id)) || 
        m.winnerId === player.id
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [matches, player]);

  const winRateCalculated = player?.gamesPlayed 
    ? Math.round((player.totalWins / player.gamesPlayed) * 100) 
    : player?.winRate || 0;

  if (!player) return <div className="p-8 text-center text-white">Player not found</div>;

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader showBack />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Profile Header (matches Screen 4) */}
        <div className="flex items-center gap-4 bg-[#131b2a] border border-white/[0.08] p-4 md:p-6 rounded-3xl shadow-xl">
          <div className="relative">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-[#00f0a8] shadow-[0_0_15px_rgba(0,240,168,0.3)] bg-[#1a2336] flex items-center justify-center">
              {player.pfpUrl ? (
                <img src={player.pfpUrl} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-extrabold text-white text-2xl uppercase">{player.name.substring(0, 2)}</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">{player.name}</h1>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">Competitor Profile</p>
          </div>

          <div className="bg-[#1b2537] border border-white/10 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rank</span>
            <span className="text-sm font-black text-[#00f0a8]">#{rank}</span>
          </div>
        </div>

        {/* Core Stat Cards with Neon Underlines (matches Screen 4) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Player Avg */}
          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Pts</span>
            <span className="text-3xl font-black text-white my-1">{lifetimeStats.avgScore || player.avgScore || '0.0'}</span>
            <div className="w-full h-1 bg-[#a855f7] rounded-full shadow-[0_0_8px_#a855f7] mt-1" />
          </div>

          {/* Card 2: 9 Darts Avg */}
          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg 9 Darts</span>
            <span className="text-3xl font-black text-white my-1">{lifetimeStats.avgNineDarts || '0.0'}</span>
            <div className="w-full h-1 bg-[#00f0a8] rounded-full shadow-[0_0_8px_#00f0a8] mt-1" />
          </div>

          {/* Card 3: 180s / Best Score */}
          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">High Score</span>
            <span className="text-3xl font-black text-white my-1">{player.bestScore || 0}</span>
            <div className="w-full h-1 bg-[#f97316] rounded-full shadow-[0_0_8px_#f97316] mt-1" />
          </div>

          {/* Card 4: Checkout % / Highest Checkout */}
          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checkout</span>
            <span className="text-3xl font-black text-white my-1">{lifetimeStats.highestCheckout || '—'}</span>
            <div className="w-full h-1 bg-[#22d3ee] rounded-full shadow-[0_0_8px_#22d3ee] mt-1" />
          </div>
        </div>

        {/* Secondary Row: Wins & Winrate Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f0a8]/10 flex items-center justify-center text-[#00f0a8]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Wins</span>
              <span className="text-xl font-black text-white">{player.totalWins || 0}</span>
            </div>
          </div>

          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center text-[#a855f7]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Winrate</span>
              <span className="text-xl font-black text-white">{winRateCalculated}%</span>
            </div>
          </div>

          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/10 flex items-center justify-center text-rose-400">
              <Skull className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bust Rate</span>
              <span className="text-xl font-black text-white">{lifetimeStats.bustPct}%</span>
            </div>
          </div>

          <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">100+ Throws</span>
              <span className="text-xl font-black text-white">{lifetimeStats.count100plus}</span>
            </div>
          </div>
        </div>

        {/* Trend Performance Wave Chart */}
        <div className="bg-[#131b2a] border border-white/[0.08] p-5 rounded-3xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-white text-base">Performance Trend</h3>
            <select
              value={chartMetric}
              onChange={e => setChartMetric(e.target.value)}
              className="bg-[#1b2537] border border-white/10 text-[#00f0a8] text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer focus:outline-none"
            >
              <option value="avgScore">Average Score</option>
              <option value="wins">Wins</option>
              <option value="winRate">Win Rate %</option>
              <option value="highestCheckout">Checkout</option>
              <option value="bustRate">Bust Rate %</option>
            </select>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} dy={6} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#101726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#00f0a8', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey={chartMetric} 
                  stroke="#00f0a8" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: "#00f0a8", stroke: "#0a0e17", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#2dd4bf", stroke: "#0a0e17", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Games History (matches Screen 4) */}
        <div className="flex flex-col gap-3">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#00f0a8]" />
            <span>Recent Games History</span>
          </h3>

          <div className="grid gap-2.5">
            {playerMatches.length > 0 ? (
              playerMatches.slice(0, 8).map(m => {
                const isWinner = m.winnerId === player.id;
                const pIds = m.participantIds || [];
                const opponents = players.filter(p => pIds.includes(p.id) && p.id !== player.id);
                const opponentName = opponents.length > 0 ? opponents.map(o => o.name).join(', ') : 'Opponent';
                const date = m.timestamp ? new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/matches/${m.id}`)}
                    className="bg-[#131b2a] hover:bg-[#182337] border border-white/[0.08] p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                        isWinner ? 'bg-[#00f0a8]/15 text-[#00f0a8]' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {isWinner ? 'W' : 'L'}
                      </div>
                      <div>
                        <span className="font-bold text-white text-sm block">vs {opponentName}</span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">{date} • {m.startingScore || 501}</span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-slate-400">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-[#131b2a] rounded-2xl border border-white/5 text-slate-500 text-xs font-semibold">
                No match records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

