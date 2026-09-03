import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, TrendingUp } from 'lucide-react';
import DartFlowHeader from '../components/DartFlowHeader';

export default function PlayerProfiles({ players }) {
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

  const sortedPlayers = [...players].sort((a, b) => {
    const aPriority = getPlayerPriority(a);
    const bPriority = getPlayerPriority(b);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
              <User className="w-8 h-8 text-[#00f0a8]" />
              <span>Player Statistics</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Detailed profiles and career analytics</p>
          </div>

          <button 
            onClick={() => navigate('/compare')}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-[#131b2a] border border-[#00f0a8]/30 hover:border-[#00f0a8] text-[#00f0a8] rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Compare Graph</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </header>

        {/* Player Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
          {sortedPlayers.map((player, index) => {
            const winRate = player.gamesPlayed ? Math.round((player.totalWins / player.gamesPlayed) * 100) : 0;

            return (
              <button
                key={player.id}
                onClick={() => navigate(`/profile/${player.id}`)}
                className="flex items-center p-4 bg-[#131b2a] border border-white/[0.08] hover:border-white/20 hover:bg-[#172133] rounded-2xl transition-all duration-200 active:scale-[0.98] group shadow-sm text-left cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden mr-3.5 border-2 border-white/10 group-hover:border-[#00f0a8] transition-colors shrink-0 bg-[#1a2336] flex items-center justify-center">
                  {player.pfpUrl ? (
                    <img src={player.pfpUrl} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-white text-lg uppercase">{player.name.substring(0, 2)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white truncate group-hover:text-[#00f0a8] transition-colors">{player.name}</h3>
                    <span className="text-[10px] font-black text-slate-500 uppercase bg-[#0a0e17] px-2 py-0.5 rounded-md border border-white/5">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Best: <strong className="text-white">{player.bestScore || 0}</strong> • Wins: <strong className="text-[#00f0a8]">{player.totalWins || 0}</strong> • Win: <strong className="text-white">{winRate}%</strong>
                  </p>
                </div>

                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-[#00f0a8]/15 group-hover:text-[#00f0a8] text-slate-400 transition-colors shrink-0 ml-2">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

