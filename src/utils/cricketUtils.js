export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25]; // 25 represents Bull / Bullseye

export const CRICKET_TARGET_LABELS = {
  20: '20',
  19: '19',
  18: '18',
  17: '17',
  16: '16',
  15: '15',
  25: 'BULL'
};

export const PLAYER_THEMES = [
  {
    id: 'teal',
    border: 'border-[#00f0a8]',
    borderInactive: 'border-[#00f0a8]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(0,240,168,0.35)]',
    badgeBg: 'bg-[#00f0a8]',
    badgeText: 'text-[#0a0e17]',
    scoreText: 'text-[#00f0a8]',
    avgText: 'text-[#00f0a8]/80',
    ring: 'ring-[#00f0a8]',
    accentHex: '#00f0a8',
    cardBgActive: 'bg-[#0e2422]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'purple',
    border: 'border-[#a855f7]',
    borderInactive: 'border-[#a855f7]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    badgeBg: 'bg-[#a855f7]',
    badgeText: 'text-white',
    scoreText: 'text-[#c084fc]',
    avgText: 'text-[#c084fc]/80',
    ring: 'ring-[#a855f7]',
    accentHex: '#a855f7',
    cardBgActive: 'bg-[#22132e]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'orange',
    border: 'border-[#f97316]',
    borderInactive: 'border-[#f97316]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.35)]',
    badgeBg: 'bg-[#f97316]',
    badgeText: 'text-white',
    scoreText: 'text-[#fb923c]',
    avgText: 'text-[#fb923c]/80',
    ring: 'ring-[#f97316]',
    accentHex: '#f97316',
    cardBgActive: 'bg-[#281812]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'yellow',
    border: 'border-[#eab308]',
    borderInactive: 'border-[#eab308]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.35)]',
    badgeBg: 'bg-[#eab308]',
    badgeText: 'text-[#0a0e17]',
    scoreText: 'text-[#facc15]',
    avgText: 'text-[#facc15]/80',
    ring: 'ring-[#eab308]',
    accentHex: '#eab308',
    cardBgActive: 'bg-[#282210]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'cyan',
    border: 'border-[#06b6d4]',
    borderInactive: 'border-[#06b6d4]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    badgeBg: 'bg-[#06b6d4]',
    badgeText: 'text-white',
    scoreText: 'text-[#22d3ee]',
    avgText: 'text-[#22d3ee]/80',
    ring: 'ring-[#06b6d4]',
    accentHex: '#06b6d4',
    cardBgActive: 'bg-[#0e222b]',
    cardBgInactive: 'bg-[#121824]'
  },
  {
    id: 'rose',
    border: 'border-[#f43f5e]',
    borderInactive: 'border-[#f43f5e]/35',
    activeGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    badgeBg: 'bg-[#f43f5e]',
    badgeText: 'text-white',
    scoreText: 'text-[#fb7185]',
    avgText: 'text-[#fb7185]/80',
    ring: 'ring-[#f43f5e]',
    accentHex: '#f43f5e',
    cardBgActive: 'bg-[#291018]',
    cardBgInactive: 'bg-[#121824]'
  }
];

/**
 * Checks if a target is closed (has 3 or more marks) by all players
 */
export function isTargetClosedByAll(target, players) {
  if (!players || players.length === 0) return false;
  return players.every(p => (p.cricketMarks?.[target] || 0) >= 3);
}

/**
 * Checks if a player has closed all 7 Cricket targets
 */
export function hasPlayerClosedAll(player) {
  if (!player || !player.cricketMarks) return false;
  return CRICKET_TARGETS.every(t => (player.cricketMarks[t] || 0) >= 3);
}

/**
 * Checks if a player has won Cricket
 * (Has closed all targets AND has score >= all opponents)
 */
export function checkCricketWinner(players) {
  for (const p of players) {
    if (hasPlayerClosedAll(p)) {
      const highestScore = Math.max(...players.map(pl => pl.cricketScore || 0));
      if ((p.cricketScore || 0) >= highestScore) {
        return p;
      }
    }
  }
  return null;
}
