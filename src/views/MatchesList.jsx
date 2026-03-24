import { useNavigate } from 'react-router-dom';
import { History, ChevronRight, Trophy, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MatchesList({ matches, players }) {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-10 pb-28 min-h-[100dvh]">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 pt-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 md:mb-4 flex items-center gap-3">
             <History className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
             <span className="text-white">Match History</span>
          </h1>
          <p className="text-slate-400 font-medium md:text-lg">Detailed logs of previous games.</p>
        </header>

        <div className="flex flex-col gap-4 w-full mb-8">
          {matches.map(match => {
            const winner = players.find(p => p.id === match.winnerId);
            const pCount = match.participantIds?.length || (match.turns ? new Set(match.turns.map(t=>t.playerId)).size : 1);
            
            return (
              <button
                key={match.id}
                onClick={() => navigate(`/matches/${match.id}`)}
                className="flex items-center p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-3xl transition-all duration-300 active:scale-[0.98] hover:bg-white/[0.08] group shadow-lg text-left"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mr-4 border border-indigo-500/20 group-hover:border-indigo-400 transition-colors">
                   <Trophy className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{formatDistanceToNow(match.timestamp, { addSuffix: true })}</span>
                    {match.startingScore && (
                      <span className="bg-white/10 px-2 py-0.5 rounded-md text-xs font-black text-slate-300">{match.startingScore}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-xl md:text-2xl text-slate-100 truncate flex items-center gap-2">
                    Winner: <span className="text-indigo-300">{winner?.name || 'Unknown'}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1 font-medium">
                    <Users className="w-4 h-4" />
                    {pCount} Players • {match.turns?.length || 0} throws recorded
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </div>
              </button>
            )
          })}

          {matches.length === 0 && (
            <div className="p-10 text-center rounded-3xl bg-white/[0.02] border border-white/5">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">No Match History</h3>
              <p className="text-slate-500">Play a game to see your detailed match logs here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
