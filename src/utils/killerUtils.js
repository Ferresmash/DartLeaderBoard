// Dartboard sectors in clockwise order starting from 20 at top
export const DARTBOARD_SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const TOTAL_SECTORS = 20;

export const KILLER_DIFFICULTIES = [
  { 
    id: 'hard', 
    name: 'Hard', 
    slices: 1, 
    badge: '1 Number',
    description: '1 random number per player',
    maxPlayers: 20 // 20 * 1 = 20 <= 20
  },
  { 
    id: 'medium', 
    name: 'Medium', 
    slices: 2, 
    badge: '2 Numbers',
    description: '2 adjacent numbers per player',
    maxPlayers: 10 // 10 * 2 = 20 <= 20
  },
  { 
    id: 'easy', 
    name: 'Easy', 
    slices: 3, 
    badge: '3 Numbers',
    description: '3 adjacent numbers per player',
    maxPlayers: 6 // 6 * 3 = 18 <= 20
  }
];

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
    secondaryHex: '#5eead4', // Lighter neon mint for treble/double
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
    secondaryHex: '#d8b4fe', // Lighter lavender for treble/double
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
    secondaryHex: '#fdba74', // Lighter peach orange for treble/double
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
    secondaryHex: '#fef08a', // Lighter pastel yellow for treble/double
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
    secondaryHex: '#67e8f9', // Lighter sky cyan for treble/double
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
    secondaryHex: '#fda4af', // Lighter pastel rose for treble/double
    cardBgActive: 'bg-[#291018]',
    cardBgInactive: 'bg-[#121824]'
  }
];

/**
 * Checks if the number of players exceeds available slices for the given difficulty
 */
export function isBoardOverfilled(playerCount, slicesPerPlayer) {
  return playerCount * slicesPerPlayer > TOTAL_SECTORS;
}

/**
 * Returns the maximum number of players permitted for a given slice count
 */
export function getMaxPlayersForSlices(slicesPerPlayer) {
  return Math.floor(TOTAL_SECTORS / slicesPerPlayer);
}

/**
 * Randomly assigns slices to players such that:
 * - Each individual player's slices are adjacent to each other on the circular board.
 * - Slices of different players are scattered randomly across the board (not necessarily adjacent).
 * - No players overlap.
 * 
 * @param {Array} players - Array of players
 * @param {number} slicesPerPlayer - 1, 2, or 3
 * @returns {Object} Mapping of playerId -> Array of numbers
 */
export function assignRandomAdjacentSlices(players, slicesPerPlayer) {
  const maxPossible = getMaxPlayersForSlices(slicesPerPlayer);
  const activePlayers = players.slice(0, maxPossible);
  const numPlayers = activePlayers.length;

  if (numPlayers === 0) return {};

  // For 1 slice per player: randomly pick unique sectors anywhere on the board
  if (slicesPerPlayer === 1) {
    const shuffled = [...DARTBOARD_SECTORS].sort(() => Math.random() - 0.5);
    const assignments = {};
    activePlayers.forEach((p, i) => {
      assignments[p.id || i] = [shuffled[i]];
    });
    return assignments;
  }

  // For 2 or 3 slices per player:
  // Randomly find non-overlapping contiguous blocks of length `slicesPerPlayer`
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    const usedIndices = new Set();
    const candidateBlocks = [];

    // Shuffle all possible starting sector indices (0..19)
    const possibleStarts = Array.from({ length: TOTAL_SECTORS }, (_, i) => i)
      .sort(() => Math.random() - 0.5);

    for (const start of possibleStarts) {
      if (candidateBlocks.length === numPlayers) break;

      const blockIndices = [];
      let canPlace = true;
      for (let s = 0; s < slicesPerPlayer; s++) {
        const idx = (start + s) % TOTAL_SECTORS;
        if (usedIndices.has(idx)) {
          canPlace = false;
          break;
        }
        blockIndices.push(idx);
      }

      if (canPlace) {
        blockIndices.forEach(idx => usedIndices.add(idx));
        candidateBlocks.push(blockIndices);
      }
    }

    if (candidateBlocks.length === numPlayers) {
      // Successfully found non-overlapping random blocks!
      // Shuffle the order of blocks to players
      const shuffledBlocks = [...candidateBlocks].sort(() => Math.random() - 0.5);
      const assignments = {};
      activePlayers.forEach((p, i) => {
        assignments[p.id || i] = shuffledBlocks[i].map(idx => DARTBOARD_SECTORS[idx]);
      });
      return assignments;
    }
  }

  // Fallback: contiguous blocks with a randomized starting offset
  const fallbackOffset = Math.floor(Math.random() * TOTAL_SECTORS);
  const fallbackAssignments = {};
  activePlayers.forEach((p, i) => {
    const pSlices = [];
    for (let s = 0; s < slicesPerPlayer; s++) {
      const idx = (fallbackOffset + i * slicesPerPlayer + s) % TOTAL_SECTORS;
      pSlices.push(DARTBOARD_SECTORS[idx]);
    }
    fallbackAssignments[p.id || i] = pSlices;
  });
  return fallbackAssignments;
}

/**
 * Builds a sector-to-player lookup map for quick hit detection and board coloring
 */
export function buildSectorPlayerMap(playersWithSlices) {
  const map = {};
  playersWithSlices.forEach(p => {
    if (p.assignedSlices && Array.isArray(p.assignedSlices)) {
      p.assignedSlices.forEach(sectorNum => {
        map[sectorNum] = {
          playerId: p.id,
          playerName: p.name,
          color: p.theme?.accentHex || '#00f0a8',
          secondaryColor: p.theme?.secondaryHex || '#5eead4',
          theme: p.theme,
          isEliminated: !!p.isEliminated,
          isKiller: !!p.isKiller,
          hearts: p.hearts ?? 0
        };
      });
    }
  });
  return map;
}
