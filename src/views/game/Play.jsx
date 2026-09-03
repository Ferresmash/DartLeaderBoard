import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { submitMatchData } from '../../firebase/db';
import { Check, Delete, RotateCcw, Settings, Trophy, AlertTriangle, Target, Sliders, X } from 'lucide-react';
import { getCheckout } from '../../utils/checkouts';
import DartFlowHeader from '../../components/DartFlowHeader';
import InteractiveDartboard from '../../components/InteractiveDartboard';
import clsx from 'clsx';

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
    cardBgActive: 'bg-[#0e2422]',
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
    cardBgActive: 'bg-[#22132e]',
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
    cardBgActive: 'bg-[#291018]',
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

  const [inputMethod, setInputMethod] = useState(() => localStorage.getItem('dart_input_method') || 'keypad');
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [checkoutConfirmScore, setCheckoutConfirmScore] = useState(null);

  const [isSuddenDeath, setIsSuddenDeath] = useState(isNewGame ? false : savedGame?.isSuddenDeath || false);
  const [suddenDeathPlayers, setSuddenDeathPlayers] = useState(isNewGame ? [] : savedGame?.suddenDeathPlayers || []);
  const [suddenDeathScores, setSuddenDeathScores] = useState(isNewGame ? {} : savedGame?.suddenDeathScores || {});

  useEffect(() => {
    if (players.length > 0 && !isSaving) {
      localStorage.setItem('activeDartsGame', JSON.stringify({
        players, activeIdx, history, matchTurns, bestScores, startingScore, legsToWin, playerMode, outRule, isSuddenDeath, suddenDeathPlayers, suddenDeathScores
      }));
    }
  }, [players, activeIdx, history, matchTurns, bestScores, startingScore, legsToWin, playerMode, outRule, isSuddenDeath, suddenDeathPlayers, suddenDeathScores, isSaving]);

  const isSavingRef = useRef(isSaving);
  useEffect(() => { isSavingRef.current = isSaving; }, [isSaving]);

  if (!isNewGame && !savedGame) return <Navigate to="/game" />;
  const activePlayer = players[activeIdx] || players[0];

  const handleKeypad = (val) => {
    if (val === '+') {
      if (!inputVal || inputVal.endsWith('+')) return;
      setInputVal(prev => prev + '+');
      return;
    }
    const potentialExpr = inputVal + val;
    const parts = potentialExpr.split('+');
    let sum = 0;
    for (let i = 0; i < parts.length; i++) {
        const v = parseInt(parts[i]);
        if (!isNaN(v)) sum += v;
    }
    if (sum <= 180 && parts[parts.length - 1].length <= 3) setInputVal(potentialExpr);
  };

  const handleBackspace = () => setInputVal(prev => prev.slice(0, -1));

  const finalizeTurn = (score, isExplicitBust) => {
    const isRoundEnd = isSuddenDeath ? activeIdx === suddenDeathPlayers[suddenDeathPlayers.length - 1] : activeIdx === players.length - 1;
    const currScore = activePlayer.currentScore;
    let newScore = currScore - score;
    let isBust = isExplicitBust;

    if (isSuddenDeath) {
      isBust = false;
      newScore = currScore;
    } else {
      if (!isBust && (newScore < 0 || (outRule === 'double' && newScore === 1))) isBust = true;
      if (isBust) { newScore = currScore; score = 0; }
      if (!isBust && score > 0) setBestScores(prev => ({ ...prev, [activePlayer.id]: Math.max(prev[activePlayer.id] || 0, score) }));
    }

    setMatchTurns(prev => [...prev, { playerId: activePlayer.id, score: isExplicitBust ? 0 : score, isBust, timestamp: Date.now() }]);
    setHistory(prev => [...prev, { playerIdx: activeIdx, prevScore: currScore, scoreInputted: score, dartsThrownBefore: activePlayer.dartsThrown, isBustRecorded: isBust, wasSuddenDeath: isSuddenDeath, prevSuddenDeathScores: { ...suddenDeathScores }, prevSuddenDeathPlayers: [...suddenDeathPlayers] }]);

    const newPlayers = [...players];
    newPlayers[activeIdx].currentScore = newScore;
    newPlayers[activeIdx].dartsThrown += 3;

    if (isSuddenDeath) {
      const newSDScores = { ...suddenDeathScores, [activeIdx]: score };
      setSuddenDeathScores(newSDScores);
      if (isRoundEnd) {
        let maxScore = -1;
        let winners = [];
        suddenDeathPlayers.forEach(idx => {
           const s = newSDScores[idx] !== undefined ? newSDScores[idx] : -1;
           if (s > maxScore) { maxScore = s; winners = [idx]; } else if (s === maxScore && s !== -1) winners.push(idx);
        });
        if (winners.length === 1) {
          newPlayers[winners[0]].legsWon += 1;
          setPlayers(newPlayers);
          handleMatchWin(newPlayers[winners[0]], newPlayers);
          return;
        } else if (winners.length > 1) {
          setSuddenDeathScores({}); setSuddenDeathPlayers(winners); setActiveIdx(winners[0]); setPlayers(newPlayers); setInputVal(''); return;
        }
      }
      setActiveIdx(getNextActiveIdx(activeIdx, true, suddenDeathPlayers, players.length));
      setPlayers(newPlayers); setInputVal(''); return;
    }

    if (newScore === 0 && legsToWin > 1) {
      newPlayers[activeIdx].legsWon += 1;
      if (newPlayers[activeIdx].legsWon >= legsToWin) { setPlayers(newPlayers); handleMatchWin(newPlayers[activeIdx], newPlayers); return; }
      else { newPlayers.forEach(p => { p.currentScore = startingScore; p.dartsThrown = 0; }); }
    }

    if (isRoundEnd && legsToWin === 1) {
      const zeroPlayersCount = newPlayers.filter(p => p.currentScore === 0).length;
      if (zeroPlayersCount === 1) {
         const winnerIdx = newPlayers.findIndex(p => p.currentScore === 0);
         newPlayers[winnerIdx].legsWon += 1;
         setPlayers(newPlayers);
         handleMatchWin(newPlayers[winnerIdx], newPlayers);
         return;
      } else if (zeroPlayersCount > 1) {
         setIsSuddenDeath(true);
         const sdPlayers = newPlayers.map((p, i) => p.currentScore === 0 ? i : -1).filter(i => i !== -1);
         setSuddenDeathPlayers(sdPlayers); setSuddenDeathScores({}); setActiveIdx(sdPlayers[0]); setPlayers(newPlayers); setInputVal(''); return;
      }
    }
    setActiveIdx(getNextActiveIdx(activeIdx, false, [], players.length));
    setPlayers(newPlayers); setInputVal('');
  };

  const submitScore = () => {
    if (!inputVal) return;
    const sum = inputVal.split('+').reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
    if (!isSuddenDeath && activePlayer.currentScore - sum === 0) { setCheckoutConfirmScore(sum); return; }
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
    try { await submitMatchData(winner.id, latestPlayers.map(p => p.id), bestScores, matchTurns, startingScore); await onMatchComplete(); } catch(e) { console.error(e); }
    navigate('/');
  };

  if (isSaving) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e17] flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-[#00f0a8]/15 border-2 border-[#00f0a8] flex items-center justify-center mb-6 shadow-[0_0_35px_rgba(0,240,168,0.5)]">
          <Trophy className="w-12 h-12 text-[#00f0a8] animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Match Complete!</h2>
      </div>
    );
  }

  const currentCalculatedTotal = inputVal ? inputVal.split('+').reduce((acc, curr) => acc + (parseInt(curr) || 0), 0) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0e17] font-sans overflow-hidden select-none">
      <DartFlowHeader 
        showBack 
        onBack={() => setShowExitModal(true)}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button onClick={handleUndo} disabled={history.length === 0} className="w-9 h-9 rounded-full bg-[#161f30] border border-white/10 hover:bg-[#1f2b42] disabled:opacity-30 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => setShowSettingsModal(true)} className="w-9 h-9 rounded-full bg-[#161f30] border border-white/10 hover:bg-[#1f2b42] flex items-center justify-center text-slate-300 hover:text-[#00f0a8] transition-all cursor-pointer"><Settings className="w-4 h-4" /></button>
          </div>
        }
      />

      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-2 flex flex-col justify-between overflow-hidden">
        <div className={clsx("grid gap-2.5 w-full", inputMethod === 'dartboard' ? "max-h-[30vh]" : "flex-1 max-h-[46vh]", players.length <= 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2")}>
          {players.map((p, i) => {
            const theme = PLAYER_THEMES[i % PLAYER_THEMES.length];
            const isActive = activeIdx === i;
            const pTurns = (matchTurns || []).filter(t => t && t.playerId === p.id && !t.isBust);
            const pAvg = pTurns.length > 0 ? (pTurns.reduce((acc, t) => acc + t.score, 0) / pTurns.length).toFixed(1) : '0.0';
            const checkoutGuide = getCheckout(p.currentScore);

            return (
              <div key={p.id || i} onClick={() => setActiveIdx(i)} className={clsx("relative rounded-2xl p-3 flex flex-col justify-between border-2 transition-all duration-300 cursor-pointer overflow-hidden", isActive ? `${theme.border} ${theme.cardBgActive} ${theme.activeGlow} scale-[1.02] z-10` : `${theme.borderInactive} ${theme.cardBgInactive} opacity-75 hover:opacity-100`)}>
                {isActive && <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: theme.accentHex }} />}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className={clsx("w-5 h-5 rounded-md font-black text-[11px] flex items-center justify-center shrink-0", theme.badgeBg, theme.badgeText)}>{i + 1}</span>
                        <span className="font-extrabold text-white text-xs truncate">{p.name.split(' ')[0]}</span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center my-auto">
                    <span className={clsx("font-black tracking-tight leading-none", inputMethod === 'dartboard' ? "text-3xl" : "text-5xl", isActive ? "text-white" : "text-slate-300")}>{p.currentScore}</span>
                    {checkoutGuide && <span className="text-[10px] font-bold text-[#00f0a8] mt-1">{checkoutGuide}</span>}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-semibold">
                  <span className="text-slate-400">avg.</span>
                  <span className={clsx("font-extrabold", theme.avgText)}>{pAvg}</span>
                </div>
              </div>
            );
          })}
        </div>

        {inputMethod === 'dartboard' ? (
          <div className="flex-1 flex flex-col justify-end mt-1"><InteractiveDartboard onScoreSubmit={(s) => finalizeTurn(s, false)} onBust={handleExplicitBust} activePlayerName={activePlayer.name} startingScore={startingScore} currentScore={activePlayer.currentScore} /></div>
        ) : (
          <div className="flex flex-col justify-end">
            <div className="my-2 bg-[#121927] border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-inner">
              <span className="text-base font-mono font-extrabold text-[#00f0a8]">{inputVal || 0}</span>
              {inputVal && <button onClick={handleBackspace} className="text-slate-400"><Delete className="w-5 h-5" /></button>}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1,2,3,'+',4,5,6,'Bust',7,8,9,'Del',0,'Enter'].map((btn, i) => (
                <button key={i} onClick={() => btn === 'Enter' ? submitScore() : btn === 'Del' ? handleBackspace() : btn === 'Bust' ? handleExplicitBust() : handleKeypad(String(btn))} className={clsx("h-12 rounded-2xl font-black text-xl", btn === 'Enter' ? "col-span-2 bg-[#00f0a8] text-[#0a0e17]" : "bg-[#162030] text-white")}>{btn}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a0e17]/90 backdrop-blur-lg flex items-center justify-center p-5">
          <div className="bg-[#131b2a] border border-white/10 rounded-3xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-white">Settings</h2>
                <button onClick={() => setShowSettingsModal(false)}><X className="w-6 h-6 text-white" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-6">
                <button onClick={() => { setInputMethod('keypad'); localStorage.setItem('dart_input_method', 'keypad'); }} className={clsx("py-3 rounded-xl font-bold text-xs", inputMethod === 'keypad' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-[#162030] text-white')}>Calculator</button>
                <button onClick={() => { setInputMethod('dartboard'); localStorage.setItem('dart_input_method', 'dartboard'); }} className={clsx("py-3 rounded-xl font-bold text-xs", inputMethod === 'dartboard' ? 'bg-[#00f0a8] text-[#0a0e17]' : 'bg-[#162030] text-white')}>Dartboard</button>
            </div>
            <button onClick={() => { setShowSettingsModal(false); setShowExitModal(true); }} className="w-full bg-rose-500/20 text-rose-400 py-3 rounded-xl font-bold">End Match</button>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="fixed inset-0 z-[250] bg-[#0a0e17]/90 flex items-center justify-center p-5">
            <div className="bg-[#131b2a] p-8 rounded-3xl text-center max-w-sm w-full">
                <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white mb-6">End this match?</h2>
                <button onClick={() => { localStorage.removeItem('activeDartsGame'); navigate('/'); }} className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold mb-3">Yes, End Match</button>
                <button onClick={() => setShowExitModal(false)} className="w-full text-slate-400 py-3">Keep Playing</button>
            </div>
        </div>
      )}

      {checkoutConfirmScore !== null && (
        <div className="fixed inset-0 z-[300] bg-[#0a0e17]/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#131b2a] border border-[#00f0a8] rounded-3xl p-8 max-w-sm w-full text-center">
            <h2 className="text-2xl font-black text-white mb-6">Did {activePlayer.name.split(' ')[0]} checkout?</h2>
            <div className="flex gap-3">
              <button onClick={() => { const s = checkoutConfirmScore; setCheckoutConfirmScore(null); finalizeTurn(s, false); }} className="flex-1 bg-[#00f0a8] text-[#0a0e17] py-4 rounded-xl font-black">Yes</button>
              <button onClick={() => setCheckoutConfirmScore(null)} className="flex-1 bg-[#1b2537] text-white py-4 rounded-xl font-bold">No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
