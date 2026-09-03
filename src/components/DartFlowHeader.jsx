import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import DartFlowLogo from './DartFlowLogo';

export default function DartFlowHeader({ 
  title, 
  showBack = false, 
  onBack, 
  rightAction = null,
  showLogo = true 
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="w-full flex items-center justify-between px-4 py-3 md:py-4 sticky top-0 z-40 bg-[#0a0e17]/80 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Left Area: Back Button or spacer */}
      <div className="w-10 flex items-center justify-start">
        {showBack ? (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-[#161f30] border border-white/10 hover:border-teal-400/40 hover:bg-[#1f2b42] flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Center Area: DartFlow Branding or Title */}
      <div className="flex-1 flex items-center justify-center">
        {showLogo ? (
          <div onClick={() => navigate('/')} className="cursor-pointer">
            <DartFlowLogo size="md" />
          </div>
        ) : (
          <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight text-center">{title}</h1>
        )}
      </div>

      {/* Right Area: Notification Bell or custom action */}
      <div className="w-10 flex items-center justify-end">
        {rightAction ? (
          rightAction
        ) : (
          <button
            onClick={() => navigate('/matches')}
            className="w-10 h-10 rounded-full bg-[#161f30] border border-white/10 hover:border-teal-400/40 hover:bg-[#1f2b42] flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0a0e17]" />
          </button>
        )}
      </div>
    </header>
  );
}
