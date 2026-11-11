import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Trophy, RotateCcw, X, AlertTriangle, Settings, Target, Flame, Check, Compass, Zap
} from 'lucide-react';
import DartFlowHeader from '../../components/DartFlowHeader';
import InteractiveDartboard from '../../components/InteractiveDartboard';
import { 
  CLOCK_TARGETS, 
  CLOCK_TARGET_LABELS, 
  PLAYER_THEMES 
} from '../../utils/aroundTheClockUtils';
import { submitMatchData } from '../../firebase/db';
import clsx from 'clsx';

export default function AroundTheClockPlay({ onMatchComplete }) {
  const location = useLocation();
  const navigate = useNavigate();

  const savedGameStr = localStorage.getItem('activeAroundTheClockGame');
  const savedGame = savedGameStr ? JSON.parse(savedGameStr) : null;
  const isNewGame = !!location.state?.selectedPlayers;

  // Initialize players
  const [players, setPlayers] = useState(() => {
    if (isNewGame) {
      const rawPlayers = location.state.selectedPlayers || [];
      return rawPlayers.map((p, idx) => ({
        id: p.id || `player_${idx}`,
        name: p.name || `Player ${idx + 1}`,
        theme: PLAYER_THEMES[idx % PLAYER_THEMES.length],
        currentTargetIdx: 0, // index in CLOCK_TARGETS (0 = 1, 19 = 20, 20 = 25/Bull)
        totalDarts: 0,
        hits: 0
      }));
    }
    return savedGame?.players || [];
  });

  const [activeIdx, setActiveIdx] = useState(isNewGame ? 0 : savedGame?.activeIdx || 0);
  const [turnDarts, setTurnDarts] = useState(isNewGame ? [] : savedGame?.turnDarts || []);
  const [historyStack, setHistoryStack] = useState([]);
  const [turnHistory, setTurnHistory] = useState(isNewGame ? [] : savedGame?.turnHistory || []);
  const [inputMethod, setInputMethod] = useState(() => localStorage.getItem('atc_input_method') || 'keypad');
  const [bonusSkips, setBonusSkips] = useState(true); // Double = +2, Triple = +3

  const [currentRound, setCurrentRound] = useState(isNewGame ? 1 : savedGame?.currentRound || 1);
  const [winConfirm, setWinConfirm] = useState(null); // Confirmation modal for winning hit: { isHit, multiplier, dartLabel }
  const [isSuddenDeath, setIsSuddenDeath] = useState(isNewGame ? false : savedGame?.isSuddenDeath || false);
  const [suddenDeathScores, setSuddenDeathScores] = useState(isNewGame ? {} : savedGame?.suddenDeathScores || {});
  const [suddenDeathPlayers, setSuddenDeathPlayers] = useState(isNewGame ? [] : savedGame?.suddenDeathPlayers || []);
  const [roundStatusBanner, setRoundStatusBanner] = useState(null);

  const [winner, setWinner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const autoAdvanceTimerRef = useRef(null);
  const trackRef = useRef(null);

  // Persist game state safely without historyStack to prevent QuotaExceededError
  useEffect(() => {
    if (players.length > 0 && !isSaving && !winner) {
      try {
        localStorage.setItem('activeAroundTheClockGame', JSON.stringify({
          players,
          activeIdx,
          turnDarts,
          turnHistory,
          currentRound,
          isSuddenDeath,
          suddenDeathScores,
          suddenDeathPlayers
        }));
      } catch (err) {
        console.warn('ATC localStorage save warning:', err);
      }
    }
  }, [players, activeIdx, turnDarts, turnHistory, currentRound, isSuddenDeath, suddenDeathScores, suddenDeathPlayers, isSaving, winner]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  // Auto-scroll target track to current active player's target
  useEffect(() => {
    if (trackRef.current) {
      const activeP = players[activeIdx];
      const targetElem = trackRef.current.children[activeP?.currentTargetIdx || 0];
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeIdx, players]);

  if (!isNewGame && !savedGame) {
    return <Navigate to="/game" />;
  }

  const activePlayer = players[activeIdx] || players[0];
  const currentTargetNumber = CLOCK_TARGETS[activePlayer?.currentTargetIdx || 0];
  const currentTargetLabel = CLOCK_TARGET_LABELS[currentTargetNumber] || '1';

  const handleMatchWin = async (matchWinner, finalPlayers = players) => {
    setIsSaving(true);
    localStorage.removeItem('activeAroundTheClockGame');
    try {
      await submitMatchData(
        matchWinner.id,
        finalPlayers.map(p => p.id),
        {},
        turnHistory,
        'Around the Clock',
        'around_the_clock'
      );
      if (onMatchComplete) {
        await onMatchComplete();
      }
    } catch (e) {
      console.error('Error saving Around the Clock match:', e);
    }
  };

  const evaluateRoundEnd = (updatedPlayers, roundNum) => {
    const finished = updatedPlayers.filter(p => p.isFinished);
    if (finished.length === 0) return;

    if (finished.length === 1) {
      const matchWinner = finished[0];
      setWinner(matchWinner);
      setPlayers(updatedPlayers);
      handleMatchWin(matchWinner, updatedPlayers);
      return;
    }

    // Multiple players finished in this round! Compare total darts taken (fewest darts wins)
    const minDarts = Math.min(...finished.map(p => p.finishedTotalDarts || p.totalDarts));
    const tiedFewest = finished.filter(p => (p.finishedTotalDarts || p.totalDarts) === minDarts);

    if (tiedFewest.length === 1) {
      const matchWinner = tiedFewest[0];
      setWinner(matchWinner);
      setPlayers(updatedPlayers);
      handleMatchWin(matchWinner, updatedPlayers);
      return;
    }

    // Exact tie on darts! Start Sudden Death Bull-Off (3 darts at Bullseye)
    setIsSuddenDeath(true);
    const sdIndices = tiedFewest.map(w => updatedPlayers.findIndex(p => p.id === w.id));
    setSuddenDeathPlayers(sdIndices);
    setSuddenDeathScores({});
    setActiveIdx(sdIndices[0]);
    setTurnDarts([]);
    setRoundStatusBanner('⚡ Tied in Darts! SUDDEN DEATH BULL-OFF ⚡');
    setToastMessage('⚡ SUDDEN DEATH BULL-OFF ⚡');
  };

  const advanceToNextPlayer = (updatedPlayers, currentIdx, completedDarts, customSDScores = null) => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    const nextPlayers = JSON.parse(JSON.stringify(updatedPlayers));
    const curr = nextPlayers[currentIdx];

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

    const activeScores = customSDScores || suddenDeathScores;

    if (isSuddenDeath) {
      const isSDRoundEnd = currentIdx === suddenDeathPlayers[suddenDeathPlayers.length - 1];
      if (isSDRoundEnd) {
        let maxSD = -1;
        let sdWinners = [];
        suddenDeathPlayers.forEach(pIdx => {
          const s = activeScores[pIdx] || 0;
          if (s > maxSD) {
            maxSD = s;
            sdWinners = [pIdx];
          } else if (s === maxSD && s !== -1) {
            sdWinners.push(pIdx);
          }
        });

        if (sdWinners.length === 1) {
          const sdWinner = nextPlayers[sdWinners[0]];
          setWinner(sdWinner);
          setPlayers(nextPlayers);
          handleMatchWin(sdWinner, nextPlayers);
          return;
        } else if (sdWinners.length > 1) {
          // Still tied, start next sudden death round
          setSuddenDeathScores({});
          setSuddenDeathPlayers(sdWinners);
          setActiveIdx(sdWinners[0]);
          setTurnDarts([]);
          setToastMessage('⚡ Still Tied! Next Sudden Death Round ⚡');
          return;
        }
      }

      const currPos = suddenDeathPlayers.indexOf(currentIdx);
      const nextSDIdx = suddenDeathPlayers[(currPos + 1) % suddenDeathPlayers.length];
      setActiveIdx(nextSDIdx);
      setTurnDarts([]);
      setPlayers(nextPlayers);
      return;
    }

    const isRoundEnd = currentIdx === nextPlayers.length - 1;

    if (isRoundEnd) {
      // Check if any player finished in this round
      const finished = nextPlayers.filter(p => p.isFinished);
      if (finished.length > 0) {
        evaluateRoundEnd(nextPlayers, currentRound);
        return;
      }
      setCurrentRound(r => r + 1);
      setRoundStatusBanner(null);
    }

    // Skip any players who are already finished
    let nextIdx = (currentIdx + 1) % nextPlayers.length;
    while (nextPlayers[nextIdx]?.isFinished && nextPlayers.some(p => !p.isFinished)) {
      nextIdx = (nextIdx + 1) % nextPlayers.length;
    }

    setActiveIdx(nextIdx);
    setTurnDarts([]);
    setPlayers(nextPlayers);
  };

  const applyConfirmedFinalDart = (isHit, multiplier, dartLabel) => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    const snapshot = {
      players: JSON.parse(JSON.stringify(players)),
      activeIdx,
      turnDarts: [...turnDarts],
      currentRound,
      isSuddenDeath: false,
      suddenDeathScores: {},
      suddenDeathPlayers: []
    };
    setHistoryStack(prev => [...prev.slice(-9), snapshot]);

    const updatedPlayers = JSON.parse(JSON.stringify(players));
    const curr = updatedPlayers[activeIdx];
    curr.totalDarts = (curr.totalDarts || 0) + 1;
    curr.hits = (curr.hits || 0) + 1;
    curr.currentTargetIdx = CLOCK_TARGETS.length; // 21 (Completed clock)
    curr.isFinished = true;
    curr.finishedTotalDarts = curr.totalDarts;
    curr.finishedAtRound = currentRound;

    const recordedDart = {
      isHit: true,
      multiplier,
      label: dartLabel || 'Bull',
      desc: 'BULLSEYE! Clock Finished!'
    };

    const newTurnDarts = [...turnDarts, recordedDart];
    setTurnDarts(newTurnDarts);
    setPlayers(updatedPlayers);
    setToastMessage('BULLSEYE! Finished!');

    const isRoundEnd = activeIdx === updatedPlayers.length - 1;

    if (!isRoundEnd) {
      // Other player(s) in this round still get their equal turn to finish!
      setRoundStatusBanner(`🎯 ${curr.name} finished! Other players get this round to match!`);
      const nextIdx = (activeIdx + 1) % updatedPlayers.length;
      autoAdvanceTimerRef.current = setTimeout(() => {
        setTurnHistory(prev => [
          ...prev,
          {
            playerId: curr.id,
            playerName: curr.name,
            darts: [...newTurnDarts],
            timestamp: Date.now()
          }
        ]);
        setActiveIdx(nextIdx);
        setTurnDarts([]);
      }, 1000);
      return;
    }

    // Round complete! Evaluate final standings
    autoAdvanceTimerRef.current = setTimeout(() => {
      setTurnHistory(prev => [
        ...prev,
        {
          playerId: curr.id,
          playerName: curr.name,
          darts: [...newTurnDarts],
          timestamp: Date.now()
        }
      ]);
      evaluateRoundEnd(updatedPlayers, currentRound);
    }, 600);
  };

  const registerSuddenDeathDart = (pts, label) => {
    if (turnDarts.length >= 3 || winner || isSaving) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    const snapshot = {
      players: JSON.parse(JSON.stringify(players)),
      activeIdx,
      turnDarts: [...turnDarts],
      currentRound,
      isSuddenDeath: true,
      suddenDeathScores: { ...suddenDeathScores },
      suddenDeathPlayers: [...suddenDeathPlayers]
    };
    setHistoryStack(prev => [...prev.slice(-9), snapshot]);

    const newScores = {
      ...suddenDeathScores,
      [activeIdx]: (suddenDeathScores[activeIdx] || 0) + pts
    };
    setSuddenDeathScores(newScores);

    const recordedDart = {
      isHit: pts > 0,
      multiplier: pts,
      label,
      desc: pts > 0 ? `BULL +${pts}` : 'Miss'
    };

    const newTurnDarts = [...turnDarts, recordedDart];
    setTurnDarts(newTurnDarts);
    setToastMessage(recordedDart.desc);
    setTimeout(() => setToastMessage(null), 1000);

    if (newTurnDarts.length === 3) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNextPlayer(players, activeIdx, newTurnDarts, newScores);
      }, 700);
    }
  };

  const registerDart = (isHit, multiplier = 1, dartLabel = null) => {
    if (turnDarts.length >= 3 || winner || isSaving) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    if (isSuddenDeath) {
      const pts = isHit ? multiplier : 0;
      registerSuddenDeathDart(pts, dartLabel || (isHit ? (multiplier === 2 ? 'D-Bull (2)' : 'Bull (1)') : 'Miss'));
      return;
    }

    const curr = players[activeIdx];
    if (isHit) {
      const advanceBy = bonusSkips ? Math.min(multiplier, 3) : 1;
      const targetAfterHit = (curr?.currentTargetIdx || 0) + advanceBy;

      if (targetAfterHit >= CLOCK_TARGETS.length) {
        // Winning hit on final target! Prompt confirmation first (no accidental wins)
        setWinConfirm({ isHit, multiplier, dartLabel });
        return;
      }
    }

    // Normal dart registration
    const snapshot = {
      players: JSON.parse(JSON.stringify(players)),
      activeIdx,
      turnDarts: [...turnDarts],
      currentRound,
      isSuddenDeath: false,
      suddenDeathScores: {},
      suddenDeathPlayers: []
    };
    setHistoryStack(prev => [...prev.slice(-9), snapshot]);

    const updatedPlayers = JSON.parse(JSON.stringify(players));
    const p = updatedPlayers[activeIdx];

    p.totalDarts = (p.totalDarts || 0) + 1;
    let desc = 'Miss';
    let label = 'Miss';

    if (isHit) {
      p.hits = (p.hits || 0) + 1;
      const advanceBy = bonusSkips ? Math.min(multiplier, 3) : 1;
      const prevTargetLabel = CLOCK_TARGET_LABELS[CLOCK_TARGETS[p.currentTargetIdx]];
      const prefix = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S';

      label = dartLabel || `${prefix}${prevTargetLabel}`;
      desc = `HIT ${label}! (+${advanceBy})`;
      p.currentTargetIdx += advanceBy;
    }

    const recordedDart = {
      isHit,
      multiplier,
      label,
      desc
    };

    const newTurnDarts = [...turnDarts, recordedDart];
    setTurnDarts(newTurnDarts);
    setPlayers(updatedPlayers);

    setToastMessage(desc);
    setTimeout(() => setToastMessage(null), 1100);

    // Auto advance if 3 darts thrown
    if (newTurnDarts.length === 3) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNextPlayer(updatedPlayers, activeIdx, newTurnDarts);
      }, 700);
    }
  };

  const handleDartboardHit = (recordedDart) => {
    if (isSuddenDeath) {
      if (recordedDart.value === 50 || recordedDart.score === 50 || (recordedDart.value === 25 && recordedDart.multiplier === 2)) {
        registerSuddenDeathDart(2, 'D-Bull (2)');
      } else if (recordedDart.value === 25 || recordedDart.score === 25) {
        registerSuddenDeathDart(1, 'Bull (1)');
      } else {
        registerSuddenDeathDart(0, 'Miss');
      }
      return;
    }

    const currentTargetVal = CLOCK_TARGETS[activePlayer?.currentTargetIdx || 0];
    let isMatch = false;

    if (currentTargetVal === 25) {
      // Bull target
      if (recordedDart.value === 25 || recordedDart.score === 50 || recordedDart.value === 50) {
        isMatch = true;
      }
    } else {
      if (recordedDart.value === currentTargetVal) {
        isMatch = true;
      }
    }

    registerDart(isMatch, recordedDart.multiplier || 1, recordedDart.label);
  };

  const handleUndo = () => {
    if (historyStack.length === 0 || isSaving) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    const lastSnap = historyStack[historyStack.length - 1];
    setPlayers(lastSnap.players);
    setActiveIdx(lastSnap.activeIdx);
    setTurnDarts(lastSnap.turnDarts);
    if (lastSnap.currentRound !== undefined) setCurrentRound(lastSnap.currentRound);
    if (lastSnap.isSuddenDeath !== undefined) setIsSuddenDeath(lastSnap.isSuddenDeath);
    if (lastSnap.suddenDeathScores !== undefined) setSuddenDeathScores(lastSnap.suddenDeathScores);
    if (lastSnap.suddenDeathPlayers !== undefined) setSuddenDeathPlayers(lastSnap.suddenDeathPlayers);
    setHistoryStack(prev => prev.slice(0, -1));
    setWinner(null);
    setWinConfirm(null);
    setRoundStatusBanner(null);
    setToastMessage('Undone');
    setTimeout(() => setToastMessage(null), 1000);
  };

  if (isSaving || winner) {
    const finalWinner = winner || activePlayer;
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e17] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-cyan-500/15 border-2 border-cyan-500 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.5)] animate-bounce">
            <Trophy className="w-14 h-14 text-cyan-400" />
          </div>
          <div className="absolute -top-1 -right-1 bg-[#00f0a8] text-slate-900 rounded-full p-2 border-2 border-[#0a0e17] shadow-lg">
            <Compass className="w-5 h-5 fill-current" />
          </div>
        </div>

        <span className="text-xs font-black tracking-widest uppercase text-cyan-400 mb-1">
          Around The Clock Winner!
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
          {finalWinner.name}
        </h1>
        <p className="text-slate-400 text-sm font-semibold mb-2">
          Completed in <span className="text-cyan-300 font-black">{finalWinner.totalDarts} darts</span> • {finalWinner.hits} hits ({((finalWinner.hits / (finalWinner.totalDarts || 1)) * 100).toFixed(0)}% accuracy)
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/game')}
            className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#070b12] font-sans flex flex-col select-none overflow-hidden">
      {/* Header */}
      <DartFlowHeader
        showBack
        onBack={() => setShowExitModal(true)}
        rightAction={
          <div className="flex items-center gap-2">
            <span className={clsx(
              "text-xs font-black px-2.5 py-1 rounded-xl border",
              isSuddenDeath
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
            )}>
              {isSuddenDeath ? '⚡ Sudden Death' : `Round ${currentRound}`}
            </span>
            <button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className="w-9 h-9 rounded-full bg-[#161f30] border border-white/10 hover:bg-[#1f2b42] disabled:opacity-30 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-9 h-9 rounded-full bg-[#161f30] border border-white/10 hover:bg-[#1f2b42] flex items-center justify-center text-slate-300 hover:text-[#00f0a8] transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Round Status Banner (when a player finished and other has this round to catch up) */}
      {roundStatusBanner && (
        <div className="bg-gradient-to-r from-cyan-950 via-teal-900 to-cyan-950 border-b border-cyan-500/40 py-1.5 px-4 text-center text-xs font-black text-cyan-200 tracking-wide animate-in fade-in">
          {roundStatusBanner}
        </div>
      )}

      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-2 flex flex-col justify-between overflow-hidden gap-2">
        {/* Players Strip */}
        <div className="grid grid-cols-2 gap-2.5 w-full shrink-0">
          {players.map((p, idx) => {
            const isActive = activeIdx === idx;
            const theme = p.theme || PLAYER_THEMES[idx % PLAYER_THEMES.length];
            const pTarget = CLOCK_TARGET_LABELS[CLOCK_TARGETS[p.currentTargetIdx]] || 'DONE';
            const progressPct = Math.min(100, Math.round((p.currentTargetIdx / CLOCK_TARGETS.length) * 100));

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (turnDarts.length === 0) setActiveIdx(idx);
                }}
                className={clsx(
                  "relative rounded-2xl p-2.5 flex flex-col justify-between border-2 transition-colors duration-150 cursor-pointer overflow-hidden",
                  isActive
                    ? `${theme.border} ${theme.cardBgActive} ${theme.activeGlow} z-10 ring-1 ring-white/10`
                    : `${theme.borderInactive} ${theme.cardBgInactive} opacity-75 hover:opacity-100`
                )}
              >
                {isActive && <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: theme.accentHex }} />}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={clsx("w-4 h-4 rounded-md font-black text-[10px] flex items-center justify-center shrink-0", theme.badgeBg, theme.badgeText)}>
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-white text-xs truncate">{(p.name || 'Player').split(' ')[0]}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {p.isFinished ? 'DONE' : `${progressPct}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between my-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {isSuddenDeath ? 'SD Points' : p.isFinished ? 'Status' : 'Target'}
                    </span>
                    <span className={clsx(
                      "font-black leading-none",
                      p.isFinished ? "text-xs text-[#00f0a8]" : "text-2xl text-cyan-300"
                    )}>
                      {isSuddenDeath 
                        ? `${suddenDeathScores[idx] || 0} pts`
                        : p.isFinished 
                          ? `✓ Done (${p.finishedTotalDarts || p.totalDarts} darts)`
                          : pTarget}
                    </span>
                  </div>

                  {/* Turn Darts Indicator */}
                  {isActive && (
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map(dIdx => {
                        const dart = turnDarts[dIdx];
                        return (
                          <div
                            key={dIdx}
                            className={clsx(
                              "w-6 h-6 rounded-lg text-[9px] font-black flex items-center justify-center border",
                              dart 
                                ? (dart.isHit ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-rose-500/20 border-rose-500/40 text-rose-300") 
                                : "bg-white/5 border-white/10 text-slate-500"
                            )}
                          >
                            {dart ? (dart.isHit ? '✓' : '✕') : dIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Big Active Target Spotlight */}
        <div className={clsx(
          "border rounded-3xl p-3 flex flex-col items-center justify-center shadow-lg relative overflow-hidden",
          isSuddenDeath
            ? "bg-[#221017] border-rose-500/40"
            : "bg-[#121927] border-cyan-500/30"
        )}>
          <div className={clsx(
            "absolute top-0 left-0 right-0 h-1",
            isSuddenDeath
              ? "bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500"
              : "bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500"
          )} />
          <span className={clsx(
            "text-[10px] font-black tracking-widest uppercase mb-0.5",
            isSuddenDeath ? "text-rose-400" : "text-cyan-400"
          )}>
            {isSuddenDeath ? '⚡ Sudden Death Bull-Off ⚡' : 'Aim At'}
          </span>
          <div className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center my-1 animate-pulse border-2 shadow-lg",
            isSuddenDeath
              ? "bg-rose-500/20 border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)] text-rose-300"
              : "bg-cyan-500/15 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] text-white"
          )}>
            <span className={clsx("font-black", isSuddenDeath ? "text-xl text-rose-200" : (currentTargetLabel.length > 2 ? "text-2xl text-white" : "text-3xl text-white"))}>
              {isSuddenDeath ? 'BULL' : currentTargetLabel}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-bold mt-1">
            {isSuddenDeath 
              ? 'Most Bull points in 3 darts wins!' 
              : activePlayer?.isFinished 
                ? 'Target Complete! Waiting for round end.'
                : `Target ${(activePlayer?.currentTargetIdx || 0) + 1} of ${CLOCK_TARGETS.length}`}
          </span>
        </div>

        {/* Visual Clock Progress Track Strip (No clipping, padded container) */}
        <div className="bg-[#0f1522] border border-white/10 rounded-2xl p-2.5 shadow-inner">
          <div ref={trackRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-2">
            {CLOCK_TARGETS.map((num, idx) => {
              const isPast = idx < (activePlayer?.currentTargetIdx || 0);
              const isCurrent = idx === (activePlayer?.currentTargetIdx || 0);
              const label = CLOCK_TARGET_LABELS[num];

              return (
                <div
                  key={num}
                  className={clsx(
                    "w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all border",
                    isCurrent
                      ? "bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] z-10"
                      : isPast
                        ? "bg-[#00f0a8]/15 border-[#00f0a8]/30 text-[#00f0a8]"
                        : "bg-[#162030] border-white/5 text-slate-500"
                  )}
                >
                  {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action toast slot (fixed height to prevent layout jump) */}
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className={clsx("text-center text-xs font-black text-cyan-300 py-0.5 px-3 rounded-xl transition-opacity duration-150", toastMessage ? "opacity-100" : "opacity-0 select-none pointer-events-none")}>
            {toastMessage || '-'}
          </div>
        </div>

        {/* Input Section */}
        {inputMethod === 'dartboard' ? (
          <div className="flex-1 flex flex-col justify-end mt-1">
            <InteractiveDartboard
              mode="clock"
              onDartRecorded={handleDartboardHit}
              onScoreSubmit={() => {}}
              onBust={() => registerDart(false, 0)}
              activePlayerName={activePlayer?.name || 'Player'}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 w-full max-w-md mx-auto shrink-0 pb-1">
            {/* Sudden Death or Normal Quick 1-Tap Advance Buttons */}
            {isSuddenDeath ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => registerSuddenDeathDart(2, 'D-Bull (2)')}
                  className="py-3.5 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-rose-500/25 flex flex-col items-center justify-center cursor-pointer"
                >
                  <span>Double Bull</span>
                  <span className="text-[10px] opacity-80">+2 Pts</span>
                </button>
                <button
                  onClick={() => registerSuddenDeathDart(1, 'Bull (1)')}
                  className="py-3.5 bg-[#162030] hover:bg-[#1f2b42] text-amber-300 font-black text-sm rounded-2xl active:scale-95 transition-all border border-amber-500/30 flex flex-col items-center justify-center cursor-pointer shadow-md"
                >
                  <span>Outer Bull</span>
                  <span className="text-[10px] text-amber-400/80">+1 Pt</span>
                </button>
                <button
                  onClick={() => registerSuddenDeathDart(0, 'Miss')}
                  className="py-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-black text-sm rounded-2xl active:scale-95 transition-all border border-rose-500/25 flex flex-col items-center justify-center cursor-pointer"
                >
                  <span>Miss</span>
                  <span className="text-[10px] text-rose-400/80">0 Pts</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => registerDart(true, 1)}
                  className="py-3.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex flex-col items-center justify-center cursor-pointer"
                >
                  <span>HIT (Single)</span>
                  <span className="text-[10px] opacity-80">+1 Target</span>
                </button>

                <button
                  onClick={() => registerDart(true, 2)}
                  className="py-3.5 bg-[#162030] hover:bg-[#1f2b42] text-cyan-300 font-black text-sm rounded-2xl active:scale-95 transition-all border border-cyan-500/30 flex flex-col items-center justify-center cursor-pointer shadow-md"
                >
                  <span>Double</span>
                  <span className="text-[10px] text-cyan-400/80">{bonusSkips ? '+2 Targets' : '+1 Target'}</span>
                </button>

                <button
                  onClick={() => registerDart(true, 3)}
                  className="py-3.5 bg-[#162030] hover:bg-[#1f2b42] text-amber-300 font-black text-sm rounded-2xl active:scale-95 transition-all border border-amber-500/30 flex flex-col items-center justify-center cursor-pointer shadow-md"
                >
                  <span>Triple</span>
                  <span className="text-[10px] text-amber-400/80">{bonusSkips ? '+3 Targets' : '+1 Target'}</span>
                </button>
              </div>
            )}

            {/* Prominent Miss / Off Board Button */}
            <button
              onClick={() => isSuddenDeath ? registerSuddenDeathDart(0, 'Miss') : registerDart(false, 0)}
              className="w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 font-black text-sm uppercase rounded-2xl active:scale-95 transition-all border border-rose-500/30 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[3]" />
              <span>Miss / Off Board (0)</span>
            </button>
          </div>
        )}
      </div>

      {/* Winning Target Confirmation Modal (Ensures no accidental wins & equal turns) */}
      {winConfirm && (
        <div className="fixed inset-0 z-[200] bg-[#0a0e17]/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121927] border border-cyan-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
              <Compass className="w-8 h-8 text-cyan-300" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Did {activePlayer?.name} hit Bull?</h2>
            <p className="text-xs text-slate-300 mb-6 font-medium">
              Confirm winning target to complete the clock. All players get an equal turn this round!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const { isHit, multiplier, dartLabel } = winConfirm;
                  setWinConfirm(null);
                  applyConfirmedFinalDart(isHit, multiplier, dartLabel);
                }}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-4 rounded-xl cursor-pointer shadow-lg shadow-cyan-500/30 active:scale-95 transition-all"
              >
                Yes, Won!
              </button>
              <button
                onClick={() => setWinConfirm(null)}
                className="flex-1 bg-[#1b2537] hover:bg-[#25334a] text-white font-black py-4 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a0e17]/90 backdrop-blur-lg flex items-center justify-center p-5">
          <div className="bg-[#131b2a] border border-white/10 rounded-3xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white">Settings</h2>
              <button onClick={() => setShowSettingsModal(false)}><X className="w-6 h-6 text-white" /></button>
            </div>

            <span className="text-xs font-bold uppercase text-slate-400 mb-2 block">Input Method</span>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => { setInputMethod('keypad'); localStorage.setItem('atc_input_method', 'keypad'); }}
                className={clsx("py-3 rounded-xl font-bold text-xs cursor-pointer", inputMethod === 'keypad' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-[#162030] text-white')}
              >
                Quick Keypad
              </button>
              <button
                onClick={() => { setInputMethod('dartboard'); localStorage.setItem('atc_input_method', 'dartboard'); }}
                className={clsx("py-3 rounded-xl font-bold text-xs cursor-pointer", inputMethod === 'dartboard' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-[#162030] text-white')}
              >
                Dartboard
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-white/5 mb-4">
              <span className="text-xs font-bold text-white">Bonus Skips (Doubles/Triples)</span>
              <input
                type="checkbox"
                checked={bonusSkips}
                onChange={e => setBonusSkips(e.target.checked)}
                className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={() => { setShowSettingsModal(false); setShowExitModal(true); }}
              className="w-full bg-rose-500/20 text-rose-400 py-3 rounded-xl font-bold cursor-pointer"
            >
              End Match
            </button>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[250] bg-[#0a0e17]/90 flex items-center justify-center p-5">
          <div className="bg-[#131b2a] p-8 rounded-3xl text-center max-w-sm w-full border border-white/10 shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Abandon Match?</h2>
            <p className="text-slate-400 text-xs mb-6 font-medium">Your progress will be discarded.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowExitModal(false)} className="py-3 rounded-xl font-bold bg-[#161f30] text-white cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('activeAroundTheClockGame');
                  navigate('/game');
                }}
                className="py-3 rounded-xl font-bold bg-rose-500 text-white cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
