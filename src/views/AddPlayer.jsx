import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPlayerToDb } from '../firebase/db';
import { UserPlus, ArrowRight, X, AlertCircle } from 'lucide-react';
import DartFlowHeader from '../components/DartFlowHeader';

export default function AddPlayer({ onPlayerAdded }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide both first and last names.');
      return;
    }
    if (password.toLowerCase() !== 'hemligt') {
      setError('Invalid authorization password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      await addPlayerToDb(fullName);
      await onPlayerAdded();
      navigate('/profile');
    } catch (err) {
      console.error(err);
      setError('A database error occurred during creation.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader showBack />

      <div className="max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
            <UserPlus className="w-8 h-8 text-[#00f0a8]" />
            <span>New Player</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Register a new competitor into the league</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-[#131b2a] border border-white/[0.08] p-5 md:p-8 rounded-3xl shadow-xl flex flex-col gap-5 relative overflow-hidden">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-center gap-3 font-semibold text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3.5">
            <div className="flex-1">
              <label className="text-slate-300 font-bold mb-1.5 block uppercase tracking-wider text-xs">First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Luke"
                className="w-full bg-[#0a0e17] border border-white/10 rounded-xl p-3.5 text-white font-bold text-base focus:outline-none focus:border-[#00f0a8] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-slate-300 font-bold mb-1.5 block uppercase tracking-wider text-xs">Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Littler"
                className="w-full bg-[#0a0e17] border border-white/10 rounded-xl p-3.5 text-white font-bold text-base focus:outline-none focus:border-[#00f0a8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold mb-1.5 block uppercase tracking-wider text-xs">Secret Key</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Authorization password"
              className="w-full bg-[#0a0e17] border border-white/10 rounded-xl p-3.5 text-white font-bold text-base focus:outline-none focus:border-[#00f0a8] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-[#00f0a8] hover:bg-[#00d694] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0e17] font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,240,168,0.3)] transition-all active:scale-[0.98] text-base uppercase tracking-wider cursor-pointer"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Registering...</span>
            ) : (
              <>
                <span>Add Player</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

