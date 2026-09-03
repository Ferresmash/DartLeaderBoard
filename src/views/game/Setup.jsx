import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, Users, Shield, Target, UserCheck } from 'lucide-react';
import DartFlowHeader from '../../components/DartFlowHeader';

const PLAYER_COLORS = [
  { border: 'border-[#00f0a8]', glow: 'shadow-[0_0_15px_rgba(0,240,168,0.3)]', text: 'text-[#00f0a8]', bg: 'bg-[#00f0a8]/10', name: 'Teal' },
  { border: 'border-[#a855f7]', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]', text: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10', name: 'Purple' },
  { border: 'border-[#f97316]', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]', text: 'text-[#f97316]', bg: 'bg-[#f97316]/10', name: 'Orange' },
  { border: 'border-[#eab308]', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]', text: 'text-[#eab308]', bg: 'bg-[#eab308]/10', name: 'Yellow' }
];

export default function Setup() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPlayers = location.state?.selectedPlayers;

  const [mode, setMode] = useState('501'); // 301, 501, 701, custom
  const [customScore, setCustomScore] = useState(301);
  const [legs, setLegs] = useState(1);
  const [playerMode, setPlayerMode] = useState('ffa'); // 'ffa', 'teams', 'solo'
  const [outRule, setOutRule] = useState('straight'); // 'straight', 'double', 'master'

  if (!selectedPlayers || selectedPlayers.length === 0) {
    return <Navigate to="/game" />;
  }

  const isFourPlayers = selectedPlayers.length === 4;

  const handleStart = () => {
    const startingScore = mode === 'custom' ? parseInt(customScore) || 301 : parseInt(mode);
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);

    navigate('/game/play', { 
      state: { 
        selectedPlayers: shuffledPlayers, 
        startingScore, 
        legsToWin: legs,
        playerMode,
        outRule
      } 
    });
  };

  const modeOptions = ['301', '501', '701', 'custom'];

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] flex flex-col font-sans">
      <DartFlowHeader showBack onBack={() => navigate('/game')} />

      <div className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col justify-between pb-28 md:pb-12">
        <div className="flex flex-col gap-6">
          {/* Screen Title */}
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">New Match</h1>
            <p className="text-slate-400 text-xs mt-1 font-medium">Configure match rules & player order</p>
          </div>

          {/* Players Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center pl-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Players</span>
              <span className="text-[11px] font-extrabold text-[#00f0a8] bg-[#00f0a8]/10 px-2 py-0.5 rounded-full border border-[#00f0a8]/20">
                {selectedPlayers.length} Selected
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {selectedPlayers.map((player, idx) => {
                // If in 2v2 Teams mode, group team 1 (idx 0, 2) in Teal and team 2 (idx 1, 3) in Purple
                const colorIdx = playerMode === 'teams' && isFourPlayers ? (idx % 2 === 0 ? 0 : 1) : idx % PLAYER_COLORS.length;
                const color = PLAYER_COLORS[colorIdx];
                const teamLabel = playerMode === 'teams' && isFourPlayers ? (idx % 2 === 0 ? 'Team A' : 'Team B') : `Player ${idx + 1}`;

                return (
                  <div 
                    key={player.id || idx}
                    className={`bg-[#131b2a] rounded-2xl p-3 flex flex-col items-center justify-center border-2 transition-all ${color.border} ${color.glow}`}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2 relative border-2 border-white/10 bg-[#1b2437] flex items-center justify-center">
                      {player.pfpUrl ? (
                        <img src={player.pfpUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-white text-lg uppercase">
                          {player.name ? player.name.substring(0, 2) : 'PL'}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-white text-sm tracking-tight truncate max-w-[120px]">
                      {player.name}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase mt-0.5 ${color.text}`}>
                      {teamLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Select Game / Starting Score */}
          <div className="flex flex-col gap-2.5">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-1">Starting Score</span>
            <div className="grid grid-cols-4 gap-2 bg-[#131b2a] p-1.5 rounded-2xl border border-white/[0.08]">
              {modeOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setMode(opt)}
                  className={`py-3 rounded-xl font-black text-sm tracking-wide transition-all cursor-pointer ${
                    mode === opt 
                      ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_15px_rgba(0,240,168,0.4)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {opt === 'custom' ? 'Custom' : opt}
                </button>
              ))}
            </div>

            {mode === 'custom' && (
              <div className="bg-[#131b2a] border border-white/10 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2 text-center">Custom Starting Score</label>
                <input 
                  type="number" 
                  value={customScore} 
                  onChange={e => setCustomScore(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-white/15 rounded-xl py-3 px-4 text-white text-3xl font-black text-center focus:outline-none focus:border-[#00f0a8] transition-colors"
                />
              </div>
            )}
          </div>

          {/* Player Mode Interactive Selector */}
          <div className="flex flex-col gap-2.5">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-1">Player Mode</span>
            <div className="grid grid-cols-2 gap-2 bg-[#131b2a] p-1.5 rounded-2xl border border-white/[0.08]">
              <button
                onClick={() => setPlayerMode('ffa')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  playerMode === 'ffa'
                    ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Free For All (PvP)</span>
              </button>

              <button
                onClick={() => {
                  if (isFourPlayers) setPlayerMode('teams');
                }}
                disabled={!isFourPlayers}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  !isFourPlayers ? 'opacity-35 cursor-not-allowed text-slate-500' :
                  playerMode === 'teams'
                    ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)] cursor-pointer'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>2v2 Teams {isFourPlayers ? '' : '(4 Players)'}</span>
              </button>
            </div>
          </div>

          {/* Out Rule Selector */}
          <div className="flex flex-col gap-2.5">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-1">Finish Rule (Out Mode)</span>
            <div className="grid grid-cols-3 gap-2 bg-[#131b2a] p-1.5 rounded-2xl border border-white/[0.08]">
              <button
                onClick={() => setOutRule('straight')}
                className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                  outRule === 'straight'
                    ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Straight Out
              </button>
              <button
                onClick={() => setOutRule('double')}
                className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                  outRule === 'double'
                    ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Double Out
              </button>
              <button
                onClick={() => setOutRule('master')}
                className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                  outRule === 'master'
                    ? 'bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_12px_rgba(0,240,168,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Master Out
              </button>
            </div>
          </div>

          {/* Legs to Win Section */}
          <div className="bg-[#131b2a] rounded-2xl p-4 border border-white/[0.08] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">Legs to Win</span>
              <span className="text-slate-400 text-xs">First to reach target</span>
            </div>
            <div className="flex items-center gap-3 bg-[#0a0e17] p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setLegs(l => Math.max(1, l - 1))}
                className="w-9 h-9 rounded-lg bg-[#161f30] hover:bg-[#1f2b42] text-slate-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-black text-white text-lg">{legs}</span>
              <button 
                onClick={() => setLegs(l => Math.min(21, l + 1))}
                className="w-9 h-9 rounded-lg bg-[#161f30] hover:bg-[#1f2b42] text-slate-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Start Game Action Button */}
        <div className="pt-6">
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-[#00f0a8] hover:bg-[#00d694] text-[#0a0e17] font-black py-4 rounded-2xl shadow-[0_0_25px_rgba(0,240,168,0.4)] transition-all active:scale-[0.98] text-lg tracking-wide uppercase cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}


