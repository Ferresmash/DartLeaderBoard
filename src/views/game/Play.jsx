import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { submitMatchData } from '../../firebase/db';
import { Trophy, ChevronLeft, Delete, Check, Target, Skull, Settings, X, Zap, RotateCcw, AlertTriangle } from 'lucide-react';
import { getCheckout } from '../../utils/checkouts';
import DartFlowHeader from '../../components/DartFlowHeader';
import clsx from 'clsx';

// Signature DartFlow Player Color Themes (from reference image)
const PLAYER_THEMES = [
  {
    id: 'teal',
    border: 'border-[#00f0a8]',
    borderInactive: 'border-[#00f0a8]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(0,240,168,0.35)]',
    badgeBg: 'bg-[#00f0a8]',
    badgeText: 'text-[#0a0e17]',
    scoreText: 'text-[#00f0a8]',
    avgText: 'text-[#00f0a8]/80',
    ring: 'ring-[#00f0a8]',
    accentHex: '#00f0a8',
    cardBgActive: 'bg-[#102422]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'purple',
    border: 'border-[#a855f7]',
    borderInactive: 'border-[#a855f7]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    badgeBg: 'bg-[#a855f7]',
    badgeText: 'text-white',
    scoreText: 'text-[#c084fc]',
    avgText: 'text-[#c084fc]/80',
    ring: 'ring-[#a855f7]',
    accentHex: '#a855f7',
    cardBgActive: 'bg-[#20152c]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'orange',
    border: 'border-[#f97316]',
    borderInactive: 'border-[#f97316]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.35)]',
    badgeBg: 'bg-[#f97316]',
    badgeText: 'text-white',
    scoreText: 'text-[#fb923c]',
    avgText: 'text-[#fb923c]/80',
    ring: 'ring-[#f97316]',
    accentHex: '#f97316',
    cardBgActive: 'bg-[#281812]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'yellow',
    border: 'border-[#eab308]',
    borderInactive: 'border-[#eab308]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.35)]',
    badgeBg: 'bg-[#eab308]',
    badgeText: 'text-[#0a0e17]',
    scoreText: 'text-[#facc15]',
    avgText: 'text-[#facc15]/80',
    ring: 'ring-[#eab308]',
    accentHex: '#eab308',
    cardBgActive: 'bg-[#282210]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'cyan',
    border: 'border-[#06b6d4]',
    borderInactive: 'border-[#06b6d4]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    badgeBg: 'bg-[#06b6d4]',
    badgeText: 'text-white',
    scoreText: 'text-[#22d3ee]',
    avgText: 'text-[#22d3ee]/80',
    ring: 'ring-[#06b6d4]',
    accentHex: '#06b6d4',
    cardBgActive: 'bg-[#0e222b]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'rose',
    border: 'border-[#f43f5e]',
    borderInactive: 'border-[#f43f5e]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    badgeBg: 'bg-[#f43f5e]',
    badgeText: 'text-white',
    scoreText: 'text-[#fb7185]',
    avgText: 'text-[#fb7185]/80',
    ring: 'ring-[#f43f5e]',
    accentHex: '#f43f5e',
    cardBgActive: 'bg-[#291119]',
    cardBgInactive: 'bg-[#121824]'
  }
];

const getNextActiveIdx = (currentIdx, isSD, sdPlayers, totalLen) => {
  let next = (currentIdx + 1) % totalLen;
  if (isSD) {
    let attempts = 0;
    while (!sdPlayers.includes(next) && attempts < totalLen) {
      next = (next + 1) % totalLen;
      attempts++;
    }
  }
  return next;
};

export default function Play({ onMatchComplete }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const savedGameStr = localStorage.getItem('activeDartsGame');
  const savedGame = savedGameStr ? JSON.parse(savedGameStr) : null;
  const isNewGame = !!location.state?.selectedPlayers;

  const startingScore = isNewGame ? location.state?.startingScore : savedGame?.startingScore ?? 501;
  const legsToWin = isNewGame ? location.state?.legsToWin : savedGame?.legsToWin ?? 1;
  const playerMode = isNewGame ? location.state?.playerMode || 'ffa' : savedGame?.playerMode || 'ffa';
  const outRule = isNewGame ? location.state?.outRule || 'straight' : savedGame?.outRule || 'straight';

  const [players, setPlayers] = useState(() => {
    if (isNewGame) {
      return (location.state?.selectedPlayers || []).map((p, i) => ({
        ...p,
        currentScore: startingScore,
        legsWon: 0,
        dartsThrown: 0,
        team: playerMode === 'teams' ? (i % 2 === 0 ? 'Team A' : 'Team B') : null,
        themeIdx: playerMode === 'teams' ? (i % 2 === 0 ? 0 : 1) : i % PLAYER_THEMES.length
      }));
    }
    return savedGame?.players || [];
  });
  
  const [activeIdx, setActiveIdx] = useState(isNewGame ? 0 : savedGame?.activeIdx ?? 0);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState(isNewGame ? [] : savedGame?.history || []);
  const [matchTurns, setMatchTurns] = useState(isNewGame ? [] : savedGame?.matchTurns || []);
  const [bestScores, setBestScores] = useState(isNewGame ? {} : savedGame?.bestScores || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [checkoutConfirmScore, setCheckoutConfirmScore] = useState(null);

  // Sudden Death State
  const [isSuddenDeath, setIsSuddenDeath] = useState(isNewGame ? false : savedGame?.isSuddenDeath || false);
  const [suddenDeathPlayers, setSuddenDeathPlayers] = useState(isNewGame ? [] : savedGame?.suddenDeathPlayers || []);
  const [suddenDeathScores, setSuddenDeathScores] = useState(isNewGame ? {} : savedGame?.suddenDeathScores || {});

  // Persistence Saving Hook
  useEffect(() => {
    if (players.length > 0 && !isSaving) {
      localStorage.setItem('activeDartsGame', JSON.stringify({
        players,
        activeIdx,
        history,
        matchTurns,
        bestScores,
        startingScore,
        legsToWin,
        playerMode,
        outRule,
        isSuddenDeath,
        suddenDeathPlayers,
        suddenDeathScores
      }));
    }
  }, [players, activeIdx, history, matchTurns, bestScores, startingScore, legsToWin, playerMode, outRule, isSuddenDeath, suddenDeathPlayers, suddenDeathScores, isSaving]);

  const isSavingRef = useRef(isSaving);
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => {
      if (isSavingRef.current) return;
      setShowExitModal(true);
      window.history.pushState(null, null, window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!isNewGame && !savedGame) {
    return <Navigate to="/game" />;
  }

  const activePlayer = players[activeIdx] || players[0];

  const handleKeypad = (val) => {
    if (val === '+') {
      if (!inputVal || inputVal.endsWith('+')) return;
      setInputVal(prev => prev + '+');
      return;
    }

    if (inputVal === '0') {
      setInputVal(val);
      return;
    }
    
    const potentialExpr = inputVal + val;
    const parts = potentialExpr.split('+');
    let sum = 0;
    
    for (let i = 0; i < parts.length; i++) {
        const v = parseInt(parts[i]);
        if (!isNaN(v)) {
           sum += v;
        }
    }

    if (sum <= 180) {
      if (parts[parts.length - 1].length <= 3) {
        setInputVal(potentialExpr);
      }
    }
  };

  const handleBackspace = () => {
    setInputVal(prev => prev.slice(0, -1));
  };

  const finalizeTurn = (score, isExplicitBust) => {
    const isRoundEnd = isSuddenDeath 
      ? activeIdx === suddenDeathPlayers[suddenDeathPlayers.length - 1]
      : activeIdx === players.length - 1;

    const currScore = activePlayer.currentScore;
    let newScore = currScore - score;
    let isBust = isExplicitBust;

    if (isSuddenDeath) {
      isBust = false;
      newScore = currScore;
    } else {
      if (!isBust && (newScore < 0 || newScore === 1)) {
        isBust = true;
      }
      if (isBust) {
        newScore = currScore;
        score = 0; 
      }
      if (!isBust && (!bestScores[activePlayer.id] || score > bestScores[activePlayer.id])) {
        setBestScores(prev => ({ ...prev, [activePlayer.id]: score }));
      }
    }

    const turnData = {
      playerId: activePlayer.id,
      score: isExplicitBust ? 0 : score,
      isBust: isBust,
      timestamp: Date.now()
    };

    setMatchTurns(prev => [...prev, turnData]);

    setHistory(prev => [...prev, {
      playerIdx: activeIdx,
      prevScore: currScore,
      scoreInputted: score,
      dartsThrownBefore: activePlayer.dartsThrown,
      isBustRecorded: isBust,
      wasSuddenDeath: isSuddenDeath,
      prevSuddenDeathScores: { ...suddenDeathScores },
      prevSuddenDeathPlayers: [...suddenDeathPlayers]
    }]);

    const newPlayers = [...players];
    newPlayers[activeIdx].currentScore = newScore;
    newPlayers[activeIdx].dartsThrown += 3;

    // SUDDEN DEATH LOGIC
    if (isSuddenDeath) {
      const newSDScores = { ...suddenDeathScores, [activeIdx]: score };
      setSuddenDeathScores(newSDScores);

      if (isRoundEnd) {
        let maxScore = -1;
        let winners = [];
        
        suddenDeathPlayers.forEach(idx => {
           const s = newSDScores[idx] !== undefined ? newSDScores[idx] : -1;
           if (s > maxScore) {
              maxScore = s;
              winners = [idx];
           } else if (s === maxScore && s !== -1) {
              winners.push(idx);
           }
        });

        if (winners.length === 1) {
          const winnerPlayer = { ...newPlayers[winners[0]] };
          winnerPlayer.legsWon += 1;
          newPlayers[winners[0]] = winnerPlayer;
          setPlayers(newPlayers);
          handleMatchWin(winnerPlayer, newPlayers);
          return;
        } else if (winners.length > 1) {
          setSuddenDeathScores({});
          setSuddenDeathPlayers(winners);
          setActiveIdx(winners[0]);
          setPlayers(newPlayers);
          setInputVal('');
          return;
        }
      }

      setActiveIdx(getNextActiveIdx(activeIdx, true, suddenDeathPlayers, players.length));
      setPlayers(newPlayers);
      setInputVal('');
      return;
    }

    // MULTI-LEG LOGIC
    if (newScore === 0 && legsToWin > 1) {
      newPlayers[activeIdx].legsWon += 1;
      if (newPlayers[activeIdx].legsWon >= legsToWin) {
        setPlayers(newPlayers);
        handleMatchWin(newPlayers[activeIdx], newPlayers);
        return;
      } else {
        newPlayers.forEach(p => {
          p.currentScore = startingScore;
          p.dartsThrown = 0;
        });
      }
    }

    // 1-LEG ROUND COMPLETION LOGIC
    if (isRoundEnd && legsToWin === 1) {
      const zeroPlayersCount = newPlayers.filter(p => p.currentScore === 0).length;
      if (zeroPlayersCount === 1) {
         const winnerIdx = newPlayers.findIndex(p => p.currentScore === 0);
         const winnerObj = { ...newPlayers[winnerIdx] };
         winnerObj.legsWon += 1;
         newPlayers[winnerIdx] = winnerObj;
         setPlayers(newPlayers);
         handleMatchWin(winnerObj, newPlayers);
         return;
      } else if (zeroPlayersCount > 1) {
         setIsSuddenDeath(true);
         const sdPlayers = newPlayers.map((p, i) => p.currentScore === 0 ? i : -1).filter(i => i !== -1);
         setSuddenDeathPlayers(sdPlayers);
         setSuddenDeathScores({});
         
         setActiveIdx(sdPlayers[0]);
         setPlayers(newPlayers);
         setInputVal('');
         return;
      }
    }

    setActiveIdx(getNextActiveIdx(activeIdx, false, [], players.length));
    setPlayers(newPlayers);
    setInputVal('');
  };

  const submitScore = () => {
    if (!inputVal) return;
    const sum = inputVal.split('+').reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
    
    if (!isSuddenDeath && activePlayer.currentScore - sum === 0) {
      setCheckoutConfirmScore(sum);
      return;
    }

    finalizeTurn(sum, false);
  };

  const handleExplicitBust = () => finalizeTurn(0, true);

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastMove = history[history.length - 1];
    
    const newPlayers = [...players];
    newPlayers[lastMove.playerIdx].currentScore = lastMove.prevScore;
    newPlayers[lastMove.playerIdx].dartsThrown = lastMove.dartsThrownBefore;
    
    setIsSuddenDeath(lastMove.wasSuddenDeath || false);
    setSuddenDeathScores(lastMove.prevSuddenDeathScores || {});
    setSuddenDeathPlayers(lastMove.prevSuddenDeathPlayers || []);
    
    setPlayers(newPlayers);
    setActiveIdx(lastMove.playerIdx);
    
    setHistory(prev => prev.slice(0, -1));
    setMatchTurns(prev => prev.slice(0, -1));
    setInputVal('');
  };

  const handleMatchWin = async (winner, latestPlayers = players) => {
    setIsSaving(true);
    localStorage.removeItem('activeDartsGame');
    const participantIds = latestPlayers.map(p => p.id);
    try {
      await submitMatchData(winner.id, participantIds, bestScores, matchTurns, startingScore);
      await onMatchComplete();
    } catch(e) {
      console.error(e);
    }
    navigate('/');
  };

  if (isSaving) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e17] flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-[#00f0a8]/15 border-2 border-[#00f0a8] flex items-center justify-center mb-6 shadow-[0_0_35px_rgba(0,240,168,0.5)]">
          <Trophy className="w-12 h-12 text-[#00f0a8] animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Match Complete!</h2>
        <p className="text-[#00f0a8] tracking-widest uppercase font-bold text-xs animate-pulse">Syncing Leaderboard...</p>
      </div>
    );
  }

  // Calculate parsed current total for live math input
  const currentCalculatedTotal = inputVal ? inputVal.split('+').reduce((acc, curr) => acc + (parseInt(curr) || 0), 0) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0e17] font-sans overflow-hidden select-none">
      {/* Top Header Bar */}
      <DartFlowHeader 
        showBack 
        onBack={() => setShowExitModal(true)}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-9 h-9 rounded-full bg-[#161f30] border border-white/10 hover:bg-[#1f2b42] disabled:opacity-30 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
              title="Undo Last Throw"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowExitModal(true)}
              className="w-9 h-9 rounded-full bg-[#161f30] border border-white/10 hover:bg-[#1f2b42] flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Main Scoring Area - 4-Slot Scoreboard Grid */}
      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-2 flex flex-col justify-between overflow-hidden">
        {/* Scoreboard Cards Grid */}
        <div className={clsx(
          "grid gap-2.5 w-full flex-1 max-h-[46vh]",
          players.length <= 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
        )}>
          {players.map((p, i) => {
            const theme = PLAYER_THEMES[i % PLAYER_THEMES.length];
            const isActive = activeIdx === i;
            const isFading = isSuddenDeath && !suddenDeathPlayers.includes(i);

            // Compute running avg for player
            const pTurns = (matchTurns || []).filter(t => t && t.playerId === p.id && !t.isBust);
            const pSum = pTurns.reduce((acc, t) => acc + t.score, 0);
            const pAvg = pTurns.length > 0 ? (pSum / pTurns.length).toFixed(1) : '0.0';

            const checkoutGuide = getCheckout(p.currentScore);

            return (
              <div 
                key={p.id || i}
                onClick={() => setActiveIdx(i)}
                className={clsx(
                  "relative rounded-2xl p-3 md:p-4 flex flex-col justify-between border-2 transition-all duration-300 cursor-pointer overflow-hidden",
                  isActive ? `${theme.border} ${theme.cardBgActive} ${theme.activeGlow} scale-[1.02] z-10` : `${theme.borderInactive} ${theme.cardBgInactive} opacity-75 hover:opacity-100`,
                  isFading && "opacity-20 grayscale"
                )}
              >
                {/* Active Indicator Top Highlight Glow */}
                {isActive && (
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: theme.accentHex }}
                  />
                )}

                {/* Card Header: Number Badge + Player Name + Team Pill + Legs */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={clsx(
                      "w-5 h-5 rounded-md font-black text-[11px] flex items-center justify-center shrink-0",
                      theme.badgeBg,
                      theme.badgeText
                    )}>
                      {i + 1}
                    </span>
                    <span className="font-extrabold text-white text-xs md:text-sm tracking-tight truncate">
                      {p.name.split(' ')[0]}
                    </span>
                    {p.team && (
                      <span className={clsx(
                        "text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-white/10 shrink-0",
                        theme.badgeBg,
                        theme.badgeText
                      )}>
                        {p.team}
                      </span>
                    )}
                  </div>

                  {legsToWin > 1 && (
                    <div className="flex gap-1 bg-[#0a0e17]/60 px-1.5 py-0.5 rounded-md border border-white/5">
                      {[...Array(legsToWin)].map((_, legIdx) => (
                        <div 
                          key={legIdx} 
                          className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            legIdx < p.legsWon ? theme.badgeBg : "bg-white/20"
                          )} 
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Center: Large Remaining Score */}
                <div className="flex flex-col items-center justify-center my-auto py-1">
                  {isSuddenDeath && suddenDeathPlayers.includes(i) ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 animate-pulse">Sudden Death</span>
                      <span className="text-4xl md:text-5xl font-black text-rose-400 tracking-tighter">
                        {suddenDeathScores[i] !== undefined ? suddenDeathScores[i] : '-'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className={clsx(
                        "text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none",
                        isActive ? "text-white" : "text-slate-300"
                      )}>
                        {p.currentScore}
                      </span>
                      {checkoutGuide && (
                        <span className="text-[9px] md:text-[10px] font-bold text-[#00f0a8] uppercase tracking-wider mt-1 truncate max-w-full">
                          {checkoutGuide}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Card Footer: Avg Stats */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-semibold">
                  <span className="text-slate-400">avg.</span>
                  <span className={clsx("font-extrabold", theme.avgText)}>{pAvg}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Math Score Input Bar (matches "Input: 60+57+20" style in image) */}
        <div className="my-2 bg-[#121927] border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Input:</span>
            <span className="text-base md:text-lg font-mono font-extrabold text-[#00f0a8] tracking-wider truncate">
              {inputVal ? inputVal : <span className="text-slate-600">0</span>}
            </span>
            {inputVal.includes('+') && (
              <span className="text-xs font-bold text-slate-400">
                = <strong className="text-white font-extrabold">{currentCalculatedTotal}</strong>
              </span>
            )}
          </div>
          {inputVal && (
            <button 
              onClick={handleBackspace} 
              className="p-1 text-slate-400 hover:text-rose-400 active:scale-90 transition-all"
            >
              <Delete className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Clean Calculator Keypad Controls (4x4 layout from Screen 2) */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {/* Row 1 */}
          <button 
            onClick={() => handleKeypad('1')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            1
          </button>
          <button 
            onClick={() => handleKeypad('2')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            2
          </button>
          <button 
            onClick={() => handleKeypad('3')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            3
          </button>
          <button 
            onClick={() => handleKeypad('+')} 
            className="h-12 md:h-14 bg-[#1b2a3c] hover:bg-[#23374e] text-[#00f0a8] font-black text-2xl rounded-2xl border border-[#00f0a8]/30 active:scale-95 transition-all shadow-sm"
          >
            +
          </button>

          {/* Row 2 */}
          <button 
            onClick={() => handleKeypad('4')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            4
          </button>
          <button 
            onClick={() => handleKeypad('5')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            5
          </button>
          <button 
            onClick={() => handleKeypad('6')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            6
          </button>
          <button 
            onClick={handleExplicitBust}
            disabled={isSuddenDeath}
            className="h-12 md:h-14 bg-[#23151c] hover:bg-[#2e1924] disabled:opacity-30 text-rose-400 font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-rose-500/20 active:scale-95 transition-all shadow-sm flex items-center justify-center"
          >
            Bust
          </button>

          {/* Row 3 */}
          <button 
            onClick={() => handleKeypad('7')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            7
          </button>
          <button 
            onClick={() => handleKeypad('8')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            8
          </button>
          <button 
            onClick={() => handleKeypad('9')} 
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            9
          </button>
          <button 
            onClick={handleBackspace} 
            disabled={!inputVal}
            className="h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] disabled:opacity-30 text-slate-400 hover:text-white font-black rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>

          {/* Row 4 */}
          <button 
            onClick={() => handleKeypad('0')} 
            className="col-span-2 h-12 md:h-14 bg-[#162030] hover:bg-[#1d2a3f] active:bg-[#23334d] text-white font-black text-xl md:text-2xl rounded-2xl border border-white/[0.06] active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button 
            onClick={submitScore} 
            disabled={!inputVal}
            className="col-span-2 h-12 md:h-14 bg-[#00f0a8] hover:bg-[#00d694] disabled:opacity-35 disabled:bg-[#1b2638] disabled:text-slate-500 text-[#0a0e17] font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,240,168,0.4)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Enter Score</span>
          </button>
        </div>
      </div>

      {/* Do you want to end this match Dialog */}
      {showExitModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a0e17]/90 backdrop-blur-lg flex items-center justify-center p-5 animate-in fade-in duration-200">
          <div className="bg-[#131b2a] border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center text-center relative overflow-hidden">
            {/* Top red glow flare */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 shadow-[0_0_15px_#f43f5e]" />

            <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
              Do you want to end this match?
            </h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium mb-6 leading-relaxed">
              Ending the match will discard the current game progress and return you to the home dashboard.
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => { localStorage.removeItem('activeDartsGame'); navigate('/'); }} 
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.35)] active:scale-95 cursor-pointer text-sm uppercase tracking-wider"
              >
                End Match
              </button>
              <button 
                onClick={() => setShowExitModal(false)} 
                className="w-full bg-[#1b2537] hover:bg-[#223046] border border-white/10 text-slate-200 font-bold py-3.5 rounded-2xl transition-all active:scale-95 cursor-pointer text-sm"
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      {checkoutConfirmScore !== null && (
        <div className="fixed inset-0 z-[300] bg-[#0a0e17]/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#131b2a] border-2 border-[#00f0a8] rounded-3xl p-6 max-w-sm w-full shadow-[0_0_35px_rgba(0,240,168,0.3)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#00f0a8]/15 border border-[#00f0a8]/40 flex items-center justify-center text-[#00f0a8] mb-4 shadow-[0_0_20px_rgba(0,240,168,0.3)]">
                <Target className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Did {activePlayer.name.split(' ')[0]} checkout?</h2>
              <p className="text-slate-300 text-sm mt-1">Score: <strong className="text-[#00f0a8] text-xl">{checkoutConfirmScore}</strong></p>
            </div>
            
            <div className="flex gap-3">
              <button 
                 onClick={() => {
                   const score = checkoutConfirmScore;
                   setCheckoutConfirmScore(null);
                   finalizeTurn(score, false);
                 }} 
                 className="flex-1 bg-[#00f0a8] hover:bg-[#00d694] text-[#0a0e17] font-black py-3.5 rounded-xl transition-all text-base shadow-lg shadow-[#00f0a8]/25 active:scale-95 cursor-pointer"
              >
                Yes, Leg Won!
              </button>
              <button 
                 onClick={() => setCheckoutConfirmScore(null)} 
                 className="flex-1 bg-[#1b2537] hover:bg-[#233045] text-slate-200 font-bold py-3.5 rounded-xl transition-all active:scale-95 text-base cursor-pointer"
              >
                No, Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

