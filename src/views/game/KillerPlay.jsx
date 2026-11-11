import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Skull, Heart, RotateCcw, Settings, Trophy, AlertTriangle, 
  Target, X, Check, Flame, ChevronRight, Zap
} from 'lucide-react';
import DartFlowHeader from '../../components/DartFlowHeader';
import KillerBoard from '../../components/KillerBoard';
import { submitMatchData } from '../../firebase/db';
import { 
  PLAYER_THEMES, 
  buildSectorPlayerMap 
} from '../../utils/killerUtils';
import clsx from 'clsx';

export default function KillerPlay({ onMatchComplete }) {
  const location = useLocation();
  const navigate = useNavigate();

  const savedGameStr = localStorage.getItem('activeKillerGame');
  const savedGame = savedGameStr ? JSON.parse(savedGameStr) : null;
  const isNewGame = !!location.state?.selectedPlayers;

  const killerConfig = isNewGame ? location.state?.killerConfig : savedGame?.killerConfig;
  const slicesPerPlayer = killerConfig?.slicesPerPlayer || 1;
  const multipliersCount = killerConfig?.multipliersCount ?? true;
  const difficulty = killerConfig?.difficulty || 'hard';

  // Players state
  const [players, setPlayers] = useState(() => {
    if (isNewGame) {
      const selected = location.state?.selectedPlayers || [];
      const assigned = killerConfig?.playerSlices || {};
      return selected.map((p, i) => {
        const theme = PLAYER_THEMES[i % PLAYER_THEMES.length];
        return {
          ...p,
          hearts: 0,
          isKiller: false,
          becameKillerThisTurn: false,
          isEliminated: false,
          assignedSlices: assigned[p.id || i] || [],
          theme,
          dartsThrown: 0,
          kills: 0
        };
      });
    }
    return savedGame?.players || [];
  });

  const [activeIdx, setActiveIdx] = useState(isNewGame ? 0 : savedGame?.activeIdx ?? 0);
  const [turnDarts, setTurnDarts] = useState(isNewGame ? [] : savedGame?.turnDarts || []);
  const [historyStack, setHistoryStack] = useState(isNewGame ? [] : savedGame?.historyStack || []);
  const [turnHistory, setTurnHistory] = useState(isNewGame ? [] : savedGame?.turnHistory || []);
  const [winner, setWinner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [killerToast, setKillerToast] = useState(null);
  const [lastActionToast, setLastActionToast] = useState(null);
  const [isZoomEnabled, setIsZoomEnabled] = useState(true);
  const [focusedOpponentId, setFocusedOpponentId] = useState(null);
  const [focusedSlice, setFocusedSlice] = useState(null);
  const [hitDialogSector, setHitDialogSector] = useState(null);

  const autoAdvanceTimerRef = useRef(null);

  // Persist game state
  useEffect(() => {
    if (players.length > 0 && !isSaving && !winner) {
      localStorage.setItem('activeKillerGame', JSON.stringify({
        players,
        activeIdx,
        turnDarts,
        historyStack,
        turnHistory,
        killerConfig
      }));
    }
  }, [players, activeIdx, turnDarts, historyStack, turnHistory, killerConfig, isSaving, winner]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const activePlayer = players[activeIdx] || players[0];
  const sectorPlayerMap = useMemo(() => buildSectorPlayerMap(players), [players]);
  const isEligibleToAttack = activePlayer?.isKiller && !activePlayer?.becameKillerThisTurn;

  // Living opponents for Killer targeting
  const livingOpponents = useMemo(() => {
    return players.filter(p => p.id !== activePlayer?.id && !p.isEliminated);
  }, [players, activePlayer]);

  // Target slices for smart mini-zoom (Own slices when hunting hearts, Opponent slices when Killer)
  const targetSlices = useMemo(() => {
    if (!isEligibleToAttack) {
      if (focusedSlice && activePlayer?.assignedSlices?.includes(focusedSlice)) {
        return [focusedSlice];
      }
      return activePlayer?.assignedSlices || [];
    }
    if (livingOpponents.length === 0) return [];
    if (focusedOpponentId) {
      const opp = livingOpponents.find(p => p.id === focusedOpponentId);
      if (opp) return opp.assignedSlices;
    }
    return livingOpponents[0]?.assignedSlices || [];
  }, [isEligibleToAttack, activePlayer, livingOpponents, focusedOpponentId, focusedSlice]);

  const targetedOpponent = useMemo(() => {
    if (!isEligibleToAttack) return null;
    if (focusedOpponentId) return livingOpponents.find(p => p.id === focusedOpponentId) || livingOpponents[0];
    return livingOpponents[0] || null;
  }, [isEligibleToAttack, focusedOpponentId, livingOpponents]);

  const primaryTargetSector = useMemo(() => {
    if (!isEligibleToAttack) {
      if (focusedSlice && activePlayer?.assignedSlices?.includes(focusedSlice)) {
        return focusedSlice;
      }
      return activePlayer?.assignedSlices?.[0] || null;
    }
    if (targetedOpponent && targetedOpponent.assignedSlices?.length > 0) {
      return targetedOpponent.assignedSlices[0];
    }
    return null;
  }, [isEligibleToAttack, focusedSlice, activePlayer, targetedOpponent]);

  const targetOpponentForHit = useMemo(() => {
    if (!hitDialogSector) return null;
    return players.find(p => p.id !== activePlayer?.id && !p.isEliminated && p.assignedSlices?.includes(hitDialogSector)) || null;
  }, [hitDialogSector, players, activePlayer]);

  if (!isNewGame && !savedGame) {
    return <Navigate to="/game" />;
  }

  // Function to advance turn to next living player
  const advanceToNextPlayer = (updatedPlayers, currentIdx, completedDarts) => {
    const nextPlayers = JSON.parse(JSON.stringify(updatedPlayers));
    const curr = nextPlayers[currentIdx];

    // Clear becameKillerThisTurn flag now that turn ends
    if (curr && curr.becameKillerThisTurn) {
      curr.becameKillerThisTurn = false;
    }

    // Save turn record
    setTurnHistory(prev => [
      ...prev,
      {
        playerId: curr?.id,
        playerName: curr?.name,
        darts: [...completedDarts],
        timestamp: Date.now()
      }
    ]);

    // Check win condition
    const living = nextPlayers.filter(p => !p.isEliminated);
    if (living.length <= 1) {
      const matchWinner = living[0] || curr;
      setWinner(matchWinner);
      setPlayers(nextPlayers);
      handleMatchWin(matchWinner, nextPlayers);
      return;
    }

    // Advance to next active (living) player
    let next = (currentIdx + 1) % nextPlayers.length;
    while (nextPlayers[next].isEliminated) {
      next = (next + 1) % nextPlayers.length;
    }

    setActiveIdx(next);
    setTurnDarts([]);
    setFocusedSlice(null);
    setFocusedOpponentId(null);
    setPlayers(nextPlayers);
  };

  // Direct 1-Tap Dart Hit on the Board
  const handleHitSector = (sector, multiplier = 1) => {
    if (turnDarts.length >= 3 || winner || isSaving) return;

    // Clear any pending auto-advance
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    // Save snapshot for Undo
    setHistoryStack(prev => [...prev, {
      players: JSON.parse(JSON.stringify(players)),
      activeIdx,
      turnDarts: [...turnDarts],
      turnHistory: [...turnHistory]
    }]);

    const newPlayers = JSON.parse(JSON.stringify(players));
    const curr = newPlayers[activeIdx];
    let dartType = 'miss';
    let dartDesc = '';
    let deltaHearts = 0;
    let targetName = null;

    const label = sector === 0 
      ? 'Miss' 
      : multiplier === 3 
        ? `T${sector}` 
        : multiplier === 2 
          ? `D${sector}` 
          : `S${sector}`;

    const isOwn = curr.assignedSlices.includes(sector);
    const opponent = newPlayers.find(
      p => p.id !== curr.id && !p.isEliminated && p.assignedSlices.includes(sector)
    );

    if (isOwn) {
      if (curr.hearts < 3) {
        const heartsToAdd = multipliersCount ? multiplier : 1;
        const newHearts = Math.min(3, curr.hearts + heartsToAdd);
        deltaHearts = newHearts - curr.hearts;
        curr.hearts = newHearts;

        if (newHearts === 3 && !curr.isKiller) {
          curr.isKiller = true;
          curr.becameKillerThisTurn = true;
          dartType = 'became_killer';
          dartDesc = `🔥 BECAME KILLER!`;
          setKillerToast(`${curr.name} IS NOW A KILLER!`);
          setTimeout(() => setKillerToast(null), 2500);
        } else {
          dartType = 'heart';
          dartDesc = `+${deltaHearts} ❤️ (${newHearts}/3)`;
        }
      } else {
        dartType = 'neutral';
        dartDesc = 'Own Sector (Already 3 ❤️)';
      }
    } else if (opponent) {
      targetName = opponent.name;
      if (curr.isKiller && !curr.becameKillerThisTurn) {
        const damage = multipliersCount ? multiplier : 1;
        if (opponent.hearts > 0) {
          if (opponent.hearts - damage > 0) {
            opponent.hearts -= damage;
            dartType = 'damage';
            dartDesc = `-${damage} ❤️ on ${opponent.name}`;
          } else if (opponent.hearts - damage === 0) {
            opponent.hearts = 0;
            dartType = 'damage';
            dartDesc = `${opponent.name} down to 0 ❤️ (1 hit from death!)`;
          } else {
            // Drops below 0 -> eliminated
            opponent.hearts = 0;
            opponent.isEliminated = true;
            curr.kills = (curr.kills || 0) + 1;
            dartType = 'kill';
            dartDesc = `💀 ELIMINATED ${opponent.name}!`;
            setKillerToast(`${opponent.name} ELIMINATED!`);
            setTimeout(() => setKillerToast(null), 2500);
          }
        } else {
          // Hit at 0 hearts -> eliminated
          opponent.isEliminated = true;
          curr.kills = (curr.kills || 0) + 1;
          dartType = 'kill';
          dartDesc = `💀 ELIMINATED ${opponent.name}!`;
          setKillerToast(`${opponent.name} ELIMINATED!`);
          setTimeout(() => setKillerToast(null), 2500);
        }
      } else if (curr.becameKillerThisTurn) {
        dartType = 'locked';
        dartDesc = 'Attacks unlock on your next turn!';
      } else {
        dartType = 'locked';
        dartDesc = 'Reach 3 hearts to become Killer!';
      }
    } else {
      dartType = 'miss';
      dartDesc = sector === 0 ? 'Miss (0)' : `Neutral Sector (${sector})`;
    }

    const recordedDart = {
      label,
      sector,
      multiplier,
      type: dartType,
      desc: dartDesc,
      deltaHearts,
      targetName,
      timestamp: Date.now()
    };

    const newDarts = [...turnDarts, recordedDart];
    curr.dartsThrown = (curr.dartsThrown || 0) + 1;

    setTurnDarts(newDarts);
    setPlayers(newPlayers);
    setLastActionToast(dartDesc);
    setTimeout(() => setLastActionToast(null), 1800);

    // Check if only 1 living player remains
    const living = newPlayers.filter(p => !p.isEliminated);
    if (living.length === 1 && newPlayers.length > 1) {
      setWinner(living[0]);
      handleMatchWin(living[0], newPlayers);
      return;
    }

    // AUTO-ADVANCE: If 3 darts thrown, automatically advance to next player after brief visual pause!
    if (newDarts.length >= 3) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNextPlayer(newPlayers, activeIdx, newDarts);
      }, 450);
    }
  };

  // Manual pass turn before throwing 3 darts
  const handlePassTurn = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    advanceToNextPlayer(players, activeIdx, turnDarts);
  };

  // Undo last action
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    const lastSnap = historyStack[historyStack.length - 1];
    setPlayers(lastSnap.players);
    setActiveIdx(lastSnap.activeIdx);
    setTurnDarts(lastSnap.turnDarts);
    setTurnHistory(lastSnap.turnHistory);
    setHistoryStack(prev => prev.slice(0, -1));
    setWinner(null);
    setLastActionToast('Undone');
    setTimeout(() => setLastActionToast(null), 1200);
  };

  const handleMatchWin = async (matchWinner, latestPlayers = players) => {
    setIsSaving(true);
    localStorage.removeItem('activeKillerGame');
    try {
      await submitMatchData(
        matchWinner.id,
        latestPlayers.map(p => p.id),
        {},
        turnHistory,
        0,
        'killer'
      );
      if (onMatchComplete) {
        await onMatchComplete();
      }
    } catch (e) {
      console.error('Error saving killer match:', e);
    }
  };

  if (isSaving || winner) {
    const finalWinner = winner || activePlayer;
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e17] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-rose-500/15 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_50px_rgba(244,63,94,0.5)] animate-bounce">
            <Trophy className="w-14 h-14 text-rose-400" />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 rounded-full p-2 border-2 border-[#0a0e17] shadow-lg">
            <Flame className="w-5 h-5 fill-current" />
          </div>
        </div>

        <span className="text-xs font-black tracking-widest uppercase text-rose-400 mb-1">
          Last Player Standing
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
          {finalWinner.name} Wins!
        </h1>
        <p className="text-slate-400 text-sm max-w-xs mb-8">
          The ultimate Killer. Eliminated all rivals and survived the board!
        </p>

        <div className="bg-[#131b2a] border border-white/10 rounded-2xl p-4 w-full max-w-sm mb-6 grid grid-cols-2 gap-3 text-left">
          <div className="bg-[#0a0e17] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Eliminations</span>
            <span className="text-2xl font-black text-rose-400">{finalWinner.kills || 0}</span>
          </div>
          <div className="bg-[#0a0e17] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Darts Thrown</span>
            <span className="text-2xl font-black text-teal-400">{finalWinner.dartsThrown || 0}</span>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('activeKillerGame');
            navigate('/');
          }}
          className="w-full max-w-sm py-4 rounded-2xl bg-[#00f0a8] hover:bg-[#00d694] text-[#0a0e17] font-black text-base uppercase tracking-wider shadow-[0_0_25px_rgba(0,240,168,0.35)] active:scale-95 transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#070b12] font-sans overflow-hidden select-none">
      {/* Top Header */}
      <DartFlowHeader
        showBack
        onBack={() => setShowExitModal(true)}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className="w-9 h-9 rounded-full bg-[#131b28] border border-white/10 hover:bg-[#1a2538] disabled:opacity-30 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Undo Last Dart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-9 h-9 rounded-full bg-[#131b28] border border-white/10 hover:bg-[#1a2538] flex items-center justify-center text-slate-300 hover:text-[#00f0a8] transition-all cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Floating Celebratory Banner */}
      {killerToast && (
        <div className="fixed top-16 inset-x-4 z-50 max-w-sm mx-auto bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-black py-2.5 px-4 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.6)] flex items-center justify-center gap-2 text-xs uppercase tracking-wider animate-in zoom-in-95 duration-200">
          <Flame className="w-4 h-4 fill-current animate-pulse text-amber-200" />
          <span>{killerToast}</span>
          <Skull className="w-4 h-4 fill-current text-white" />
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-1 flex flex-col justify-between overflow-hidden">
        
        {/* TOP HUD: Players Bar */}
        <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {players.map((p, idx) => {
            const isActive = activeIdx === idx;
            const isEliminated = p.isEliminated;
            const themeColor = p.theme?.accentHex || '#00f0a8';

            return (
              <div
                key={p.id || idx}
                onClick={() => {
                  if (!isEliminated) setActiveIdx(idx);
                }}
                className={clsx(
                  "flex-1 min-w-[85px] rounded-2xl p-2 flex flex-col items-center justify-between border-2 transition-colors duration-150 relative select-none",
                  isEliminated
                    ? "bg-[#0b1018]/60 border-white/5 opacity-35 grayscale"
                    : isActive
                      ? "bg-[#111928] shadow-[0_0_15px_rgba(0,240,168,0.25)] ring-1 ring-white/10 cursor-pointer"
                      : "bg-[#0d1420] border-white/10 opacity-75 hover:opacity-100 cursor-pointer"
                )}
                style={{
                  borderColor: isEliminated ? 'rgba(255,255,255,0.05)' : isActive ? themeColor : 'rgba(255,255,255,0.1)'
                }}
              >
                {/* Active arrow indicator */}
                {isActive && (
                  <div 
                    className="absolute -top-1.5 w-3 h-1.5 rounded-full"
                    style={{ backgroundColor: themeColor }}
                  />
                )}

                {/* Avatar & Name */}
                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                  <div 
                    className="w-6 h-6 rounded-full overflow-hidden border flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ borderColor: themeColor, backgroundColor: `${themeColor}20` }}
                  >
                    {p.pfpUrl ? (
                      <img src={p.pfpUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{p.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-extrabold text-white text-xs truncate max-w-[60px]">
                    {p.name.split(' ')[0]}
                  </span>
                </div>

                {/* Hearts row: 3 glowing hearts */}
                <div className="flex items-center justify-center gap-1 my-0.5">
                  {[0, 1, 2].map(hIdx => {
                    const isFilled = p.hearts > hIdx;
                    return (
                      <Heart
                        key={hIdx}
                        className={clsx(
                          "w-3.5 h-3.5 transition-all duration-300",
                          isFilled
                            ? "text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]"
                            : "text-slate-700 stroke-slate-600"
                        )}
                        strokeWidth={isFilled ? 0 : 2}
                      />
                    );
                  })}
                </div>

                {/* Slices badge / killer tag */}
                <div className="flex items-center gap-1 text-[10px] font-extrabold mt-0.5">
                  {p.isKiller && !isEliminated ? (
                    <span className="text-[9px] font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded-full border border-rose-500/30 flex items-center gap-0.5">
                      <Skull className="w-2.5 h-2.5" />
                      <span>KILLER</span>
                    </span>
                  ) : isEliminated ? (
                    <span className="text-[9px] font-bold text-slate-500 uppercase">DEAD</span>
                  ) : (
                    <span className="text-slate-400">
                      [{p.assignedSlices.join(', ')}]
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* TURN GUIDANCE & DARTS COUNTER BANNER */}
        <div className="bg-[#0e1624] border border-white/10 rounded-2xl px-3 py-2 flex items-center justify-between shadow-inner my-1">
          <div className="flex items-center gap-2 min-w-0">
            <div 
              className="w-2 h-2 rounded-full animate-ping shrink-0"
              style={{ backgroundColor: activePlayer?.theme?.accentHex || '#00f0a8' }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-white truncate">
                {activePlayer.isKiller ? (
                  activePlayer.becameKillerThisTurn ? (
                    <span className="text-amber-300">🔥 Killer Unlocked! Attacks begin on next turn</span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <Skull className="w-3.5 h-3.5 text-rose-500 inline" />
                      Tap glowing opponent slices to attack!
                    </span>
                  )
                ) : (
                  <span className="text-[#00f0a8]">
                    Tap your slice [{activePlayer.assignedSlices.join(', ')}] to fill hearts ({activePlayer.hearts}/3)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 3 Dart slots (D1, D2, D3) */}
          <div className="flex items-center gap-1 shrink-0 pl-2">
            {[0, 1, 2].map(idx => {
              const dart = turnDarts[idx];
              const isCurrent = turnDarts.length === idx;
              return (
                <div
                  key={idx}
                  className={clsx(
                    "w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] transition-all border",
                    dart
                      ? dart.type === 'kill'
                        ? 'bg-rose-500 border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                        : dart.type === 'heart' || dart.type === 'became_killer'
                          ? 'bg-[#00f0a8] border-teal-300 text-[#070b12] shadow-[0_0_8px_rgba(0,240,168,0.5)]'
                          : dart.type === 'damage'
                            ? 'bg-orange-500 border-orange-400 text-white'
                            : 'bg-[#1b2537] border-white/20 text-slate-300'
                      : isCurrent
                        ? 'border-[#00f0a8] text-[#00f0a8] animate-pulse bg-white/5'
                        : 'border-white/10 text-slate-600 bg-[#0a0f18]'
                  )}
                >
                  {dart ? (dart.type === 'kill' ? '💀' : dart.label) : idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-Opponent Focus Selector Chips when Killer */}
        {isEligibleToAttack && livingOpponents.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 my-1 overflow-x-auto no-scrollbar py-0.5 animate-in fade-in">
            <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1 shrink-0">
              <Skull className="w-3 h-3 text-rose-500" /> Focus Target:
            </span>
            {livingOpponents.map(opp => {
              const isFocused = (focusedOpponentId || livingOpponents[0]?.id) === opp.id;
              return (
                <button
                  key={opp.id}
                  onClick={() => setFocusedOpponentId(opp.id)}
                  className={clsx(
                    "px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border shrink-0",
                    isFocused
                      ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] scale-[1.03]"
                      : "bg-[#101827] text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                  )}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opp.theme?.accentHex || '#f43f5e' }} />
                  <span>{opp.name.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-75 font-mono">[{opp.assignedSlices.join(',')}]</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Slice Focus Selector Chips when Hunting Hearts with multiple slices */}
        {!isEligibleToAttack && (activePlayer?.assignedSlices?.length || 0) > 1 && (
          <div className="flex items-center justify-center gap-1.5 my-1 overflow-x-auto no-scrollbar py-0.5 animate-in fade-in">
            <span className="text-[10px] font-black uppercase text-[#00f0a8] flex items-center gap-1 shrink-0">
              <Target className="w-3 h-3 text-[#00f0a8]" /> Focus:
            </span>
            <button
              onClick={() => setFocusedSlice(null)}
              className={clsx(
                "px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border shrink-0",
                focusedSlice === null
                  ? "bg-[#00f0a8]/20 border-[#00f0a8] text-[#00f0a8] shadow-[0_0_12px_rgba(0,240,168,0.3)] scale-[1.03]"
                  : "bg-[#101827] text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
              )}
            >
              <span>All ({activePlayer.assignedSlices.join(',')})</span>
            </button>
            {activePlayer.assignedSlices.map(sliceNum => {
              const isSelected = focusedSlice === sliceNum;
              return (
                <button
                  key={sliceNum}
                  onClick={() => setFocusedSlice(sliceNum)}
                  className={clsx(
                    "px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border shrink-0",
                    isSelected
                      ? "bg-[#00f0a8]/20 border-[#00f0a8] text-[#00f0a8] shadow-[0_0_12px_rgba(0,240,168,0.3)] scale-[1.03]"
                      : "bg-[#101827] text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                  )}
                >
                  <span>Sector {sliceNum}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* HERO DARTBOARD (Direct 1-Tap & Smart Mini-Zoom on Targets) */}
        <div className="flex-1 flex items-center justify-center py-1">
          <KillerBoard
            sectorPlayerMap={sectorPlayerMap}
            activePlayerId={activePlayer.id}
            isKiller={activePlayer.isKiller}
            canAttack={isEligibleToAttack}
            activePlayerSlices={activePlayer.assignedSlices}
            targetSlices={targetSlices}
            isZoomEnabled={isZoomEnabled}
            onToggleZoom={() => setIsZoomEnabled(z => !z)}
            onHitSector={(sec) => {
              if (sec === 0) {
                handleHitSector(0, 0);
              } else {
                setHitDialogSector(sec);
              }
            }}
          />
        </div>

        {/* Action feedback toast slot (fixed height to prevent layout jump) */}
        <div className="h-5 flex items-center justify-center shrink-0">
          <div className={clsx("text-center text-xs font-black text-slate-200 transition-opacity duration-150", lastActionToast ? "opacity-100" : "opacity-0 select-none pointer-events-none")}>
            {lastActionToast || '-'}
          </div>
        </div>

        {/* BOTTOM CONTROLS: Miss, Hit (with 1x/2x/3x selector), Undo */}
        <div className="flex items-center justify-between gap-2.5 pt-1 pb-1">
          <button
            onClick={() => handleHitSector(0, 0)}
            disabled={turnDarts.length >= 3}
            className="px-4 py-3 bg-[#131b28] hover:bg-[#1a2538] active:bg-[#202b3d] disabled:opacity-25 rounded-2xl border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98] transition-colors duration-75 touch-manipulation select-none"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Miss</span>
          </button>

          <button
            onClick={() => primaryTargetSector && setHitDialogSector(primaryTargetSector)}
            disabled={turnDarts.length >= 3 || !primaryTargetSector}
            className={clsx(
              "flex-1 py-3 px-3 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] transition-all duration-75 touch-manipulation select-none disabled:opacity-25",
              isEligibleToAttack
                ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 border border-rose-400"
                : "bg-[#00f0a8] hover:bg-[#00d694] text-[#0a0e17] shadow-[#00f0a8]/30 border border-[#00f0a8]"
            )}
          >
            <Target className="w-4 h-4" />
            <span>
              {isEligibleToAttack 
                ? `HIT [${targetedOpponent?.name?.split(' ')[0] || 'Target'}: ${primaryTargetSector}]`
                : `HIT [Slice ${primaryTargetSector}]`
              }
            </span>
          </button>

          <button
            onClick={handleUndo}
            disabled={historyStack.length === 0}
            className="px-4 py-3 bg-[#131b28] hover:bg-[#1a2538] active:bg-[#202b3d] disabled:opacity-25 rounded-2xl border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] transition-colors duration-75 touch-manipulation select-none"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Undo</span>
          </button>
        </div>
      </div>

      {/* 1x / 2x / 3x Multiplier Selection Sheet */}
      {hitDialogSector !== null && (
        <div 
          className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setHitDialogSector(null)}
        >
          <div 
            className="bg-[#121927] border border-white/15 rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-black text-base border",
                  activePlayer.assignedSlices.includes(hitDialogSector)
                    ? "bg-[#00f0a8]/20 border-[#00f0a8]/50 text-[#00f0a8]"
                    : "bg-rose-500/20 border-rose-500/50 text-rose-400"
                )}>
                  {hitDialogSector}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    {activePlayer.assignedSlices.includes(hitDialogSector)
                      ? "Hit Your Slice!"
                      : targetOpponentForHit
                        ? `Attacking ${targetOpponentForHit.name}`
                        : `Hit Sector ${hitDialogSector}`}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Select dart multiplier
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setHitDialogSector(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1x, 2x, 3x Multiplier Buttons */}
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {[
                { 
                  mult: 1, 
                  title: '1x', 
                  sub: 'Single', 
                  badge: activePlayer.assignedSlices.includes(hitDialogSector) ? '+1 ❤️' : '-1 ❤️',
                  color: 'border-white/10 bg-[#172133] hover:border-[#00f0a8]/50 hover:bg-[#1c293f] text-white' 
                },
                { 
                  mult: 2, 
                  title: '2x', 
                  sub: 'Double', 
                  badge: activePlayer.assignedSlices.includes(hitDialogSector) ? '+2 ❤️' : '-2 ❤️',
                  color: 'border-[#00f0a8]/40 bg-[#0e2723] hover:border-[#00f0a8] text-[#00f0a8]' 
                },
                { 
                  mult: 3, 
                  title: '3x', 
                  sub: 'Triple', 
                  badge: activePlayer.assignedSlices.includes(hitDialogSector) ? '+3 ❤️' : '-3 ❤️',
                  color: 'border-amber-500/40 bg-[#281d11] hover:border-amber-400 text-amber-300' 
                }
              ].map(opt => (
                <button
                  key={opt.mult}
                  onClick={() => {
                    handleHitSector(hitDialogSector, opt.mult);
                    setHitDialogSector(null);
                  }}
                  className={clsx(
                    "py-3.5 px-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all cursor-pointer shadow-md",
                    opt.color
                  )}
                >
                  <span className="text-2xl font-black leading-none">{opt.title}</span>
                  <span className="text-[11px] font-bold tracking-tight opacity-90">{opt.sub}</span>
                  <span className="text-[10px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
                    {opt.badge}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setHitDialogSector(null)}
              className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] bg-[#070b12]/90 backdrop-blur-md flex items-center justify-center p-5">
          <div className="bg-[#121927] border border-white/10 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white">Match Settings</h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0a0f18] p-3 rounded-2xl border border-white/5 flex flex-col gap-2 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Game Mode:</span>
                <span className="text-white font-bold uppercase">Killer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Difficulty:</span>
                <span className="text-white font-bold capitalize">{difficulty} ({slicesPerPlayer} slice{slicesPerPlayer > 1 ? 's' : ''})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Multipliers:</span>
                <span className="text-[#00f0a8] font-bold">{multipliersCount ? 'ON (D=2, T=3)' : 'OFF (1 heart)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auto-Turn Advance:</span>
                <span className="text-[#00f0a8] font-bold">Enabled (3 Darts)</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSettingsModal(false);
                setShowExitModal(true);
              }}
              className="w-full bg-rose-500/20 text-rose-400 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-500/30 transition-all cursor-pointer"
            >
              End Match
            </button>
          </div>
        </div>
      )}

      {/* Exit Match Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[250] bg-[#070b12]/90 backdrop-blur-md flex items-center justify-center p-5">
          <div className="bg-[#121927] p-8 rounded-3xl text-center max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in-95 duration-150">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Leave Match?</h2>
            <p className="text-slate-400 text-xs mb-6">
              Current match progress will be discarded. Are you sure?
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('activeKillerGame');
                navigate('/');
              }}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl font-bold mb-3 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              Yes, Exit Match
            </button>
            <button
              onClick={() => setShowExitModal(false)}
              className="w-full text-slate-400 hover:text-white py-2 text-xs font-bold transition-all cursor-pointer"
            >
              Keep Playing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
