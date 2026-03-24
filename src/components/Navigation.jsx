import { NavLink } from 'react-router-dom';
import { Home, UserPlus, User, Target, History } from 'lucide-react';
import clsx from 'clsx';

export default function Navigation() {
  const navItems = [
    { to: '/matches', icon: History, label: 'History' },
    { to: '/add', icon: UserPlus, label: 'Add Plyr' },
    { to: '/', icon: Home, label: 'Table' },
    { to: '/game', icon: Target, label: 'Play' },
    { to: '/profile', icon: User, label: 'Stats' }
  ];

  return (
    <>
      {/* Top Header - Desktop Only */}
      <nav className="hidden md:flex fixed top-0 w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-white/5 py-4 px-12 justify-center gap-8 lg:gap-12 shadow-lg transition-all">
        {navItems.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold tracking-wide uppercase text-sm",
              isActive ? "bg-indigo-500/20 text-indigo-400 shadow-inner" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            <item.icon className={clsx("w-5 h-5", i === 2 && "w-6 h-6")} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Nav - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/50 pb-safe shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
        <ul className="flex justify-around items-end pt-2 pb-2 px-2">
          {navItems.map((item, index) => {
            const isCenter = index === 2;
            const Icon = item.icon;
            
            return (
              <li key={item.to} className="flex-1 relative">
                <NavLink
                  to={item.to}
                  className={({ isActive }) => clsx(
                    "flex flex-col items-center justify-center py-2 transition-all duration-300",
                    isActive ? "text-indigo-400 -translate-y-1" : "text-slate-400 hover:text-indigo-300",
                    isCenter && "relative"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <div className={clsx(
                        "relative flex items-center justify-center transition-all duration-300",
                        isCenter ? "w-16 h-16 -mt-10 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-slate-950" : "w-10 h-10 rounded-2xl mb-1",
                        isCenter && isActive ? "bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] text-white scale-110" : 
                        isCenter && !isActive ? "bg-slate-800 text-slate-400 hover:text-slate-200" :
                        isActive ? "bg-indigo-500/20 text-indigo-400 shadow-inner" : "bg-transparent"
                      )}>
                        <Icon className={clsx(isCenter ? "w-7 h-7" : "w-5 h-5", isActive && !isCenter && "scale-110 drop-shadow-md")} />
                      </div>
                      {!isCenter && <span className={clsx("text-[10px] font-bold tracking-wide uppercase", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
