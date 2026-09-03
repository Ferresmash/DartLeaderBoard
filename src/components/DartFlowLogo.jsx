import React from 'react';

export function DartFlowLogoMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="df-grad-1" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#00F0A8" />
        </linearGradient>
        <linearGradient id="df-grad-2" x1="8" y1="28" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00F0A8" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* Sleek dynamic curved dart flight shape */}
      <path 
        d="M6 30C8 20 18 10 30 6C24 16 20 22 18 30C15 25 11 21 6 30Z" 
        fill="url(#df-grad-1)" 
      />
      <path 
        d="M14 26C16 19 23 12 30 6C25 15 22 20 20 27C18 24 16 22 14 26Z" 
        fill="url(#df-grad-2)" 
        opacity="0.85"
      />
      <circle cx="30" cy="6" r="3.5" fill="#00F0A8" />
    </svg>
  );
}

export default function DartFlowLogo({ size = "md", showText = true }) {
  const iconSize = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div className="flex items-center gap-2 select-none group cursor-pointer">
      <DartFlowLogoMark className={iconSize} />
      {showText && (
        <div className="flex items-baseline">
          <span className={`font-black tracking-tight text-white ${textSize}`}>Dart</span>
          <span className={`font-black tracking-tight bg-gradient-to-r from-teal-300 to-[#00F0A8] bg-clip-text text-transparent ${textSize}`}>Table</span>
        </div>
      )}
    </div>
  );
}
