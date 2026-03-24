import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPlayerToDb } from '../firebase/db';
import { UserPlus, ArrowRight, X, AlertCircle } from 'lucide-react';

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
    <div className="p-6 md:p-10 pb-28 min-h-[100dvh]">
      <div className="max-w-2xl mx-auto pt-6 md:pt-0">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 flex items-center gap-3">
             <UserPlus className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
             <span className="text-white">New Player</span>
          </h1>
          <p className="text-slate-400 font-medium md:text-lg">Register a new competitor into the database.</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/5 p-6 md:p-10 rounded-3xl shadow-xl flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-center gap-3 font-semibold mb-4 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-200">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-slate-300 font-bold mb-2 block uppercase tracking-wider text-xs md:text-sm">First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Luke"
                className="w-full bg-slate-900 border-2 border-slate-700/50 rounded-2xl p-4 text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
              />
            </div>
            <div className="flex-1">
              <label className="text-slate-300 font-bold mb-2 block uppercase tracking-wider text-xs md:text-sm">Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Littler"
                className="w-full bg-slate-900 border-2 border-slate-700/50 rounded-2xl p-4 text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
              />
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-0 italic font-medium">A default initial avatar will be generated based on this name.</p>

          <div className="mt-2">
            <label className="text-slate-300 font-bold mb-2 block uppercase tracking-wider text-xs md:text-sm">Secret Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter authorization key"
              className="w-full bg-slate-900 border-2 border-slate-700/50 rounded-2xl p-4 text-white font-bold text-lg focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] text-lg uppercase tracking-wide"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Registering...</span>
            ) : (
              <>
                <span>Add Player</span>
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
