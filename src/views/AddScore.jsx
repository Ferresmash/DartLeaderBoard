import { useState } from 'react';
import { addWin } from '../firebase/db';
import { Shield, ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react';

export default function AddScore({ players, onScoreAdded }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.toLowerCase() === 'hemligt') {
      setIsSubmitting(true);
      setError('');
      try {
        await addWin(selectedPlayer.id);
        await onScoreAdded();
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setSelectedPlayer(null);
          setPassword('');
          setIsSubmitting(false);
        }, 2000);
      } catch (err) {
        setError('Failed to add score. Try again.');
        setIsSubmitting(false);
      }
    } else {
      setError('Incorrect secret password.');
    }
  };

  if (selectedPlayer) {
    return (
      <div className="p-6 pb-24 min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 md:w-1/2 h-3/4 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <button 
          onClick={() => { setSelectedPlayer(null); setPassword(''); setError(''); }}
          className="absolute top-6 left-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors z-20 text-slate-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {success ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-emerald-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">Score Added!</h2>
            <p className="text-emerald-400 font-medium text-lg md:text-xl">+1 Win to {selectedPlayer.name}</p>
          </div>
        ) : (
          <div className="w-full max-w-sm md:max-w-md z-10 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="flex flex-col items-center mb-8">
              <div className="w-28 h-28 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-2xl shadow-indigo-500/20 mb-4">
                <img src={selectedPlayer.pfpUrl} alt={selectedPlayer.name} className="w-full h-full rounded-full object-cover border-[4px] border-slate-950" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{selectedPlayer.name}</h2>
              <p className="text-indigo-400 font-medium md:text-lg">Verify Match Win</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative">
              <div className="mb-6 relative">
                <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Secret Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl py-4 pl-14 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium tracking-wider text-lg"
                  autoFocus
                />
              </div>
              {error && <p className="text-rose-400 text-sm md:text-base font-medium mb-4 text-center animate-bounce">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting || !password}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] text-lg md:text-xl"
              >
                {isSubmitting ? 'Verifying...' : 'Confirm Win'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 pb-28 min-h-[100dvh]">
      <div className="md:max-w-4xl mx-auto">
        <header className="mb-8 pt-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 md:mb-4 flex items-center gap-3">
             <UserPlus className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
             <span className="text-white">Record Win</span>
          </h1>
          <p className="text-slate-400 font-medium md:text-lg">Select the player who won the match.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
          {players.map(player => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className="flex flex-col items-center p-6 md:p-8 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-3xl transition-all duration-300 active:scale-95 group shadow-lg"
            >
              <div className="w-20 h-20 md:w-28 md:h-28 mb-4 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-indigo-400 shadow-lg group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                <img src={player.pfpUrl} alt={player.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="font-bold md:text-xl text-slate-100 text-center tracking-tight leading-tight">{player.name}</h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
