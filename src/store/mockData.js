import ferdinandImg from './img/ferdinand.png';
import maxImg from './img/max.png';
import emilImg from './img/emil.png';
import tedImg from './img/ted.png';
import galtenImg from './img/galten.png';
import lunkanImg from './img/lunkan.png';

export const initialPlayers = [
  { id: 'ferdinand', name: 'Ferdinand Öhrn', totalWins: 0, gamesPlayed: 0, bestScore: 0, pfpUrl: ferdinandImg },
  { id: 'max', name: 'Max Sundberg', totalWins: 0, gamesPlayed: 0, bestScore: 0, pfpUrl: maxImg },
  { id: 'emil', name: 'Emil Holm', totalWins: 0, gamesPlayed: 0, bestScore: 0, pfpUrl: emilImg },
  { id: 'ted', name: 'Ted Boman', totalWins: 0, gamesPlayed: 0, bestScore: 0, pfpUrl: tedImg },
  { id: 'galten', name: 'Galten', totalWins: 0, gamesPlayed: 0, bestScore: 0, pfpUrl: galtenImg },
  { id: 'lunkan', name: 'Lunkan', totalWins: 0, gamesPlayed: 0, bestScore: 0, pfpUrl: lunkanImg }
];

// Initialize empty deployment match history constraint.
const generateMockMatches = () => {
  return [];
};

export const mockMatches = generateMockMatches();
