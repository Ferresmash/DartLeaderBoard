import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Target, ArrowLeft, Play, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Setup() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPlayers = location.state?.selectedPlayers;

  const [mode, setMode] = useState('501'); // 301, 501, 701, custom
  const [customScore, setCustomScore] = useState(301);
  const [legs, setLegs] = useState(1);

  if (!selectedPlayers || selectedPlayers.length === 0) {
    return <Navigate to="/game" />;
  }

  const handleStart = () => {
    const startingScore = mode === 'custom' ? parseInt(customScore) || 301 : parseInt(mode);
    navigate('/game/play', { 
      state: { 
        selectedPlayers, 
        startingScore, 
        legsToWin: legs 
      } 
    });
  };

  const modeOptions = ['301', '501', '701', 'custom'];

  return (
    <div className="p-6 pb-28 min-h-[100dvh]">
      <div className="max-w-md mx-auto relative mt-2">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-0 left-0 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors z-20 text-slate-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <header className="mb-10 pt-16 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Ruleset</h1>
          <p className="text-indigo-400 font-medium">{selectedPlayers.length} Players stepping up.</p>
        </header>

        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-xl mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-6 h-6 text-pink-400" />
            <h3 className="font-bold text-xl text-slate-100">Game Mode</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {modeOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setMode(opt)}
                className={`py-6 rounded-2xl font-black text-2xl transition-all ${mode === opt ? 'bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] ring-2 ring-pink-400 scale-105' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
              >
                {opt === 'custom' ? '???' : opt}
              </button>
            ))}
          </div>
          
          {mode === 'custom' && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4">
              <label className="text-slate-400 text-sm font-medium mb-2 block text-center uppercase tracking-widest">Custom Starting Score</label>
              <input 
                type="number" 
                value={customScore} 
                onChange={e => setCustomScore(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-5 px-6 text-white text-4xl font-black text-center focus:outline-none focus:border-pink-500 focus:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all"
              />
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-xl mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-xl text-slate-100">Legs to Win</h3>
          </div>
          <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-2 border border-slate-700/50">
            <button 
              onClick={() => setLegs(l => Math.max(1, l - 1))}
              className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <div className="text-center w-24">
              <span className="block text-4xl font-black text-white">{legs}</span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none">Leg{legs > 1 ? 's' : ''}</span>
            </div>
            <button 
              onClick={() => setLegs(l => Math.min(99, l + 1))}
              className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-6 rounded-3xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] text-2xl tracking-wide uppercase"
        >
          <Play className="w-8 h-8 fill-current" />
          <span>Start match</span>
        </button>
      </div>
    </div>
  );
}
