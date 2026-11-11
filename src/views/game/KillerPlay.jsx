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
  const [showMultiplierMenu, setShowMultiplierMenu] = useState(false);

  const autoAdvanceTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

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
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  if (!isNewGame && !savedGame) {
    return <Navigate to="/game" />;
  }

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
      return Array.isArray(activePlayer?.assignedSlices) ? activePlayer.assignedSlices : [];
    }
    if (livingOpponents.length === 0) return [];
    if (focusedOpponentId) {
      const opp = livingOpponents.find(p => p.id === focusedOpponentId);
      if (opp && Array.isArray(opp.assignedSlices) && opp.assignedSlices.length > 0) {
        return opp.assignedSlices;
      }
    }
    return Array.isArray(livingOpponents[0]?.assignedSlices) ? livingOpponents[0].assignedSlices : [];
  }, [isEligibleToAttack, activePlayer, livingOpponents, focusedOpponentId]);

  const primarySector = useMemo(() => {
    return Array.isArray(activePlayer?.assignedSlices) && activePlayer.assignedSlices.length > 0
      ? activePlayer.assignedSlices[0]
      : 20;
  }, [activePlayer]);

  const focusedOpponent = useMemo(() => {
    if (livingOpponents.length === 0) return null;
    return livingOpponents.find(p => p.id === (focusedOpponentId || livingOpponents[0]?.id)) || livingOpponents[0];
  }, [livingOpponents, focusedOpponentId]);

  const attackSector = useMemo(() => {
    if (Array.isArray(targetSlices) && targetSlices.length > 0) {
      return targetSlices[0];
    }
    return focusedOpponent?.assignedSlices?.[0] || 20;
  }, [targetSlices, focusedOpponent]);

  // Pointer event handlers for HIT button (Tap = 1x single hit; Long hold = slide up 2x/3x menu when hitting self)
  const handleHitPointerDown = (e) => {
    if (turnDarts.length >= 3 || winner || isSaving) return;
    isLongPressTriggeredRef.current = false;
    // Long hold only triggers when hitting yourself!
    if (!isEligibleToAttack) {
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(40); } catch(err) {}
        }
        setShowMultiplierMenu(true);
      }, 350);
    }
  };

  const handleHitPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressTriggeredRef.current) {
      return;
    }
    const sec = isEligibleToAttack ? attackSector : primarySector;
    if (sec !== null && sec !== undefined) {
      handleHitSector(sec, 1);
    }
  };

  const handleHitPointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Function to advance turn to next living player
  const advanceToNextPlayer = (updatedPlayers, currentIdx, completedDarts) => {
    setShowMultiplierMenu(false);
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

    // Advance to next active (living) player with bounded loop
    let next = (currentIdx + 1) % nextPlayers.length;
    let attempts = 0;
    while (nextPlayers[next]?.isEliminated && attempts < nextPlayers.length) {
      next = (next + 1) % nextPlayers.length;
      attempts++;
    }

    if (attempts >= nextPlayers.length) {
      const matchWinner = living[0] || curr;
      setWinner(matchWinner);
      setPlayers(nextPlayers);
      handleMatchWin(matchWinner, nextPlayers);
      return;
    }

    setActiveIdx(next);
    setTurnDarts([]);
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

    const isOwn = Array.isArray(curr?.assignedSlices) && curr.assignedSlices.includes(sector);
    const opponent = newPlayers.find(
      p => p.id !== curr?.id && !p.isEliminated && Array.isArray(p.assignedSlices) && p.assignedSlices.includes(sector)
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

  // Undo last action
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    setShowMultiplierMenu(false);
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    const lastSnap = historyStack[historyStack.length - 1];
    if (!lastSnap) return;
    setPlayers(lastSnap.players || []);
    setActiveIdx(lastSnap.activeIdx ?? 0);
    setTurnDarts(lastSnap.turnDarts || []);
    setTurnHistory(lastSnap.turnHistory || []);
    setHistoryStack(prev => prev.slice(0, -1));
    setWinner(null);
    setIsSaving(false);
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
                  if (!isEliminated) {
                    if (autoAdvanceTimerRef.current) {
                      clearTimeout(autoAdvanceTimerRef.current);
                      autoAdvanceTimerRef.current = null;
                    }
                    setActiveIdx(idx);
                    setTurnDarts([]);
                  }
                }}
                className={clsx(
                  "flex-1 min-w-[85px] rounded-2xl p-2 flex flex-col items-center justify-between border-2 transition-all duration-300 relative select-none",
                  isEliminated
                    ? "bg-[#0b1018]/60 border-white/5 opacity-35 grayscale"
                    : isActive
                      ? "bg-[#111928] scale-[1.02] shadow-[0_0_15px_rgba(0,240,168,0.25)] cursor-pointer"
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
                      <span>{(p.name || 'P').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-extrabold text-white text-xs truncate max-w-[60px]">
                    {p?.name ? p.name.split(' ')[0] : 'Player'}
                  </span>
                </div>

                {/* Hearts row: 3 glowing hearts */}
                <div className="flex items-center justify-center gap-1 my-0.5">
                  {[0, 1, 2].map(hIdx => {
                    const isFilled = (p.hearts ?? 0) > hIdx;
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
                      [{Array.isArray(p.assignedSlices) ? p.assignedSlices.join(', ') : ''}]
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
                    Tap your slice [{Array.isArray(activePlayer?.assignedSlices) ? activePlayer.assignedSlices.join(', ') : ''}] to fill hearts ({activePlayer?.hearts ?? 0}/3)
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
                  <span>{opp?.name ? opp.name.split(' ')[0] : 'Player'}</span>
                  <span className="text-[10px] opacity-75 font-mono">[{Array.isArray(opp?.assignedSlices) ? opp.assignedSlices.join(',') : ''}]</span>
                </button>
              );
            })}
          </div>
        )}

        {/* HERO DARTBOARD (Direct 1-Tap & Smart Mini-Zoom on Targets) */}
        <div className="flex-1 flex items-center justify-center py-1">
          <KillerBoard
            sectorPlayerMap={sectorPlayerMap}
            activePlayerId={activePlayer?.id}
            isKiller={!!activePlayer?.isKiller}
            canAttack={isEligibleToAttack}
            activePlayerSlices={Array.isArray(activePlayer?.assignedSlices) ? activePlayer.assignedSlices : []}
            targetSlices={targetSlices}
            isZoomEnabled={isZoomEnabled}
            onToggleZoom={() => setIsZoomEnabled(z => !z)}
            onHitSector={handleHitSector}
          />
        </div>

        {/* Action feedback toast */}
        {lastActionToast && (
          <div className="text-center text-xs font-black text-slate-200 py-0.5 animate-in fade-in">
            {lastActionToast}
          </div>
        )}

        {/* BOTTOM CONTROLS (Miss, Undo, HIT Button) */}
        <div className="flex items-center gap-2.5 pt-1 pb-1">
          {/* Miss Button */}
          <button
            onClick={() => handleHitSector(0, 0)}
            disabled={turnDarts.length >= 3 || isSaving || !!winner}
            className="w-14 sm:w-16 py-3 bg-[#131b28] hover:bg-[#1a2538] disabled:opacity-25 active:scale-95 transition-all rounded-2xl border border-white/10 text-rose-400 hover:text-rose-300 font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md shrink-0"
            title="Miss Dart (0)"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span className="text-[10px]">Miss</span>
          </button>

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={historyStack.length === 0 || isSaving}
            className="w-14 sm:w-16 py-3 bg-[#131b28] hover:bg-[#1a2538] disabled:opacity-25 active:scale-95 transition-all rounded-2xl border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md shrink-0"
            title="Undo Last Dart"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-[10px]">Undo</span>
          </button>

          {/* HIT BUTTON */}
          <button
            onPointerDown={handleHitPointerDown}
            onPointerUp={handleHitPointerUp}
            onPointerLeave={handleHitPointerLeave}
            onPointerCancel={handleHitPointerLeave}
            onContextMenu={(e) => e.preventDefault()}
            disabled={turnDarts.length >= 3 || isSaving || !!winner}
            className={clsx(
              "flex-1 py-3 px-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 select-none active:scale-[0.97] cursor-pointer shadow-lg",
              turnDarts.length >= 3
                ? "bg-[#131b28] text-slate-500 border border-white/5 opacity-40 cursor-not-allowed"
                : isEligibleToAttack
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] border border-rose-400/40"
                  : "bg-gradient-to-r from-[#00f0a8] to-[#2dd4bf] hover:from-[#00d694] hover:to-[#14b8a6] text-[#070b12] shadow-[0_0_20px_rgba(0,240,168,0.35)]"
            )}
          >
            {isEligibleToAttack ? (
              <>
                <Skull className="w-4 h-4 fill-current shrink-0" />
                <span className="truncate">
                  Attack {focusedOpponent?.name ? focusedOpponent.name.split(' ')[0] : 'Target'} [{attackSector}]
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="truncate">Hit [{primarySector}]</span>
                <span className="text-[9px] font-extrabold opacity-75 lowercase tracking-normal bg-black/20 px-1.5 py-0.5 rounded-md hidden xs:inline">
                  hold: 2x/3x
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Slide-Up Multiplier Mini Menu (When long-holding on Hit button for self) */}
      {showMultiplierMenu && (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0"
            onClick={() => setShowMultiplierMenu(false)}
          />
          <div className="relative w-full max-w-md mx-auto bg-[#0d1522] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-250 z-10">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-[#0a0e17]"
                  style={{ backgroundColor: activePlayer?.theme?.accentHex || '#00f0a8' }}
                >
                  {primarySector}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Select Sector Ring</h3>
                  <p className="text-[11px] text-slate-400">Gains hearts for {activePlayer?.name ? activePlayer.name.split(' ')[0] : 'Player'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMultiplierMenu(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Single (1x) */}
              <button
                onClick={() => {
                  handleHitSector(primarySector, 1);
                  setShowMultiplierMenu(false);
                }}
                className="py-3 px-2 bg-[#141d2c] hover:bg-[#1a2538] border border-white/10 hover:border-white/20 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-slate-200">Single</span>
                <span className="text-xl font-black text-white">S{primarySector}</span>
                <span className="text-[11px] font-black text-[#00f0a8] bg-[#00f0a8]/10 px-2 py-0.5 rounded-full border border-[#00f0a8]/20">+1 ❤️</span>
              </button>

              {/* Double (2x) */}
              <button
                onClick={() => {
                  handleHitSector(primarySector, 2);
                  setShowMultiplierMenu(false);
                }}
                className="py-3 px-2 bg-[#15222c] hover:bg-[#1b2b38] border border-[#5eead4]/30 hover:border-[#5eead4] rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer group shadow-[0_0_15px_rgba(94,234,212,0.15)]"
              >
                <span className="text-[10px] font-bold uppercase text-teal-300">Double</span>
                <span className="text-xl font-black text-white">D{primarySector}</span>
                <span className="text-[11px] font-black text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">+2 ❤️</span>
              </button>

              {/* Triple (3x) */}
              <button
                onClick={() => {
                  handleHitSector(primarySector, 3);
                  setShowMultiplierMenu(false);
                }}
                className="py-3 px-2 bg-gradient-to-b from-amber-500/15 to-[#00f0a8]/15 hover:from-amber-500/25 hover:to-[#00f0a8]/25 border border-amber-400/40 hover:border-amber-400 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer group shadow-[0_0_20px_rgba(251,191,36,0.2)]"
              >
                <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-current" /> Triple
                </span>
                <span className="text-xl font-black text-white">T{primarySector}</span>
                <span className="text-[11px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40">+3 ❤️ (Killer)</span>
              </button>
            </div>
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
