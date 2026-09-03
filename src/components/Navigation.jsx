import { NavLink } from 'react-router-dom';
import { Home, UserPlus, User, Target, History, BarChart3 } from 'lucide-react';
import DartFlowLogo from './DartFlowLogo';
import clsx from 'clsx';

export default function Navigation() {
  const navItems = [
    { to: '/', icon: Home, label: 'Table' },
    { to: '/matches', icon: History, label: 'Matches' },
    { to: '/game', icon: Target, label: 'Play', isMainAction: true },
    { to: '/profile', icon: User, label: 'Stats' },
    { to: '/compare', icon: BarChart3, label: 'Compare' },
  ];

  return (
    <>
      {/* Top Header - Desktop Only */}
      <nav className="hidden md:flex fixed top-0 w-full z-50 bg-[#0a0e17]/85 backdrop-blur-xl border-b border-white/[0.08] py-3.5 px-8 lg:px-12 justify-between items-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <NavLink to="/" className="flex items-center gap-2">
          <DartFlowLogo size="lg" />
        </NavLink>

        <div className="flex items-center gap-2 lg:gap-3 bg-[#131b2a]/80 p-1.5 rounded-2xl border border-white/[0.06] backdrop-blur-md">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs tracking-wider uppercase",
                isActive 
                  ? item.isMainAction 
                    ? "bg-[#00f0a8] text-[#0a0e17] shadow-[0_0_20px_rgba(0,240,168,0.4)]"
                    : "bg-[#00f0a8]/15 text-[#00f0a8] border border-[#00f0a8]/30 shadow-[0_0_15px_rgba(0,240,168,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/add"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161f30] hover:bg-[#1f2b42] border border-white/10 text-slate-200 text-xs font-bold tracking-wider uppercase transition-all hover:border-[#00f0a8]/40 shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-[#00f0a8]" />
            <span>Add Player</span>
          </NavLink>
        </div>
      </nav>

      {/* Bottom Nav - Mobile Only Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-3 pt-1 pointer-events-none">
        <div className="max-w-md mx-auto bg-[#101726]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] p-2 shadow-[0_10px_35px_rgba(0,0,0,0.7)] pointer-events-auto">
          <ul className="flex justify-around items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isMain = item.isMainAction;
              
              return (
                <li key={item.to} className="flex-1 flex justify-center">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => clsx(
                      "flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-300 relative",
                      isMain && "-mt-4"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isMain ? (
                          <div className={clsx(
                            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-4 border-[#0a0e17]",
                            isActive 
                              ? "bg-gradient-to-tr from-[#00f0a8] to-[#2dd4bf] text-[#0a0e17] shadow-[0_0_25px_rgba(0,240,168,0.6)] scale-110" 
                              : "bg-[#1b2537] text-slate-300 hover:text-white border-white/10"
                          )}>
                            <Icon className="w-7 h-7" />
                          </div>
                        ) : (
                          <div className={clsx(
                            "w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all duration-200",
                            isActive 
                              ? "text-[#00f0a8] bg-[#00f0a8]/10" 
                              : "text-slate-400 hover:text-slate-200"
                          )}>
                            <Icon className="w-5 h-5" />
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0a8] shadow-[0_0_8px_#00f0a8] mt-0.5" />
                            )}
                          </div>
                        )}
                        {!isMain && (
                          <span className={clsx(
                            "text-[9px] font-bold tracking-wider uppercase mt-0.5 transition-colors",
                            isActive ? "text-[#00f0a8]" : "text-slate-400"
                          )}>
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}

