import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings2, Circle, CheckCircle2, ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react';
import clsx from 'clsx';

export default function Lobby({ players }) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const [customGuests, setCustomGuests] = useState([]);
  const [guestName, setGuestName] = useState('');

  const handleAddGuest = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    const newGuest = {
      id: `guest__${encodeURIComponent(guestName.trim())}__${Date.now()}`,
      name: guestName.trim(),
      isGuest: true
    };
    setCustomGuests([...customGuests, newGuest]);
    setGuestName('');
  };

  const removeGuest = (id) => {
    setCustomGuests(prev => prev.filter(g => g.id !== id));
  };

  const priorityIds = ['ferdinand', 'max', 'emil', 'ted'];
  
  // Sort heavily prioritizing the big four
  const sortedPlayers = [...players].sort((a, b) => {
    const aPriority = priorityIds.includes(a.id) ? priorityIds.indexOf(a.id) : 999;
    const bPriority = priorityIds.includes(b.id) ? priorityIds.indexOf(b.id) : 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.ceil(sortedPlayers.length / 4);
  const visiblePlayers = sortedPlayers.slice(page * 4, page * 4 + 4);

  const togglePlayer = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selectedIds.length === 0 && customGuests.length === 0) return;
    const selectedPlayers = players.filter(p => selectedIds.includes(p.id)).concat(customGuests);
    navigate('/game/setup', { state: { selectedPlayers } });
  };

  return (
    <div className="p-6 md:p-10 pb-32 flex flex-col gap-8 md:gap-12">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-8 pt-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 md:mb-4 flex items-center gap-3">
             <Users className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
             <span className="text-white">New Match</span>
          </h1>
          <p className="text-slate-400 font-medium md:text-lg">Select players to join the lobby.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-6">
          {visiblePlayers.map(player => {
            const isSelected = selectedIds.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`flex flex-col items-center p-6 bg-white/[0.03] border rounded-3xl transition-all duration-300 active:scale-95 group shadow-lg ${isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5 hover:bg-white/[0.08]'}`}
              >
                <div className="relative w-24 h-24 md:w-28 md:h-28 mb-4">
                   {player.pfpUrl ? (
                     <img src={player.pfpUrl} alt={player.name} className={`w-full h-full rounded-full object-cover transition-transform duration-500 ${isSelected ? 'border-4 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-[1.15]' : 'border-2 border-slate-700 group-hover:border-indigo-400 group-hover:scale-105'}`} />
                   ) : (
                     <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-2xl uppercase transition-transform duration-500 ${isSelected ? 'border-4 border-indigo-400 bg-indigo-500/20 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-[1.15]' : 'border-2 border-slate-700 bg-slate-800 text-slate-400 group-hover:border-indigo-400 group-hover:scale-105'}`}>
                        {player.name.substring(0,2)}
                     </div>
                   )}
                   <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5">
                     {isSelected ? <CheckCircle2 className="w-8 h-8 text-indigo-400" /> : <Circle className="w-8 h-8 text-slate-700" />}
                   </div>
                </div>
                <h3 className={`font-bold md:text-xl text-center tracking-tight leading-tight ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{player.name}</h3>
              </button>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-2 max-w-sm mx-auto mb-8 shadow-inner">
             <button 
               onClick={() => setPage(p => p - 1)} 
               disabled={page === 0}
               className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-all active:scale-95 text-slate-300"
             >
               <ChevronLeft className="w-6 h-6" />
             </button>
             <span className="font-bold text-slate-400 text-sm tracking-widest uppercase">Page {page + 1} of {totalPages}</span>
             <button 
               onClick={() => setPage(p => p + 1)} 
               disabled={page === totalPages - 1}
               className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-all active:scale-95 text-slate-300"
             >
               <ChevronRight className="w-6 h-6" />
             </button>
          </div>
        )}

        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 md:p-8 mb-8 shadow-inner">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-500/20 rounded-xl">
                 <UserPlus className="w-6 h-6 text-indigo-400" />
               </div>
               <div>
                  <h3 className="font-bold text-xl text-slate-100">Add Guest</h3>
                  <p className="text-slate-400 text-sm">Play with someone not on the leaderboard</p>
               </div>
             </div>
             
             <form onSubmit={handleAddGuest} className="flex gap-2 w-full md:w-auto">
               <input 
                 type="text" 
                 value={guestName} 
                 onChange={(e) => setGuestName(e.target.value)}
                 placeholder="Guest name" 
                 className="flex-1 md:w-48 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
               />
               <button 
                 type="submit"
                 disabled={!guestName.trim()}
                 className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
               >
                 Add
               </button>
             </form>
          </div>

          {customGuests.length > 0 && (
             <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-4">
               {customGuests.map(g => (
                 <div key={g.id} className="flex items-center gap-2 bg-slate-900 border border-slate-700/50 rounded-full pl-4 pr-2 py-1.5 shadow-sm">
                   <span className="text-slate-200 font-bold tracking-tight">{g.name}</span>
                   <button 
                     onClick={() => removeGuest(g.id)}
                     className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                   >
                     <X className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
          )}
        </div>

      </div>
      
      <div className="max-w-4xl mx-auto w-full">
        <button
          onClick={handleNext}
          disabled={selectedIds.length === 0 && customGuests.length === 0}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider py-5 rounded-3xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] text-xl"
        >
          <span>Continue to Setup</span>
          <Settings2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
