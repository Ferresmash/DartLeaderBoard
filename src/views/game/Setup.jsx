import { useState, useMemo } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Play, ChevronLeft, ChevronRight, Users, Shield, Target, 
  Skull, Flame, AlertTriangle, Dices, Check, Heart, Compass, Clock
} from 'lucide-react';
import DartFlowHeader from '../../components/DartFlowHeader';
import { 
  PLAYER_THEMES,
  KILLER_DIFFICULTIES,
  isBoardOverfilled,
  getMaxPlayersForSlices,
  assignRandomAdjacentSlices,
  TOTAL_SECTORS
} from '../../utils/killerUtils';

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

  // Game Mode: 'x01' or 'killer'
  const [gameMode, setGameMode] = useState('x01');

  // X01 Mode settings
  const [mode, setMode] = useState('501'); // 301, 501, 701, custom
  const [customScore, setCustomScore] = useState(301);
  const [legs, setLegs] = useState(1);
  const [playerMode, setPlayerMode] = useState('ffa'); // 'ffa', 'teams'
  const [outRule, setOutRule] = useState('straight'); // 'straight', 'double', 'master'

  // Killer Mode settings - Default is Hard (1 Number)
  const [killerDifficulty, setKillerDifficulty] = useState('hard');
  const [multipliersCount, setMultipliersCount] = useState(true);
  const [randomSeed, setRandomSeed] = useState(0);

  const playerList = selectedPlayers || [];
  const isFourPlayers = playerList.length === 4;
  const currentDiffObj = KILLER_DIFFICULTIES.find(d => d.id === killerDifficulty) || KILLER_DIFFICULTIES[0];
  const slicesPerPlayer = currentDiffObj.slices;

  // Killer board capacity checks
  const isOverfilled = isBoardOverfilled(playerList.length, slicesPerPlayer);

  // Computed random slice assignments (adjacent for each player, scattered across the board)
  const playerSliceAssignments = useMemo(() => {
    return assignRandomAdjacentSlices(playerList, slicesPerPlayer);
  }, [playerList, slicesPerPlayer, randomSeed]);

  if (!selectedPlayers || selectedPlayers.length === 0) {
    return <Navigate to="/game" />;
  }

  const handleRerollSlices = () => {
    setRandomSeed(s => s + 1);
  };

  const handleStart = () => {
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);

    if (gameMode === 'killer') {
      if (isOverfilled) return;
      localStorage.removeItem('activeDartsGame');
      localStorage.removeItem('activeKillerGame');
      // Pass the randomized slice assignments to the match
      navigate('/game/play', {
        state: {
          gameMode: 'killer',
          selectedPlayers: shuffledPlayers,
          killerConfig: {
            difficulty: killerDifficulty,
            slicesPerPlayer,
            multipliersCount,
            playerSlices: playerSliceAssignments
          }
        }
      });
      return;
    }

    if (gameMode === 'cricket') {
      navigate('/game/play', {
        state: {
          gameMode: 'cricket',
          selectedPlayers: shuffledPlayers
        }
      });
      return;
    }

    if (gameMode === 'around_the_clock') {
      navigate('/game/play', {
        state: {
          gameMode: 'around_the_clock',
          selectedPlayers: shuffledPlayers
        }
      });
      return;
    }

    // Classic X01
    localStorage.removeItem('activeKillerGame');
    localStorage.removeItem('activeDartsGame');
    const startingScore = mode === 'custom' ? parseInt(customScore) || 301 : parseInt(mode);
    navigate('/game/play', { 
      state: { 
        gameMode: 'x01',
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
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Match Setup</h1>
            <p className="text-slate-400 text-xs mt-1 font-medium">Choose game mode & configure rules</p>
          </div>

          {/* Game Mode Selector (Classic X01, Killer, Cricket, Around the Clock) */}
          <div className="flex flex-col gap-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-1">
              Select Game Mode
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGameMode('x01')}
                className={`p-3 rounded-2xl flex flex-col items-center text-center border-2 transition-all cursor-pointer ${
                  gameMode === 'x01'
                    ? 'bg-[#122421] border-[#00f0a8] shadow-[0_0_20px_rgba(0,240,168,0.25)]'
                    : 'bg-[#131b2a] border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl mb-1.5 flex items-center justify-center ${
                  gameMode === 'x01' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-white/5 text-slate-400'
                }`}>
                  <Target className="w-4 h-4" />
                </div>
                <span className="font-black text-xs text-white">Classic X01</span>
                <span className="text-[9px] text-slate-400 mt-0.5">301 / 501 / 701</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('killer')}
                className={`p-3 rounded-2xl flex flex-col items-center text-center border-2 transition-all cursor-pointer ${
                  gameMode === 'killer'
                    ? 'bg-[#291018] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-[#131b2a] border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl mb-1.5 flex items-center justify-center ${
                  gameMode === 'killer' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'
                }`}>
                  <Skull className="w-4 h-4" />
                </div>
                <span className="font-black text-xs text-white">Killer</span>
                <span className="text-[9px] text-rose-300/80 mt-0.5">Hearts & Survival</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('cricket')}
                className={`p-3 rounded-2xl flex flex-col items-center text-center border-2 transition-all cursor-pointer ${
                  gameMode === 'cricket'
                    ? 'bg-[#291e10] border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-[#131b2a] border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl mb-1.5 flex items-center justify-center ${
                  gameMode === 'cricket' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'
                }`}>
                  <Flame className="w-4 h-4" />
                </div>
                <span className="font-black text-xs text-white">Cricket</span>
                <span className="text-[9px] text-amber-300/80 mt-0.5">15-20 & Bull</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('around_the_clock')}
                className={`p-3 rounded-2xl flex flex-col items-center text-center border-2 transition-all cursor-pointer ${
                  gameMode === 'around_the_clock'
                    ? 'bg-[#0e222b] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : 'bg-[#131b2a] border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl mb-1.5 flex items-center justify-center ${
                  gameMode === 'around_the_clock' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-400'
                }`}>
                  <Compass className="w-4 h-4" />
                </div>
                <span className="font-black text-xs text-white">Around Clock</span>
                <span className="text-[9px] text-cyan-300/80 mt-0.5">1 to 20 + Bull</span>
              </button>
            </div>
          </div>

          {/* Players Overview Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center pl-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Players</span>
              <span className="text-[11px] font-extrabold text-[#00f0a8] bg-[#00f0a8]/10 px-2 py-0.5 rounded-full border border-[#00f0a8]/20">
                {selectedPlayers.length} Selected
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              {selectedPlayers.map((player, idx) => {
                const colorIdx = gameMode === 'x01' && playerMode === 'teams' && isFourPlayers 
                  ? (idx % 2 === 0 ? 0 : 1) 
                  : idx % PLAYER_COLORS.length;
                const color = PLAYER_COLORS[colorIdx];
                const teamLabel = gameMode === 'x01' && playerMode === 'teams' && isFourPlayers 
                  ? (idx % 2 === 0 ? 'Team A' : 'Team B') 
                  : `Player ${idx + 1}`;
                const assignedSlices = playerSliceAssignments[player.id || idx] || [];

                return (
                  <div 
                    key={player.id || idx}
                    className={`bg-[#131b2a] rounded-2xl p-3 flex flex-col items-center justify-center border-2 transition-all ${color.border} ${color.glow}`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden mb-1.5 relative border-2 border-white/10 bg-[#1b2437] flex items-center justify-center">
                      {player.pfpUrl ? (
                        <img src={player.pfpUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-white text-base uppercase">
                          {player.name ? player.name.substring(0, 2) : 'PL'}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-white text-xs tracking-tight truncate max-w-[120px]">
                      {player.name}
                    </span>

                    {gameMode === 'killer' ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase">Slices:</span>
                        <div className="flex gap-0.5">
                          {assignedSlices.map(s => (
                            <span 
                              key={s} 
                              className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/10 text-[#00f0a8]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-extrabold uppercase mt-0.5 ${color.text}`}>
                        {teamLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* KILLER CONFIGURATION */}
          {gameMode === 'killer' && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2">
              
              {/* Difficulty: 3 numbers, 2 numbers, 1 number */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between pl-1">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Difficulty (Slices Per Player)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Adjacent numbers on board
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {KILLER_DIFFICULTIES.map(diff => {
                    const isSelected = killerDifficulty === diff.id;
                    const diffOverfilled = isBoardOverfilled(selectedPlayers.length, diff.slices);
                    const maxP = getMaxPlayersForSlices(diff.slices);

                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => {
                          if (!diffOverfilled) setKillerDifficulty(diff.id);
                        }}
                        disabled={diffOverfilled}
                        className={`p-3 rounded-2xl flex flex-col items-center text-center border-2 transition-all relative ${
                          diffOverfilled
                            ? 'bg-[#10141e]/50 border-white/5 opacity-40 cursor-not-allowed text-slate-500'
                            : isSelected
                              ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer'
                              : 'bg-[#131b2a] border-white/10 text-slate-300 hover:border-white/20 hover:text-white cursor-pointer'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">{diff.name}</span>
                        <span className="text-[11px] font-bold text-rose-400 mt-0.5">{diff.badge}</span>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {diffOverfilled ? `Max ${maxP} Pl.` : `≤ ${maxP} Players`}
                        </span>
                        {isSelected && !diffOverfilled && (
                          <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Board Capacity Indicator & Overfill Check Warning */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isOverfilled 
                  ? 'bg-rose-500/15 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                  : 'bg-[#131b2a] border-white/10 text-slate-300'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {isOverfilled ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Shield className="w-4 h-4 text-[#00f0a8]" />}
                    <span>Board Slice Capacity</span>
                  </span>
                  <span className={isOverfilled ? "text-rose-400 font-black" : "text-[#00f0a8] font-black"}>
                    {totalSlicesNeeded} / {TOTAL_SECTORS} Slices
                  </span>
                </div>

                <div className="w-full bg-[#0a0e17] h-2 rounded-full overflow-hidden border border-white/5 mb-2">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isOverfilled ? 'bg-rose-500' : 'bg-[#00f0a8]'
                    }`}
                    style={{ width: `${Math.min(100, (totalSlicesNeeded / TOTAL_SECTORS) * 100)}%` }}
                  />
                </div>

                {isOverfilled ? (
                  <p className="text-[11px] text-rose-300 leading-snug font-medium">
                    ⚠️ <strong>Board Overfilled!</strong> {selectedPlayers.length} players with {slicesPerPlayer} slices each requires {totalSlicesNeeded} slices, but a dartboard only has 20 slices. Please select Medium (2) or Hard (1) difficulty.
                  </p>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{selectedPlayers.length} players × {slicesPerPlayer} numbers each</span>
                    <button
                      type="button"
                      onClick={handleRerollSlices}
                      className="text-[10px] font-bold text-[#00f0a8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Re-roll Slices</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Multipliers Option (Doubles/Triples count for 2/3 hearts) */}
              <div className="bg-[#131b2a] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="text-white font-bold text-xs">Multipliers Count</span>
                  <span className="text-slate-400 text-[11px] mt-0.5">
                    Doubles = 2 hearts, Triples = 3 hearts (Recommended)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMultipliersCount(!multipliersCount)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    multipliersCount ? 'bg-[#00f0a8]' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                    multipliersCount ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Killer Rules Summary Card */}
              <div className="bg-[#0e1420] border border-white/5 rounded-2xl p-3 text-xs text-slate-400 space-y-1">
                <div className="font-extrabold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Killer Rules Quick Reference</span>
                </div>
                <p>• Everyone starts at <strong>0 hearts</strong>.</p>
                <p>• Hit your own slice(s) to earn hearts up to <strong>3 hearts</strong>.</p>
                <p>• At 3 hearts, you become a <strong>Killer</strong>. On your future turns, you can attack rivals!</p>
                <p>• When a player at 0 hearts is hit by a Killer, they are <strong>Eliminated</strong>. Last player standing wins!</p>
              </div>

            </div>
          )}

          {/* CRICKET CONFIGURATION */}
          {gameMode === 'cricket' && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-[#19150e] border border-amber-500/25 rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-amber-200/90 leading-relaxed shadow-lg">
                <div className="flex items-center gap-2 font-black text-amber-300 uppercase tracking-wider text-sm">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Cricket Rules Quick Reference</span>
                </div>
                <p>• Targets: <strong>15, 16, 17, 18, 19, 20, and Bullseye</strong>.</p>
                <p>• Hit a target <strong>3 times</strong> to close it (Single = 1, Double = 2, Triple = 3).</p>
                <p>• Once you close a number, subsequent hits score points until all opponents have also closed it.</p>
                <p>• Winner is the first player to close all numbers with an equal or higher score!</p>
              </div>
            </div>
          )}

          {/* AROUND THE CLOCK CONFIGURATION */}
          {gameMode === 'around_the_clock' && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-[#0b171c] border border-cyan-500/25 rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-cyan-200/90 leading-relaxed shadow-lg">
                <div className="flex items-center gap-2 font-black text-cyan-300 uppercase tracking-wider text-sm">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Around the Clock ("Jorden Runt")</span>
                </div>
                <p>• Players start at <strong>Target 1</strong> and race sequentially through <strong>20, ending at Bull</strong>.</p>
                <p>• <strong>Bonus Skips:</strong> Hitting a Double advances 2 targets (+2), Triple advances 3 (+3)!</p>
                <p>• First player to complete target 20 and Bullseye wins the match!</p>
              </div>
            </div>
          )}

          {/* CLASSIC X01 CONFIGURATION */}
          {gameMode === 'x01' && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
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
          )}
        </div>

        {/* Start Game Action Button */}
        <div className="pt-6">
          <button
            onClick={handleStart}
            disabled={gameMode === 'killer' && isOverfilled}
            className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-lg tracking-wide uppercase cursor-pointer ${
              gameMode === 'killer' && isOverfilled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-white/5'
                : gameMode === 'killer'
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                  : gameMode === 'cricket'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                    : gameMode === 'around_the_clock'
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                      : 'bg-[#00f0a8] hover:bg-[#00d694] text-[#0a0e17] shadow-[0_0_25px_rgba(0,240,168,0.4)]'
            }`}
          >
            {gameMode === 'killer' ? (
              <>
                <Skull className="w-5 h-5 fill-current" />
                <span>{isOverfilled ? 'Overfilled - Lower Slices' : 'Start Killer Match'}</span>
              </>
            ) : gameMode === 'cricket' ? (
              <>
                <Flame className="w-5 h-5 fill-current" />
                <span>Start Cricket Match</span>
              </>
            ) : gameMode === 'around_the_clock' ? (
              <>
                <Compass className="w-5 h-5 fill-current" />
                <span>Start Around The Clock</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Match</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
