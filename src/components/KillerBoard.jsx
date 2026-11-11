import React, { useMemo } from 'react';
import { Skull, ZoomIn, ZoomOut } from 'lucide-react';

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

export default function KillerBoard({
  sectorPlayerMap = {},
  activePlayerId = null,
  isKiller = false,
  canAttack = false,
  activePlayerSlices = [],
  targetSlices = [],
  isZoomEnabled = true,
  onToggleZoom,
  onHitSector
}) {
  const handleSectorClick = (num, multiplier, e) => {
    e.stopPropagation();
    if (onHitSector) {
      onHitSector(num, multiplier);
    }
  };

  const handleBoardMiss = () => {
    if (onHitSector) {
      onHitSector(0, 0);
    }
  };

  // Smart Mini-Zoom Transform Calculation: perfectly centers target sectors with 100% visibility of double ring
  const zoomTransform = useMemo(() => {
    if (!isZoomEnabled || !Array.isArray(targetSlices) || targetSlices.length === 0) {
      return 'translate(0px, 0px) scale(1)';
    }

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    targetSlices.forEach(sec => {
      const idx = SECTORS.indexOf(sec);
      if (idx !== -1) {
        // midAngle for sector idx (0 deg at top 20, clockwise)
        const angleRad = ((idx * 18 - 90) * Math.PI) / 180.0;
        sumX += Math.cos(angleRad);
        sumY += Math.sin(angleRad);
        count++;
      }
    });

    if (count === 0 || (Math.abs(sumX) < 0.05 && Math.abs(sumY) < 0.05)) {
      // Symmetrically distributed across entire board
      return 'translate(0px, 0px) scale(1.15)';
    }

    const angle = Math.atan2(sumY, sumX);
    // Midpoint radius of single beds (center of target wedge)
    const R_FOCUS = 95;
    const fx = R_FOCUS * Math.cos(angle);
    const fy = R_FOCUS * Math.sin(angle);

    // Mini-zoom scale: 1.35x enlarges targets while translation brings them dead-center
    // Double ring (R=172) transforms to 172 * 1.35 - 95 * 1.05 = ~132px (fully inside 200px boundary)
    const scale = 1.35;
    const tx = -fx * 1.05;
    const ty = -fy * 1.05;

    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale})`;
  }, [isZoomEnabled, targetSlices]);

  return (
    <div className="relative w-full max-w-[400px] aspect-square mx-auto flex items-center justify-center select-none overflow-hidden rounded-3xl bg-[#070b12] shadow-2xl border border-white/5">
      {/* Zoom Toggle Pill Button */}
      <button
        onClick={onToggleZoom}
        className="absolute top-2.5 right-2.5 z-20 bg-[#0c1320]/85 hover:bg-[#152035] border border-white/10 text-slate-300 hover:text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer"
        title={isZoomEnabled ? "Reset to full board" : "Enable target mini-zoom"}
      >
        {isZoomEnabled ? <ZoomOut className="w-3 h-3 text-[#00f0a8]" /> : <ZoomIn className="w-3 h-3 text-slate-400" />}
        <span>{isZoomEnabled ? 'Target Zoom' : 'Full Board'}</span>
      </button>

      {/* SVG Board */}
      <svg
        viewBox="-200 -200 400 400"
        className="w-full h-full drop-shadow-[0_0_35px_rgba(0,0,0,0.8)] cursor-pointer"
        style={{
          transform: zoomTransform,
          transformOrigin: 'center center',
          transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={handleBoardMiss}
      >
        <defs>
          <filter id="killer-pulse" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Board Background Circle */}
        <circle cx="0" cy="0" r={R_BOARD} fill="#070b12" stroke="#172133" strokeWidth="3" />

        {/* 20 Dartboard Sectors */}
        {SECTORS.map((num, idx) => {
          const startAngle = idx * 18 - 9;
          const endAngle = idx * 18 + 9;
          const midAngle = idx * 18;
          const isEven = idx % 2 === 0;

          const player = sectorPlayerMap ? sectorPlayerMap[num] : null;
          const isOwn = Array.isArray(activePlayerSlices) && activePlayerSlices.includes(num);
          const isOpponentTarget = canAttack && player && player.playerId !== activePlayerId && !player.isEliminated;
          const isOwnTarget = !isKiller && isOwn;

          const hearts = player ? (player.hearts ?? 0) : 0;
          const isOwnerKiller = player && player.isKiller && !player.isEliminated;
          const isEliminated = player && player.isEliminated;

          // Base neutral colors
          const neutralDark = isEven ? '#121824' : '#192233';
          const neutralRing = isEven ? '#202b3f' : '#161f30';

          // Color Fills based on hearts (0, 1, 2, 3):
          // Level 1: Inner single bed fills with player's color
          // Level 2: Inner single + Outer single bed fill with player's color
          // Level 3: Entire wedge (Inner + Outer single + Triple + Double) fills with player's color!
          const playerColor = player?.color || '#00f0a8';
          const secondaryColor = player?.secondaryColor || '#5eead4';

          let innerSingleFill = neutralDark;
          let outerSingleFill = neutralDark;
          let tripleFill = neutralRing;
          let doubleFill = neutralRing;

          if (player && !isEliminated) {
            // 1st Third (1 Heart): The square inside fills with primary color
            if (hearts >= 1) {
              innerSingleFill = playerColor;
            }
            // 2nd Third (2 Hearts): Outer square fills + Treble ring colors with lighter secondary color
            if (hearts >= 2) {
              outerSingleFill = playerColor;
              tripleFill = secondaryColor;
            }
            // 3rd Third (3 Hearts - KILLER): Double ring also colors with lighter secondary color
            if (hearts >= 3) {
              doubleFill = secondaryColor;
            }
          } else if (isEliminated) {
            innerSingleFill = '#0a0d14';
            outerSingleFill = '#0a0d14';
            tripleFill = '#0d111a';
            doubleFill = '#0d111a';
          }

          const numPos = polarToCartesian(0, 0, 186, midAngle);
          const iconPos = polarToCartesian(0, 0, 126, midAngle);

          return (
            <g key={num} id={`killer-sector-${num}`}>
              {/* Outer Double Ring */}
              <path
                d={describeArcSegment(R_DOUBLE_MIN, R_DOUBLE_MAX, startAngle, endAngle)}
                fill={doubleFill}
                fillOpacity={player && !isEliminated && hearts >= 3 ? 0.95 : 0.8}
                stroke={player && !isEliminated && hearts >= 3 ? secondaryColor : "#070b12"}
                strokeWidth={player && !isEliminated && hearts >= 3 ? "1.5" : "1"}
                className="hover:brightness-125 transition-all cursor-pointer"
                onClick={(e) => handleSectorClick(num, 2, e)}
              />

              {/* Outer Single Bed */}
              <path
                d={describeArcSegment(R_OUTER_SINGLE_MIN, R_OUTER_SINGLE_MAX, startAngle, endAngle)}
                fill={outerSingleFill}
                fillOpacity={player && !isEliminated && hearts >= 2 ? 0.88 : 0.95}
                stroke="#070b12"
                strokeWidth="1"
                className="hover:brightness-110 transition-all cursor-pointer"
                onClick={(e) => handleSectorClick(num, 1, e)}
              />

              {/* Triple Ring (Treble) */}
              <path
                d={describeArcSegment(R_TRIPLE_MIN, R_TRIPLE_MAX, startAngle, endAngle)}
                fill={tripleFill}
                fillOpacity={player && !isEliminated && hearts >= 2 ? 0.95 : 0.8}
                stroke={player && !isEliminated && hearts >= 2 ? secondaryColor : "#070b12"}
                strokeWidth={player && !isEliminated && hearts >= 2 ? "1.5" : "1"}
                className="hover:brightness-125 transition-all cursor-pointer"
                onClick={(e) => handleSectorClick(num, 3, e)}
              />

              {/* Inner Single Bed */}
              <path
                d={describeArcSegment(R_INNER_SINGLE_MIN, R_INNER_SINGLE_MAX, startAngle, endAngle)}
                fill={innerSingleFill}
                fillOpacity={player && !isEliminated && hearts >= 1 ? 0.88 : 0.95}
                stroke="#070b12"
                strokeWidth="1"
                className="hover:brightness-110 transition-all cursor-pointer"
                onClick={(e) => handleSectorClick(num, 1, e)}
              />

              {/* Colored Rim Indicator Arc */}
              {player && (
                <path
                  d={describeArcSegment(173, 178, startAngle, endAngle)}
                  fill={playerColor}
                  opacity={isEliminated ? 0.2 : 1}
                  stroke="#070b12"
                  strokeWidth="0.5"
                  className="cursor-pointer hover:brightness-125 transition-all"
                  onClick={(e) => handleSectorClick(num, 1, e)}
                />
              )}

              {/* Wedge border highlight if owned */}
              {player && !isEliminated && (
                <path
                  d={describeArcSegment(R_INNER_SINGLE_MIN, R_DOUBLE_MAX, startAngle, endAngle)}
                  fill="none"
                  stroke={playerColor}
                  strokeWidth={isOwnerKiller ? "2" : "1"}
                  strokeOpacity={isOwnerKiller ? 0.8 : 0.4}
                  className="pointer-events-none"
                />
              )}

              {/* TARGET PULSING OVERLAY (When Killer needs to attack this opponent, or Player needs to hit own slice) */}
              {isOpponentTarget && (
                <path
                  d={describeArcSegment(R_INNER_SINGLE_MIN, R_DOUBLE_MAX, startAngle, endAngle)}
                  fill="#f43f5e"
                  fillOpacity="0.22"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  className="pointer-events-none animate-pulse"
                />
              )}

              {isOwnTarget && (
                <path
                  d={describeArcSegment(R_INNER_SINGLE_MIN, R_DOUBLE_MAX, startAngle, endAngle)}
                  fill={playerColor}
                  fillOpacity="0.18"
                  stroke={playerColor}
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  className="pointer-events-none animate-pulse"
                />
              )}

              {/* Number Label on Outer Edge - Clickable for convenience */}
              <text
                x={numPos.x}
                y={numPos.y}
                fill={player ? (isEliminated ? '#475569' : playerColor) : '#64748b'}
                fontSize="15"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
                className="cursor-pointer select-none hover:scale-110 transition-transform"
                style={{
                  textShadow: player && !isEliminated ? `0 0 10px ${playerColor}80` : 'none'
                }}
                onClick={(e) => handleSectorClick(num, 1, e)}
              >
                {num}
              </text>

              {/* Sector Status Mark (Skull if Killer, X if Eliminated) */}
              {isOwnerKiller && (
                <circle
                  cx={iconPos.x}
                  cy={iconPos.y}
                  r="5"
                  fill="#f43f5e"
                  className="pointer-events-none drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                />
              )}

              {isEliminated && (
                <text
                  x={iconPos.x}
                  y={iconPos.y}
                  fill="#ef4444"
                  fontSize="12"
                  fontWeight="900"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none opacity-60"
                >
                  ✕
                </text>
              )}
            </g>
          );
        })}

        {/* Center Bull (Outer 25, Inner 50) */}
        <circle
          cx="0"
          cy="0"
          r={R_OUTER_BULL}
          fill="#0c121d"
          stroke="#1e293b"
          strokeWidth="1.5"
          className="hover:brightness-125 transition-all cursor-pointer"
          onClick={(e) => handleSectorClick(25, 1, e)}
        />
        <circle
          cx="0"
          cy="0"
          r={R_BULL}
          fill="#192233"
          stroke="#070b12"
          strokeWidth="1"
          className="hover:brightness-125 transition-all cursor-pointer"
          onClick={(e) => handleSectorClick(50, 1, e)}
        />
      </svg>
    </div>
  );
}
