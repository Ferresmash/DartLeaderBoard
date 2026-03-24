import ferdinandImg from './img/ferdinand.png';
import maxImg from './img/max.png';
import emilImg from './img/emil.png';
import tedImg from './img/ted.png';

export const initialPlayers = [
  { id: 'ferdinand', name: 'Ferdinand Öhrn', totalWins: 12, gamesPlayed: 25, bestScore: 40, pfpUrl: ferdinandImg },
  { id: 'max', name: 'Max Hedblom', totalWins: 8, gamesPlayed: 20, bestScore: 35, pfpUrl: maxImg },
  { id: 'emil', name: 'Emil Holm', totalWins: 15, gamesPlayed: 32, bestScore: 60, pfpUrl: emilImg },
  { id: 'ted', name: 'Ted Gärdestad', totalWins: 5, gamesPlayed: 14, bestScore: 20, pfpUrl: tedImg }
];

// Generates last 10 weeks of mock matches
const generateMockMatches = () => {
  const matches = [];
  const now = new Date();
  const players = ['ferdinand', 'max', 'emil', 'ted'];

  for (let i = 0; i < 40; i++) {
    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    const randomWeekOffset = Math.floor(Math.random() * 10); // past 10 weeks
    const date = new Date(now);
    date.setDate(date.getDate() - (randomWeekOffset * 7) - Math.floor(Math.random() * 7));

    matches.push({
      id: `mock_match_${i}`,
      winnerId: randomPlayer,
      timestamp: date.getTime(),
      dateString: date.toISOString()
    });
  }
  return matches;
};

export const mockMatches = generateMockMatches();
