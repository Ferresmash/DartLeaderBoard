import { useNavigate } from 'react-router-dom';
import { User, ChevronRight } from 'lucide-react';

export default function PlayerProfiles({ players }) {
  const navigate = useNavigate();
  
  const priorityIds = ['ferdinand', 'max', 'emil', 'ted'];
  const sortedPlayers = [...players].sort((a, b) => {
    const aPriority = priorityIds.includes(a.id) ? priorityIds.indexOf(a.id) : 999;
    const bPriority = priorityIds.includes(b.id) ? priorityIds.indexOf(b.id) : 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="p-6 md:p-10 pb-28 min-h-[100dvh] bg-slate-950 font-sans">
      <div className="max-w-4xl mx-auto md:pt-4">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 md:mb-4 flex items-center gap-3">
             <User className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
             <span className="text-white">Statistics</span>
          </h1>
          <p className="text-slate-400 font-medium md:text-lg">Detailed performance profiles for all competitors.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {sortedPlayers.map(player => (
            <button
              key={player.id}
              onClick={() => navigate(`/profile/${player.id}`)}
              className="flex items-center p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-3xl transition-all duration-300 active:scale-[0.98] hover:bg-white/[0.08] group shadow-lg text-left"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mr-4 shadow-inner border border-white/10 shrink-0">
                {player.pfpUrl ? (
                  <img src={player.pfpUrl || undefined} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center font-black text-slate-300 uppercase text-2xl md:text-3xl tracking-widest">{player.name.substring(0,2)}</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl md:text-2xl text-slate-100 mb-1">{player.name}</h3>
                <p className="text-sm md:text-base font-medium text-slate-400">Best: <span className="text-white">{player.bestScore}</span> • Wins: <span className="text-white">{player.totalWins}</span> • Winrate: <span className="text-white">{player.gamesPlayed ? Math.round((player.totalWins / player.gamesPlayed)*100) : 0}%</span></p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-indigo-500/20 transition-colors shrink-0 ml-2">
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
