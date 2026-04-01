import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Home({ players, matches }) {
  const navigate = useNavigate();
  const [timeSpan, setTimeSpan] = useState('7_days');
  const [statType, setStatType] = useState('wins');
  const [onlyBigFour, setOnlyBigFour] = useState(false);
  
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

      let computedTotalWins = playerWinnerMatches.length;
      let computedBestScore = 0;
      let computedHighestCheckout = 0;
      let nineDartTotals = [];
      
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
          if (t.isBust) return; // bust: score stays same, running unchanged
          running -= t.score;
          if (running === 0) {
            if (t.score > computedHighestCheckout) computedHighestCheckout = t.score;
            running = m.startingScore || 501; // next leg in same match
          }
          if (running < 0) running += t.score; // guard against bad data
        });
      });

      const avgNineDarts = nineDartTotals.length > 0 ? Number((nineDartTotals.reduce((a, b) => a + b, 0) / nineDartTotals.length).toFixed(1)) : 0;

      return {
        ...p,
        filteredWins,
        totalWins: p.totalWins,
        bestScore: computedBestScore,
        highestCheckout: computedHighestCheckout,
        avgNineDarts: avgNineDarts
      };
    }).sort((a, b) => {
      if (statType === 'best_score') return (b.bestScore||0) - (a.bestScore||0);
      if (statType === 'highest_checkout') return (b.highestCheckout||0) - (a.highestCheckout||0);
      if (statType === 'avg_nine_darts') return (b.avgNineDarts||0) - (a.avgNineDarts||0);
      return (b.filteredWins - a.filteredWins) || (b.totalWins - a.totalWins) || (b.bestScore - a.bestScore);
    });
  }, [players, matches, timeSpan, statType, onlyBigFour]);

  const statLabels = {
    'wins': 'Total Wins',
    'best_score': 'Highest Score',
    'highest_checkout': 'Highest Checkout',
    'avg_nine_darts': 'First 9 Darts Avg'
  };

  const timeLabels = {
    '7_days': 'Last 7 Days',
    '30_days': 'Last 30 Days',
    'all_time': 'All Time'
  };

  return (
    <div className="pb-28 min-h-[100dvh]">
      <div className="bg-gradient-to-b from-indigo-900/40 to-transparent pt-12 pb-6 px-6 md:px-12 relative overflow-hidden flex justify-between items-start">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0"></div>
        
        <div className="relative z-10 w-full flex justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 flex items-center gap-3">
               <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">Dartboard</span>
            </h1>
            <p className="text-slate-400 font-medium tracking-wide flex items-center gap-2 md:text-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {timeLabels[timeSpan]}: {statLabels[statType]}
            </p>
          </div>
          
          <div className="relative group z-20 flex flex-col md:flex-row gap-4 items-end md:items-center">
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-sm shadow-md h-full">
              <input type="checkbox" className="hidden" checked={onlyBigFour} onChange={() => setOnlyBigFour(!onlyBigFour)} />
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyBigFour ? 'bg-indigo-500 border-indigo-400' : 'bg-transparent border-slate-500'}`}>
                {onlyBigFour && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
              </div>
              <span className="text-slate-300 font-bold text-sm select-none">Big 4 Matches</span>
            </label>

            <div className="relative group flex gap-2">
              <div className="relative group/time">
                <select 
                  value={timeSpan}
                  onChange={(e) => setTimeSpan(e.target.value)}
                  className="appearance-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-indigo-500/20 transition-colors cursor-pointer text-sm md:text-base backdrop-blur-sm shadow-lg h-full"
                >
                  <option value="7_days" className="bg-slate-900">Last 7 Days</option>
                  <option value="30_days" className="bg-slate-900">Last 30 Days</option>
                  <option value="all_time" className="bg-slate-900">All Time</option>
                </select>
                <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover/time:text-indigo-300 transition-colors" />
              </div>

              <div className="relative group/stat">
                <select 
                  value={statType}
                  onChange={(e) => setStatType(e.target.value)}
                  className="appearance-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-indigo-500/20 transition-colors cursor-pointer text-sm md:text-base backdrop-blur-sm shadow-lg h-full"
                >
                  <option value="wins" className="bg-slate-900">Wins</option>
                  <option value="best_score" className="bg-slate-900">Highest Score</option>
                  <option value="highest_checkout" className="bg-slate-900">Highest Checkout</option>
                  <option value="avg_nine_darts" className="bg-slate-900">9 Darts Avg</option>
                </select>
                <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover/stat:text-indigo-300 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 md:px-12 flex flex-col gap-4 md:gap-6 mt-4 max-w-4xl mx-auto">
        {leaderboard.map((player, index) => {
          
          let validThrows = 0;
          let totalThrowScore = 0;
          let totalThrowsCount = 0; 
          let bustCount = 0;

          let activeMatches = matches;
          if (onlyBigFour) {
            activeMatches = matches.filter(m => m.participantIds && BIG_FOUR_IDS.every(id => m.participantIds.includes(id)));
          }

          activeMatches.forEach(m => {
            const diffDays = (new Date().getTime() - m.timestamp) / (1000 * 60 * 60 * 24);
            let inTimeframe = false;
            if (timeSpan === 'all_time') inTimeframe = true;
            else if (timeSpan === '7_days') inTimeframe = diffDays <= 7;
            else if (timeSpan === '30_days') inTimeframe = diffDays <= 30;

            if (inTimeframe && m.turns) {
              m.turns.forEach(t => {
                if (t.playerId === player.id) {
                  totalThrowsCount++;
                  if (t.isBust) {
                    bustCount++;
                  } else {
                    validThrows++;
                    totalThrowScore += t.score;
                  }
                }
              });
            }
          });

          const avgScore = validThrows > 0 ? (totalThrowScore / validThrows).toFixed(1) : 0;
          const bustRate = totalThrowsCount > 0 ? ((bustCount / totalThrowsCount) * 100).toFixed(1) : 0;

          return (
          <div 
            key={player.id} 
            className={`relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/5 p-4 md:p-6 transition duration-300 hover:bg-white/[0.06] backdrop-blur-sm shadow-xl ${index === 0 && player.filteredWins > 0 ? 'ring-1 ring-indigo-500/30 md:bg-indigo-500/5' : ''}`}
          >
            <div className="flex items-center gap-4 md:gap-6 relative z-10">
              <div className="relative w-16 h-16 md:w-28 md:h-28 shrink-0">
                <div className={`absolute inset-0 rounded-full border-[3px] md:border-[4px] z-10 ${index === 0 && player.filteredWins > 0 ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : index === 1 && player.filteredWins > 0 ? 'border-slate-300' : index === 2 && player.filteredWins > 0 ? 'border-amber-700' : 'border-slate-700'}`}></div>
                <img src={player.pfpUrl || undefined} alt={player.name} className="w-full h-full object-cover rounded-full relative z-0" />
                {index === 0 && player.filteredWins > 0 && (
                  <div className="absolute -top-3 -right-2 md:-top-4 md:-right-4 text-2xl md:text-4xl drop-shadow-md z-20 animate-bounce">👑</div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-xl md:text-3xl text-slate-100 truncate mb-1">{player.name}</h3>
                  <div className="flex flex-wrap text-sm md:text-base gap-2 text-slate-400 mt-2">
                    {statType === 'best_score' ? (
                      <span className="flex items-center gap-1.5 bg-pink-500/10 text-pink-300 px-3 py-1 rounded-xl border border-pink-500/20 font-bold shadow-sm">
                        ⚡ High Score: <span className="font-black text-pink-200 ml-1">{player.bestScore}</span>
                      </span>
                    ) : statType === 'highest_checkout' ? (
                      <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-500/20 font-bold shadow-sm">
                        🎯 Checkout: <span className="font-black text-emerald-200 ml-1">{player.highestCheckout}</span>
                      </span>
                    ) : statType === 'avg_nine_darts' ? (
                      <span className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-xl border border-indigo-500/20 font-bold shadow-sm">
                        📈 9 Darts Avg: <span className="font-black text-indigo-200 ml-1">{player.avgNineDarts}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-xl border border-indigo-500/20 font-bold shadow-sm">
                        🏆 {timeSpan === 'all_time' ? 'Total Wins' : 'Period Wins'}: <span className="font-black text-indigo-200 ml-1">{player.filteredWins}</span>
                      </span>
                    )}
                    {statType !== 'wins' && (
                      <span className="flex items-center px-3 py-1 bg-white/5 rounded-xl border border-white/5">
                        Wins: <span className="text-slate-200 font-bold ml-1">{player.filteredWins}</span>
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="hidden md:flex gap-4">
                  <div className="flex flex-col items-center bg-black/20 rounded-2xl p-3 px-6 shadow-inner border border-white/5">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Avg Score</span>
                    <span className="text-2xl font-black text-white">{avgScore}</span>
                  </div>
                  <div className="flex flex-col items-center bg-black/20 rounded-2xl p-3 px-6 shadow-inner border border-white/5">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bust Rate</span>
                    <span className="text-2xl font-black text-rose-400">{bustRate}%</span>
                  </div>
                </div>

                <div className="md:hidden flex gap-3 mt-2 text-xs font-bold text-slate-400">
                  <span>Avg: <span className="text-white">{avgScore}</span></span>
                  <span>9D: <span className="text-indigo-400">{player.avgNineDarts}</span></span>
                  <span>Busts: <span className="text-rose-400">{bustRate}%</span></span>
                </div>
              </div>

              {/* Secure Direct Profile Link */}
              <button 
                onClick={() => navigate(`/profile/${player.id}`)}
                className="hidden md:flex ml-2 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-indigo-500/20 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-400 shadow-md transition-all active:scale-95 group/btn z-30"
              >
                <ChevronRight className="w-8 h-8 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[80px] md:text-[140px] font-black text-white/[0.02] select-none pointer-events-none leading-none -mr-2 flex flex-row items-center">
              #{index + 1}
            </div>

            {/* Mobile Direct Link Target (Fills card visually without breaking flex) */}
            <button onClick={() => navigate(`/profile/${player.id}`)} className="absolute inset-0 w-full h-full z-0 md:hidden"></button>
          </div>
        )})}
      </div>
    </div>
  );
}
