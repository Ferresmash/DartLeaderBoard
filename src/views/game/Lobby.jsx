import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings2, Circle, CheckCircle2, ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react';
import DartFlowHeader from '../../components/DartFlowHeader';
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
    <div className="min-h-[100dvh] bg-[#0a0e17] flex flex-col font-sans pb-28 md:pb-12">
      <DartFlowHeader />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        <header className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-2.5">
            <Users className="w-8 h-8 text-[#00f0a8]" />
            <span>New Match</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Select players to join the match lobby</p>
        </header>

        {/* Player Selection Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
          {visiblePlayers.map(player => {
            const isSelected = selectedIds.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`flex flex-col items-center p-5 rounded-2xl transition-all duration-200 active:scale-95 group text-center cursor-pointer ${
                  isSelected 
                    ? 'bg-[#131f30] border-2 border-[#00f0a8] shadow-[0_0_20px_rgba(0,240,168,0.25)]' 
                    : 'bg-[#131b2a] border border-white/[0.08] hover:border-white/20 hover:bg-[#182236]'
                }`}
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 mb-3">
                  {player.pfpUrl ? (
                    <img 
                      src={player.pfpUrl} 
                      alt={player.name} 
                      className={`w-full h-full rounded-full object-cover transition-all ${
                        isSelected 
                          ? 'border-2 border-[#00f0a8] shadow-[0_0_12px_rgba(0,240,168,0.4)]' 
                          : 'border border-white/10'
                      }`} 
                    />
                  ) : (
                    <div className={`w-full h-full rounded-full flex items-center justify-center font-extrabold text-xl uppercase ${
                      isSelected 
                        ? 'border-2 border-[#00f0a8] bg-[#00f0a8]/10 text-[#00f0a8]' 
                        : 'border border-white/10 bg-[#1a2336] text-slate-300'
                    }`}>
                      {player.name.substring(0, 2)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-[#0a0e17] rounded-full p-0.5 shadow-md">
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-[#00f0a8] fill-[#00f0a8]/20" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                </div>
                <h3 className={`font-bold text-sm md:text-base tracking-tight truncate max-w-full ${
                  isSelected ? 'text-white' : 'text-slate-300'
                }`}>
                  {player.name}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-[#131b2a] border border-white/[0.08] rounded-2xl p-1.5 max-w-xs mx-auto shadow-inner">
            <button 
              onClick={() => setPage(p => p - 1)} 
              disabled={page === 0}
              className="p-2 bg-[#1a2336] hover:bg-[#222e44] disabled:opacity-30 rounded-xl transition-all text-slate-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-400 text-xs tracking-widest uppercase">
              Page {page + 1} of {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => p + 1)} 
              disabled={page === totalPages - 1}
              className="p-2 bg-[#1a2336] hover:bg-[#222e44] disabled:opacity-30 rounded-xl transition-all text-slate-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Guest Add Form */}
        <div className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#00f0a8]/10 rounded-xl">
                <UserPlus className="w-5 h-5 text-[#00f0a8]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Add Guest Player</h3>
                <p className="text-slate-400 text-xs">Play with someone without a permanent profile</p>
              </div>
            </div>
            
            <form onSubmit={handleAddGuest} className="flex gap-2 w-full md:w-auto">
              <input 
                type="text" 
                value={guestName} 
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest name" 
                className="flex-1 md:w-48 bg-[#0a0e17] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0a8] transition-colors"
              />
              <button 
                type="submit"
                disabled={!guestName.trim()}
                className="bg-[#00f0a8] hover:bg-[#00d694] disabled:opacity-40 disabled:bg-[#1a2336] disabled:text-slate-500 text-[#0a0e17] font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                Add
              </button>
            </form>
          </div>

          {customGuests.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              {customGuests.map(g => (
                <div key={g.id} className="flex items-center gap-2 bg-[#0a0e17] border border-white/10 rounded-full pl-3 pr-1.5 py-1 text-xs">
                  <span className="text-slate-200 font-bold">{g.name}</span>
                  <button 
                    onClick={() => removeGuest(g.id)}
                    className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div>
          <button
            onClick={handleNext}
            disabled={selectedIds.length === 0 && customGuests.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#00f0a8] hover:bg-[#00d694] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0e17] font-black uppercase tracking-wider py-4 rounded-2xl shadow-[0_0_25px_rgba(0,240,168,0.35)] transition-all active:scale-[0.98] text-base cursor-pointer"
          >
            <span>Continue to Setup</span>
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

