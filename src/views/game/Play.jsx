import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { submitMatchData } from '../../firebase/db';
import { Trophy, ChevronLeft, Delete, Check, Target, Skull, Settings, X } from 'lucide-react';
import clsx from 'clsx';

const BG_COLORS = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];

export default function Play({ onMatchComplete }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  if (!location.state?.selectedPlayers) {
    return <Navigate to="/game" />;
  }
  
  const { selectedPlayers, startingScore, legsToWin } = location.state;

  const [players, setPlayers] = useState(() => 
    selectedPlayers.map((p, i) => ({
      ...p,
      currentScore: startingScore,
      legsWon: 0,
      dartsThrown: 0,
      bgColor: BG_COLORS[i % BG_COLORS.length]
    }))
  );
  
  const [activeIdx, setActiveIdx] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState([]);
  const [matchTurns, setMatchTurns] = useState([]);
  const [bestScores, setBestScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  const activePlayer = players[activeIdx];
  const isGrid = players.length > 3;

  const handleKeypad = (val) => {
    if (inputVal.length < 3) {
      if (inputVal === '' && val === '0') return;
      const newVal = inputVal + val;
      if (parseInt(newVal) <= 180) {
        setInputVal(newVal);
      }
    }
  };

  const handleBackspace = () => {
    setInputVal(prev => prev.slice(0, -1));
  };

  const finalizeTurn = (score, isExplicitBust) => {
    const currScore = activePlayer.currentScore;
    let newScore = currScore - score;
    let isBust = isExplicitBust;
    
    // Standard Bust Logic
    if (!isBust && (newScore < 0 || newScore === 1)) {
      isBust = true;
    }

    if (isBust) {
      newScore = currScore; // Bust, reset
      score = 0; 
    }

    if (!isBust && (!bestScores[activePlayer.id] || score > bestScores[activePlayer.id])) {
      setBestScores(prev => ({ ...prev, [activePlayer.id]: score }));
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
      isBustRecorded: isBust
    }]);

    const newPlayers = [...players];
    newPlayers[activeIdx].currentScore = newScore;
    newPlayers[activeIdx].dartsThrown += 3;
    
    if (newScore === 0) {
      newPlayers[activeIdx].legsWon += 1;
      
      if (newPlayers[activeIdx].legsWon >= legsToWin) {
        setPlayers(newPlayers);
        handleMatchWin(newPlayers[activeIdx]);
        return;
      } else {
        newPlayers.forEach(p => {
          p.currentScore = startingScore;
          p.dartsThrown = 0;
        });
      }
    }
    
    setActiveIdx((activeIdx + 1) % players.length);
    setPlayers(newPlayers);
    setInputVal('');
  };

  const submitScore = () => {
    if (!inputVal) return;
    finalizeTurn(parseInt(inputVal), false);
  };

  const handleExplicitBust = () => finalizeTurn(0, true);

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastMove = history[history.length - 1];
    
    const newPlayers = [...players];
    newPlayers[lastMove.playerIdx].currentScore = lastMove.prevScore;
    newPlayers[lastMove.playerIdx].dartsThrown = lastMove.dartsThrownBefore;
    
    setPlayers(newPlayers);
    setActiveIdx(lastMove.playerIdx);
    
    setHistory(prev => prev.slice(0, -1));
    setMatchTurns(prev => prev.slice(0, -1));
    setInputVal('');
  };

  const handleMatchWin = async (winner) => {
    setIsSaving(true);
    const participantIds = players.map(p => p.id);
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
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center">
        <Trophy className="w-24 h-24 text-amber-400 mb-6 animate-bounce drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]" />
        <h2 className="text-4xl font-black text-white mb-2">Match Complete!</h2>
        <p className="text-emerald-400 tracking-widest uppercase font-bold animate-pulse">Syncing Leaderboard</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 font-sans overflow-hidden">
      {/* Players Top View - exactly 50% height */}
      <div className={clsx(
        "w-full h-1/2 relative z-10",
        isGrid ? "grid grid-cols-2 grid-rows-2" : "flex"
      )}>
        {players.map((p, i) => (
          <div key={p.id} className={clsx(
            "flex flex-col shadow-inner transition-all duration-300 relative overflow-hidden",
            isGrid ? "" : "flex-1",
            p.bgColor,
            activeIdx === i ? "shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] z-20 scale-[1.02] opacity-100" : "scale-[0.98]"
          )}>
            {/* Dark Overlay for inactive players */}
            {activeIdx !== i && <div className="absolute inset-0 bg-black/60 z-0 pointer-events-none transition-colors duration-500" />}
            
            <div className={clsx("flex items-center gap-2 bg-black/20 relative z-10", isGrid ? "p-1.5" : "p-3")}>
              {!isGrid && <img src={p.pfpUrl} className="w-8 h-8 rounded-full border-2 border-white/50 object-cover" alt={p.name} />}
              <span className={clsx("font-bold text-white tracking-tight truncate", isGrid ? "text-xs ml-1" : "text-sm md:text-lg")}>{p.name.split(' ')[0]}</span>
              <div className="ml-auto flex gap-1 bg-black/30 px-2 py-1 rounded-full">
                {[...Array(legsToWin)].map((_, legIdx) => (
                  <div key={legIdx} className={clsx("w-2 h-2 md:w-3 md:h-3 rounded-full border border-white/70", legIdx < p.legsWon ? "bg-white" : "bg-transparent")} />
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative bg-gradient-to-b from-transparent to-black/10 z-10">
              <span className={clsx("font-black text-white drop-shadow-lg tracking-tighter leading-none", isGrid ? "text-5xl" : "text-6xl md:text-9xl")}>{p.currentScore}</span>
            </div>
            
            <div className={clsx("bg-black/30 flex justify-center text-white/90 font-bold tracking-wider uppercase relative z-10", isGrid ? "p-1.5 text-[10px]" : "p-3 text-xs md:text-sm")}>
              <span>Avg: {p.dartsThrown > 0 ? ((startingScore - p.currentScore) / (p.dartsThrown / 3)).toFixed(1) : '0.0'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls View - Exactly 50% height */}
      <div className="w-full h-1/2 flex flex-col p-4 md:p-6 z-20 bg-slate-900 shadow-[0_-15px_40px_rgba(0,0,0,0.5)] border-t border-white/5 relative">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <button onClick={handleUndo} disabled={history.length === 0} className="text-slate-400 disabled:opacity-30 hover:text-white flex items-center gap-1 font-bold transition-colors">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /> Undo
          </button>
          <span className="text-amber-400 font-black uppercase tracking-widest text-base md:text-xl drop-shadow-md">{activePlayer.name.split(' ')[0]}'s Turn</span>
          <button onClick={() => setShowExitModal(true)} className="text-slate-400 hover:text-white transition-colors h-8 w-8 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center bg-slate-950 p-2 md:p-3 rounded-[24px] mb-4 shadow-inner border border-white/5 max-w-xl mx-auto w-full relative h-20 md:h-24 shrink-0">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-indigo-500/20 to-transparent pointer-events-none"></div>
          <div className="w-12 flex justify-center z-10">
            <Target className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
          </div>
          <div className="flex-1 flex justify-center z-10">
            <span className="text-4xl md:text-6xl font-black text-white tracking-widest leading-none mt-1">{inputVal || '-'}</span>
          </div>
          <div className="flex gap-2 z-10 h-full">
            <button onClick={handleBackspace} disabled={!inputVal} className="h-full w-14 md:w-20 rounded-[16px] bg-white/5 hover:bg-white/10 disabled:opacity-30 text-rose-400 flex items-center justify-center active:scale-95 transition-all">
              <Delete className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button onClick={submitScore} disabled={!inputVal} className="h-full w-14 md:w-20 rounded-[16px] bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center disabled:opacity-30 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              <Check className="w-8 h-8 md:w-10 md:h-10" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-2 md:gap-3 max-w-xl mx-auto w-full min-h-0">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button 
              key={num} 
              onClick={() => handleKeypad(num.toString())}
              className="bg-white/5 hover:bg-white/10 text-white font-black text-3xl md:text-4xl rounded-2xl active:scale-95 active:bg-white/20 transition-all shadow-md border border-white/5 flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div className="col-span-3 grid grid-cols-3 gap-2 md:gap-3">
             <button 
              onClick={handleExplicitBust}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold text-xl md:text-2xl rounded-2xl active:scale-95 transition-all shadow-md border border-rose-500/20 flex flex-col items-center justify-center tracking-wider"
            >
              Bust
            </button>
             <button 
              onClick={() => handleKeypad('0')}
              className="bg-white/5 hover:bg-white/10 text-white font-black text-3xl md:text-4xl rounded-2xl active:scale-95 active:bg-white/20 transition-all shadow-md border border-white/5 flex items-center justify-center"
            >
              0
            </button>
             <div className="col-span-1" />
          </div>
        </div>
      </div>

      {showExitModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Skull className="w-6 h-6" />
              </div>
              <button onClick={() => setShowExitModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Abandon Match?</h2>
            <p className="text-slate-400 font-medium mb-8">Leaving now will discard all unsaved scores and turn data.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/')} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-lg shadow-rose-500/20 active:scale-95">
                Yes, Leave Game
              </button>
              <button onClick={() => setShowExitModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-colors text-lg active:scale-95">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
