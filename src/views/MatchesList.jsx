import { useNavigate } from 'react-router-dom';
import { History, ChevronRight, Trophy, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DartFlowHeader from '../components/DartFlowHeader';

export default function MatchesList({ matches, players }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
            <History className="w-8 h-8 text-[#00f0a8]" />
            <span>Match History</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Archived logs of completed matches</p>
        </header>

        <div className="flex flex-col gap-3 w-full">
          {matches.map(match => {
            let winnerName = match.winnerId ? players.find(p => p.id === match.winnerId)?.name : 'Unknown';
            if ((!winnerName || winnerName === 'Unknown') && match.winnerId?.startsWith('guest__')) {
              try {
                winnerName = decodeURIComponent(match.winnerId.split('__')[1]) + ' (Guest)';
              } catch(e) {}
            }

            const pCount = match.participantIds?.length || (match.turns ? new Set(match.turns.map(t=>t.playerId)).size : 1);
            
            return (
              <button
                key={match.id}
                onClick={() => navigate(`/matches/${match.id}`)}
                className="flex items-center p-4 bg-[#131b2a] border border-white/[0.08] hover:border-white/20 hover:bg-[#182336] rounded-2xl transition-all duration-200 active:scale-[0.98] group shadow-sm text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[#00f0a8]/10 border border-[#00f0a8]/20 group-hover:border-[#00f0a8] flex items-center justify-center shrink-0 mr-3.5 transition-colors">
                  <Trophy className="w-6 h-6 text-[#00f0a8]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {formatDistanceToNow(match.timestamp, { addSuffix: true })}
                    </span>
                    {match.startingScore && (
                      <span className="bg-[#0a0e17] px-2 py-0.5 rounded-md text-[10px] font-black text-[#00f0a8] border border-white/5">
                        {match.startingScore}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-base text-white truncate flex items-center gap-2">
                    Winner: <span className="text-[#00f0a8]">{winnerName || 'Unknown'}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    <span>{pCount} Players • {match.turns?.length || 0} throws recorded</span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-[#00f0a8]/15 group-hover:text-[#00f0a8] text-slate-400 transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}

          {matches.length === 0 && (
            <div className="p-10 text-center rounded-2xl bg-[#131b2a] border border-white/5">
              <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-300 mb-1">No Match History</h3>
              <p className="text-slate-500 text-xs">Complete a match to view detailed turn logs here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

