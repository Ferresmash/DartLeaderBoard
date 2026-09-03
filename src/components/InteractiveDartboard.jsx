import React, { useState, useMemo } from 'react';
import { RotateCcw, Check, ZoomOut, Target, X, Zap, ChevronLeft } from 'lucide-react';

const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Geometry constants
const R_BULL = 14;
const R_OUTER_BULL = 30;
const R_INNER_SINGLE_MIN = 30;
const R_INNER_SINGLE_MAX = 94;
const R_TRIPLE_MIN = 94;
const R_TRIPLE_MAX = 108;
const R_OUTER_SINGLE_MIN = 108;
const R_OUTER_SINGLE_MAX = 158;
const R_DOUBLE_MIN = 158;
const R_DOUBLE_MAX = 172;
const R_BOARD = 200;

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArcSegment(rInner, rOuter, startAngle, endAngle) {
  const p1 = polarToCartesian(0, 0, rOuter, startAngle);
  const p2 = polarToCartesian(0, 0, rOuter, endAngle);
  const p3 = polarToCartesian(0, 0, rInner, endAngle);
  const p4 = polarToCartesian(0, 0, rInner, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y}`,
    'Z'
  ].join(' ');
}

export default function InteractiveDartboard({ 
  onScoreSubmit, 
  onBust, 
  activePlayerName = 'Player',
  startingScore = 501,
  currentScore = 501
}) {
  const [darts, setDarts] = useState([]); // array of { label, score, value, multiplier }
  const [zoomedSector, setZoomedSector] = useState(null); // null, number (1-20), or 'bull'

  const turnTotal = useMemo(() => {
    return darts.reduce((sum, d) => sum + d.score, 0);
  }, [darts]);

  const handleRecordDart = (value, multiplier, label) => {
    if (darts.length >= 3) return;

    let score = value * multiplier;
    let customLabel = label;
    if (!customLabel) {
      if (multiplier === 3) customLabel = `T${value}`;
      else if (multiplier === 2) customLabel = `D${value}`;
      else customLabel = `S${value}`;
    }

    const newDarts = [...darts, { label: customLabel, score, value, multiplier }];
    setDarts(newDarts);
    setZoomedSector(null); // reset zoom after registering dart
  };

  const handleMiss = () => {
    handleRecordDart(0, 0, 'Miss');
  };

  const handleUndoDart = () => {
    setDarts(prev => prev.slice(0, -1));
    setZoomedSector(null);
  };

  const handleBoardClick = (e) => {
    // If not zoomed, compute sector clicked and zoom in
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const svgX = ((clientX - rect.left) / rect.width) * 400 - 200;
    const svgY = ((clientY - rect.top) / rect.height) * 400 - 200;

    const dist = Math.sqrt(svgX * svgX + svgY * svgY);

    if (dist <= R_OUTER_BULL + 10) {
      setZoomedSector('bull');
      return;
    }

    if (dist > R_BOARD + 10) {
      return;
    }

    // Determine angle (0 at top, clockwise)
    let angle = (Math.atan2(svgY, svgX) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    // Each sector is 18 degrees, centered on (-9 to +9) for top (20)
    let sectorIndex = Math.floor((angle + 9) / 18) % 20;
    const num = SECTORS[sectorIndex];
    setZoomedSector(num);
  };

  // Zoom transform calculation
  const zoomTransform = useMemo(() => {
    if (!zoomedSector) return 'translate(0, 0) scale(1)';

    if (zoomedSector === 'bull') {
      return 'translate(0, 0) scale(3.2)';
    }

    const idx = SECTORS.indexOf(zoomedSector);
    const centerAngle = idx * 18;
    const centerPoint = polarToCartesian(0, 0, 130, centerAngle);

    // Zoom and pan toward the center of that sector
    const scale = 2.6;
    const tx = -centerPoint.x * (scale - 1);
    const ty = -centerPoint.y * (scale - 1);

    return `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [zoomedSector]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto select-none">
      {/* Turn Darts Header Strip */}
      <div className="w-full bg-[#131b2a] border border-white/10 rounded-2xl p-3 mb-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((idx) => {
            const dart = darts[idx];
            const isCurrent = darts.length === idx;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl border transition-all ${
                  dart
                    ? 'bg-[#1a2538] border-[#00f0a8] shadow-[0_0_10px_rgba(0,240,168,0.2)]'
                    : isCurrent
                    ? 'bg-[#182436] border-white/30 animate-pulse'
                    : 'bg-[#0e1420] border-white/5 opacity-50'
                }`}
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  D{idx + 1}
                </span>
                <span className="text-xs font-black text-white truncate max-w-[48px]">
                  {dart ? dart.label : '—'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-end pr-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Turn Total</span>
          <span className="text-2xl font-black text-[#00f0a8] leading-none">{turnTotal}</span>
        </div>
      </div>

      {/* Interactive Dartboard Area */}
      <div className="relative w-full aspect-square max-h-[360px] bg-[#0d121c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-2">
        {/* SVG Board */}
        <svg
          viewBox="-200 -200 400 400"
          className="w-full h-full cursor-pointer transition-transform duration-300 ease-out"
          style={{ transform: zoomTransform, transformOrigin: 'center center' }}
          onClick={handleBoardClick}
        >
          {/* Board Background Ring */}
          <circle cx="0" cy="0" r={R_BOARD} fill="#0a0e17" stroke="#1f293d" strokeWidth="3" />

          {/* 20 Sectors */}
          {SECTORS.map((num, idx) => {
            const startAngle = idx * 18 - 9;
            const endAngle = idx * 18 + 9;
            const isEven = idx % 2 === 0;

            const singleColor = isEven ? '#111827' : '#e2e8f0';
            const ringColor = isEven ? '#f43f5e' : '#00f0a8';

            const numPos = polarToCartesian(0, 0, 186, idx * 18);

            return (
              <g key={num} id={`sector-${num}`}>
                {/* Outer Double Ring */}
                <path
                  d={describeArcSegment(R_DOUBLE_MIN, R_DOUBLE_MAX, startAngle, endAngle)}
                  fill={ringColor}
                  stroke="#0a0e17"
                  strokeWidth="0.8"
                  className="hover:brightness-125 transition-all"
                  onClick={(e) => {
                    if (zoomedSector) {
                      e.stopPropagation();
                      handleRecordDart(num, 2);
                    }
                  }}
                />

                {/* Outer Single Bed */}
                <path
                  d={describeArcSegment(R_OUTER_SINGLE_MIN, R_OUTER_SINGLE_MAX, startAngle, endAngle)}
                  fill={singleColor}
                  stroke="#0a0e17"
                  strokeWidth="0.8"
                  className="hover:brightness-110 transition-all"
                  onClick={(e) => {
                    if (zoomedSector) {
                      e.stopPropagation();
                      handleRecordDart(num, 1);
                    }
                  }}
                />

                {/* Triple Ring */}
                <path
                  d={describeArcSegment(R_TRIPLE_MIN, R_TRIPLE_MAX, startAngle, endAngle)}
                  fill={ringColor}
                  stroke="#0a0e17"
                  strokeWidth="0.8"
                  className="hover:brightness-125 transition-all"
                  onClick={(e) => {
                    if (zoomedSector) {
                      e.stopPropagation();
                      handleRecordDart(num, 3);
                    }
                  }}
                />

                {/* Inner Single Bed */}
                <path
                  d={describeArcSegment(R_INNER_SINGLE_MIN, R_INNER_SINGLE_MAX, startAngle, endAngle)}
                  fill={singleColor}
                  stroke="#0a0e17"
                  strokeWidth="0.8"
                  className="hover:brightness-110 transition-all"
                  onClick={(e) => {
                    if (zoomedSector) {
                      e.stopPropagation();
                      handleRecordDart(num, 1);
                    }
                  }}
                />

                {/* Number Text on Outer Ring */}
                <text
                  x={numPos.x}
                  y={numPos.y}
                  fill="#ffffff"
                  fontSize="15"
                  fontWeight="900"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                >
                  {num}
                </text>
              </g>
            );
          })}

          {/* Outer Bull (25) */}
          <circle
            cx="0"
            cy="0"
            r={R_OUTER_BULL}
            fill="#00f0a8"
            stroke="#0a0e17"
            strokeWidth="1"
            className="hover:brightness-125 transition-all"
            onClick={(e) => {
              if (zoomedSector) {
                e.stopPropagation();
                handleRecordDart(25, 1, '25 (Bull)');
              }
            }}
          />

          {/* Inner Bull / Bullseye (50) */}
          <circle
            cx="0"
            cy="0"
            r={R_BULL}
            fill="#f43f5e"
            stroke="#0a0e17"
            strokeWidth="1"
            className="hover:brightness-125 transition-all"
            onClick={(e) => {
              if (zoomedSector) {
                e.stopPropagation();
                handleRecordDart(50, 1, 'D-Bull (50)');
              }
            }}
          />
        </svg>

        {/* Zoom Overlay HUD with Precise Quick-Select Pills */}
        {zoomedSector && (
          <div className="absolute inset-x-2 bottom-2 bg-[#0a0e17]/95 border border-white/15 backdrop-blur-md rounded-2xl p-2.5 flex flex-col gap-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-20">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#00f0a8]" />
                {zoomedSector === 'bull' ? 'Center Bull Area' : `Target Sector: ${zoomedSector}`}
              </span>
              <button
                onClick={() => setZoomedSector(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
                <span>Reset Zoom</span>
              </button>
            </div>

            {zoomedSector === 'bull' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRecordDart(50, 1, 'D-Bull (50)')}
                  className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl font-black text-xs text-rose-300 transition-all flex flex-col items-center cursor-pointer"
                >
                  <span className="text-[10px] uppercase font-bold text-rose-400">Bullseye</span>
                  <span className="text-base font-black text-white">50 Pts</span>
                </button>
                <button
                  onClick={() => handleRecordDart(25, 1, '25 (Bull)')}
                  className="py-2.5 px-3 bg-[#00f0a8]/20 hover:bg-[#00f0a8]/30 border border-[#00f0a8]/40 rounded-xl font-black text-xs text-[#00f0a8] transition-all flex flex-col items-center cursor-pointer"
                >
                  <span className="text-[10px] uppercase font-bold text-teal-300">Outer Bull</span>
                  <span className="text-base font-black text-white">25 Pts</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleRecordDart(zoomedSector, 3)}
                  className="py-2 px-1 bg-[#00f0a8]/20 hover:bg-[#00f0a8]/30 border border-[#00f0a8]/40 rounded-xl text-center transition-all cursor-pointer"
                >
                  <span className="text-[9px] font-extrabold uppercase text-[#00f0a8] block">Triple</span>
                  <span className="text-sm font-black text-white">{zoomedSector * 3}</span>
                </button>
                <button
                  onClick={() => handleRecordDart(zoomedSector, 2)}
                  className="py-2 px-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-center transition-all cursor-pointer"
                >
                  <span className="text-[9px] font-extrabold uppercase text-rose-400 block">Double</span>
                  <span className="text-sm font-black text-white">{zoomedSector * 2}</span>
                </button>
                <button
                  onClick={() => handleRecordDart(zoomedSector, 1)}
                  className="py-2 px-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center transition-all cursor-pointer"
                >
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Single</span>
                  <span className="text-sm font-black text-white">{zoomedSector}</span>
                </button>
                <button
                  onClick={handleMiss}
                  className="py-2 px-1 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-center transition-all cursor-pointer"
                >
                  <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Miss</span>
                  <span className="text-sm font-black text-slate-400">0</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tap Helper prompt when not zoomed */}
        {!zoomedSector && darts.length < 3 && (
          <div className="absolute top-2 left-2 bg-[#0a0e17]/80 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full pointer-events-none">
            <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0a8] animate-ping" />
              Tap sector to zoom & select
            </span>
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="grid grid-cols-4 gap-2 w-full mt-2">
        <button
          onClick={handleUndoDart}
          disabled={darts.length === 0}
          className="py-3 bg-[#162030] hover:bg-[#1d2a3f] disabled:opacity-30 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-white/[0.06] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={handleMiss}
          disabled={darts.length >= 3}
          className="py-3 bg-[#162030] hover:bg-[#1d2a3f] disabled:opacity-30 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-white/[0.06] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Miss (0)</span>
        </button>

        <button
          onClick={onBust}
          className="py-3 bg-[#23151c] hover:bg-[#2e1924] text-rose-400 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          Bust
        </button>

        <button
          onClick={() => {
            onScoreSubmit(turnTotal, darts);
            setDarts([]);
          }}
          disabled={darts.length === 0}
          className="py-3 bg-[#00f0a8] hover:bg-[#00d694] disabled:opacity-35 disabled:bg-[#1b2638] disabled:text-slate-500 text-[#0a0e17] font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,240,168,0.3)] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
}
