import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Trophy, RotateCcw, X, AlertTriangle, Settings, Target, Flame, Check, ShieldCheck, Zap
} from 'lucide-react';
import DartFlowHeader from '../../components/DartFlowHeader';
import InteractiveDartboard from '../../components/InteractiveDartboard';
import { 
  CRICKET_TARGETS, 
  CRICKET_TARGET_LABELS, 
  PLAYER_THEMES, 
  isTargetClosedByAll, 
  checkCricketWinner 
} from '../../utils/cricketUtils';
import { submitMatchData } from '../../firebase/db';
import clsx from 'clsx';

export default function CricketPlay({ onMatchComplete }) {
  const location = useLocation();
  const navigate = useNavigate();

  const savedGameStr = localStorage.getItem('activeCricketGame');
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
        cricketMarks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 },
        cricketScore: 0
      }));
    }
    return savedGame?.players || [];
  });

  const [activeIdx, setActiveIdx] = useState(isNewGame ? 0 : savedGame?.activeIdx || 0);
  const [turnDarts, setTurnDarts] = useState(isNewGame ? [] : savedGame?.turnDarts || []);
  const [historyStack, setHistoryStack] = useState([]);
  const [turnHistory, setTurnHistory] = useState(isNewGame ? [] : savedGame?.turnHistory || []);
  const [multiplier, setMultiplier] = useState(1); // 1, 2, 3
  const [inputMethod, setInputMethod] = useState(() => localStorage.getItem('cricket_input_method') || 'keypad');

  const [maxRounds, setMaxRounds] = useState(() => {
    if (isNewGame) {
      return location.state?.maxRounds !== undefined ? location.state.maxRounds : 10;
    }
    return savedGame?.maxRounds !== undefined ? savedGame.maxRounds : 10;
  });
  const [currentRound, setCurrentRound] = useState(isNewGame ? 1 : savedGame?.currentRound || 1);
  const [winReason, setWinReason] = useState(savedGame?.winReason || null);

  const [winner, setWinner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const autoAdvanceTimerRef = useRef(null);

  // Persist game state safely (no historyStack in localStorage to prevent QuotaExceeded crashes)
  useEffect(() => {
    if (players.length > 0 && !isSaving && !winner) {
      try {
        localStorage.setItem('activeCricketGame', JSON.stringify({
          players,
          activeIdx,
          turnDarts,
          turnHistory,
          maxRounds,
          currentRound,
          winReason
        }));
      } catch (err) {
        console.warn('Cricket localStorage save warning:', err);
      }
    }
  }, [players, activeIdx, turnDarts, turnHistory, maxRounds, currentRound, winReason, isSaving, winner]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  if (!isNewGame && !savedGame) {
    return <Navigate to="/game" />;
  }

  const activePlayer = players[activeIdx] || players[0];

  const handleMatchWin = async (matchWinner, finalPlayers = players) => {
    setIsSaving(true);
    localStorage.removeItem('activeCricketGame');
    try {
      await submitMatchData(
        matchWinner.id,
        finalPlayers.map(p => p.id),
        {},
        turnHistory,
        'Cricket',
        'cricket'
      );
      if (onMatchComplete) {
        await onMatchComplete();
      }
    } catch (e) {
      console.error('Error saving Cricket match:', e);
    }
  };

  const advanceToNextPlayer = (updatedPlayers, currentIdx, completedDarts) => {
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

    // Check normal win condition (closed all targets and points >= rivals)
    const matchWinner = checkCricketWinner(nextPlayers);
    if (matchWinner) {
      setWinner(matchWinner);
      setWinReason('closed_all');
      setPlayers(nextPlayers);
      handleMatchWin(matchWinner, nextPlayers);
      return;
    }

    const isRoundEnd = currentIdx === nextPlayers.length - 1;
    if (isRoundEnd && maxRounds > 0 && currentRound >= maxRounds) {
      // Round limit reached at end of the round! Highest points wins
      const sorted = [...nextPlayers].sort((a, b) => {
        const scoreDiff = (b.cricketScore || 0) - (a.cricketScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const aMarks = Object.values(a.cricketMarks || {}).reduce((sum, m) => sum + (m || 0), 0);
        const bMarks = Object.values(b.cricketMarks || {}).reduce((sum, m) => sum + (m || 0), 0);
        return bMarks - aMarks;
      });
      const limitWinner = sorted[0];
      setWinner(limitWinner);
      setWinReason('round_limit');
      setPlayers(nextPlayers);
      handleMatchWin(limitWinner, nextPlayers);
      return;
    }

    if (isRoundEnd) {
      setCurrentRound(r => r + 1);
    }

    const nextIdx = (currentIdx + 1) % nextPlayers.length;
    setActiveIdx(nextIdx);
    setTurnDarts([]);
    setMultiplier(1);
    setPlayers(nextPlayers);
  };

  const registerDart = (targetNumber, mult = 1) => {
    if (turnDarts.length >= 3 || winner || isSaving) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    // Snapshot for Undo (cap at 10 to prevent memory/storage issues)
    const snapshot = {
      players: JSON.parse(JSON.stringify(players)),
      activeIdx,
      turnDarts: [...turnDarts],
      currentRound
    };
    setHistoryStack(prev => [...prev.slice(-9), snapshot]);

    const updatedPlayers = JSON.parse(JSON.stringify(players));
    const curr = updatedPlayers[activeIdx];
    const isTarget = CRICKET_TARGETS.includes(targetNumber);

    let pointsScored = 0;
    let marksAdded = 0;
    let dartDesc = 'Miss';

    if (isTarget) {
      const currentMarks = curr.cricketMarks[targetNumber] || 0;
      const effectiveMult = (targetNumber === 25 && mult > 2) ? 2 : mult; // Bull max 2 marks (double bull)
      
      const newTotalMarks = currentMarks + effectiveMult;
      curr.cricketMarks[targetNumber] = Math.min(3, newTotalMarks);
      marksAdded = Math.min(effectiveMult, 3 - currentMarks);

      // Scoring overflow points if target is already closed by player AND open on rivals
      const overflowMarks = Math.max(0, newTotalMarks - 3);
      if (overflowMarks > 0) {
        const isClosedAll = isTargetClosedByAll(targetNumber, updatedPlayers);
        if (!isClosedAll) {
          const ptValue = targetNumber === 25 ? 25 : targetNumber;
          pointsScored = overflowMarks * ptValue;
          curr.cricketScore = (curr.cricketScore || 0) + pointsScored;
        }
      }

      const labelPrefix = effectiveMult === 3 ? 'T' : effectiveMult === 2 ? 'D' : 'S';
      const tName = CRICKET_TARGET_LABELS[targetNumber];
      dartDesc = `${labelPrefix}${tName}${pointsScored > 0 ? ` (+${pointsScored} pts)` : ''}`;
    }

    const recordedDart = {
      sector: targetNumber,
      multiplier: mult,
      points: pointsScored,
      marks: marksAdded,
      label: isTarget ? `${mult === 3 ? 'T' : mult === 2 ? 'D' : 'S'}${CRICKET_TARGET_LABELS[targetNumber]}` : 'Miss',
      desc: dartDesc
    };

    const newTurnDarts = [...turnDarts, recordedDart];
    setTurnDarts(newTurnDarts);
    setPlayers(updatedPlayers);
    setMultiplier(1); // Reset multiplier back to single

    setToastMessage(dartDesc);
    setTimeout(() => setToastMessage(null), 1200);

    // Check immediate win condition
    const matchWinner = checkCricketWinner(updatedPlayers);
    if (matchWinner) {
      setWinner(matchWinner);
      setWinReason('closed_all');
      handleMatchWin(matchWinner, updatedPlayers);
      return;
    }

    // Auto advance if 3 darts completed
    if (newTurnDarts.length === 3) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNextPlayer(updatedPlayers, activeIdx, newTurnDarts);
      }, 700);
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0 || isSaving) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    const lastSnap = historyStack[historyStack.length - 1];
    setPlayers(lastSnap.players);
    setActiveIdx(lastSnap.activeIdx);
    setTurnDarts(lastSnap.turnDarts);
    if (lastSnap.currentRound !== undefined) setCurrentRound(lastSnap.currentRound);
    setHistoryStack(prev => prev.slice(0, -1));
    setWinner(null);
    setWinReason(null);
    setToastMessage('Undone');
    setTimeout(() => setToastMessage(null), 1000);
  };

  const renderMarkIcon = (marks) => {
    if (!marks || marks === 0) {
      return <span className="text-slate-600 font-bold text-sm">—</span>;
    }
    if (marks === 1) {
      return <span className="text-[#00f0a8] font-black text-lg leading-none">/</span>;
    }
    if (marks === 2) {
      return <span className="text-[#00f0a8] font-black text-base leading-none">✕</span>;
    }
    // 3 or more (Closed)
    return (
      <div className="w-6 h-6 rounded-full bg-[#00f0a8]/20 border border-[#00f0a8] flex items-center justify-center shadow-[0_0_10px_rgba(0,240,168,0.4)]">
        <span className="text-[#00f0a8] font-black text-xs leading-none">⨂</span>
      </div>
    );
  };

  if (isSaving || winner) {
    const finalWinner = winner || activePlayer;
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e17] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-amber-500/15 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-bounce">
            <Trophy className="w-14 h-14 text-amber-400" />
          </div>
          <div className="absolute -top-1 -right-1 bg-[#00f0a8] text-slate-900 rounded-full p-2 border-2 border-[#0a0e17] shadow-lg">
            <Flame className="w-5 h-5 fill-current" />
          </div>
        </div>

        <span className="text-xs font-black tracking-widest uppercase text-amber-400 mb-1">
          {winReason === 'round_limit' ? 'Round Limit Reached!' : 'Cricket Champion!'}
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
          {finalWinner.name}
        </h1>
        <p className="text-slate-400 text-sm font-semibold mb-2">
          {winReason === 'round_limit' 
            ? `Highest Score at Round ${maxRounds}: `
            : 'Final Score: '}
          <span className="text-[#00f0a8] font-black">{finalWinner.cricketScore || 0} pts</span>
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/game')}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
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
            <span className="text-xs font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl">
              Round {currentRound}{maxRounds > 0 ? ` / ${maxRounds}` : ''}
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

      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-2 flex flex-col justify-between overflow-hidden gap-2">
        {/* Player Header Cards */}
        <div className="grid grid-cols-2 gap-2.5 w-full shrink-0">
          {players.map((p, idx) => {
            const isActive = activeIdx === idx;
            const theme = p.theme || PLAYER_THEMES[idx % PLAYER_THEMES.length];
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
                </div>

                <div className="flex items-center justify-between my-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Points</span>
                    <span className="text-3xl font-black text-white leading-none">{p.cricketScore || 0}</span>
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
                                ? "bg-[#00f0a8]/20 border-[#00f0a8] text-[#00f0a8]" 
                                : "bg-white/5 border-white/10 text-slate-500"
                            )}
                          >
                            {dart ? (dart.multiplier > 1 ? `${dart.multiplier}x` : '✓') : dIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cricket Scoreboard Matrix (DartCounter style) */}
        <div className="bg-[#121927] border border-white/10 rounded-2xl p-2.5 shadow-xl flex-1 min-h-[220px] max-h-[38vh] flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-7 gap-1 text-center border-b border-white/10 pb-1 mb-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <div className="col-span-3 text-left pl-2">{(players[0]?.name || 'P1').split(' ')[0]}</div>
            <div className="col-span-1 text-center">Target</div>
            <div className="col-span-3 text-right pr-2">{(players[1]?.name || 'P2').split(' ')[0]}</div>
          </div>

          <div className="flex flex-col gap-1 flex-1 justify-around">
            {CRICKET_TARGETS.map(target => {
              const p1Marks = players[0]?.cricketMarks?.[target] || 0;
              const p2Marks = players[1]?.cricketMarks?.[target] || 0;
              const isClosedAll = isTargetClosedByAll(target, players);

              return (
                <div 
                  key={target}
                  onClick={() => registerDart(target, multiplier)}
                  className={clsx(
                    "grid grid-cols-7 items-center p-1.5 rounded-xl transition-all cursor-pointer",
                    isClosedAll 
                      ? "bg-white/[0.02] opacity-40" 
                      : "bg-[#162030]/60 hover:bg-[#1a2538] border border-white/5"
                  )}
                >
                  {/* Player 1 Marks */}
                  <div className="col-span-3 flex items-center justify-start pl-2 gap-1.5">
                    {renderMarkIcon(p1Marks)}
                    {p1Marks >= 3 && <span className="text-[10px] font-bold text-[#00f0a8]">Closed</span>}
                  </div>

                  {/* Target Center Badge */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className={clsx(
                      "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center border shadow-sm",
                      isClosedAll 
                        ? "bg-slate-800 text-slate-500 border-white/5 line-through" 
                        : "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-500/10"
                    )}>
                      {CRICKET_TARGET_LABELS[target]}
                    </span>
                  </div>

                  {/* Player 2 Marks */}
                  <div className="col-span-3 flex items-center justify-end pr-2 gap-1.5">
                    {p2Marks >= 3 && <span className="text-[10px] font-bold text-[#00f0a8]">Closed</span>}
                    {renderMarkIcon(p2Marks)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action toast reserved slot to prevent vertical jumping */}
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className={clsx("text-center text-xs font-black text-[#00f0a8] py-0.5 px-3 rounded-xl transition-opacity duration-150", toastMessage ? "opacity-100" : "opacity-0 select-none pointer-events-none")}>
            {toastMessage || '-'}
          </div>
        </div>

        {/* Input Section */}
        {inputMethod === 'dartboard' ? (
          <div className="flex-1 flex flex-col justify-end mt-1">
            <InteractiveDartboard
              mode="cricket"
              onDartRecorded={(dart) => {
                if (dart.value === 25 || dart.score === 50) {
                  registerDart(25, dart.multiplier);
                } else if (CRICKET_TARGETS.includes(dart.value)) {
                  registerDart(dart.value, dart.multiplier);
                } else {
                  registerDart(0, 0); // Miss outside Cricket targets
                }
              }}
              onScoreSubmit={() => {}}
              onBust={() => registerDart(0, 0)}
              activePlayerName={activePlayer.name}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto shrink-0 pb-1">
            {/* Multiplier Pills (Single, Double, Triple) */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 1, label: 'Single (1x)' },
                { val: 2, label: 'Double (2x)' },
                { val: 3, label: 'Triple (3x)' }
              ].map(m => (
                <button
                  key={m.val}
                  onClick={() => setMultiplier(m.val)}
                  className={clsx(
                    "py-2 rounded-xl font-black text-xs transition-all border cursor-pointer",
                    multiplier === m.val
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[1.02]"
                      : "bg-[#162030] text-slate-400 border-white/5 hover:text-white"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Quick 1-Tap Target Buttons (20, 19, 18, 17, 16, 15, Bull) */}
            <div className="grid grid-cols-4 gap-2">
              {CRICKET_TARGETS.map(target => {
                const label = CRICKET_TARGET_LABELS[target];
                const isBull = target === 25;
                return (
                  <button
                    key={target}
                    onClick={() => registerDart(target, multiplier)}
                    className={clsx(
                      "py-3.5 bg-[#162030] hover:bg-[#1f2b42] text-white font-black text-base rounded-2xl active:scale-95 transition-all shadow-md border border-white/5 flex items-center justify-center cursor-pointer",
                      isBull && "col-span-2 bg-[#1b253b] border-amber-500/30 text-amber-300 hover:bg-[#23304c]"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Prominent Miss / Off Board Button */}
            <button
              onClick={() => registerDart(0, 0)}
              className="w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 font-black text-sm uppercase rounded-2xl active:scale-95 transition-all border border-rose-500/30 shadow-md flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <X className="w-5 h-5 stroke-[3]" />
              <span>Miss / Off Board (0)</span>
            </button>
          </div>
        )}
      </div>

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
                onClick={() => { setInputMethod('keypad'); localStorage.setItem('cricket_input_method', 'keypad'); }}
                className={clsx("py-3 rounded-xl font-bold text-xs cursor-pointer", inputMethod === 'keypad' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-[#162030] text-white')}
              >
                Keypad
              </button>
              <button
                onClick={() => { setInputMethod('dartboard'); localStorage.setItem('cricket_input_method', 'dartboard'); }}
                className={clsx("py-3 rounded-xl font-bold text-xs cursor-pointer", inputMethod === 'dartboard' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-[#162030] text-white')}
              >
                Dartboard
              </button>
            </div>

            <span className="text-xs font-bold uppercase text-slate-400 mb-2 block">Round Limit</span>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' },
                { value: 0, label: 'None' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMaxRounds(opt.value)}
                  className={clsx(
                    "py-2 rounded-xl font-bold text-xs cursor-pointer border transition-all",
                    maxRounds === opt.value
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-[#162030] text-slate-400 border-white/5 hover:text-white"
                  )}
                >
                  {opt.label}
                </button>
              ))}
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
                  localStorage.removeItem('activeCricketGame');
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
