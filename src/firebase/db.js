import { db } from './config';
import { ref, get, set, push, update, child } from 'firebase/database';
import { initialPlayers, mockMatches } from '../store/mockData';

// Fetch all players
export const getPlayers = async () => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `players`));
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => {
      const localPlayer = initialPlayers.find(p => p.id === key);
      return {
        id: key,
        ...data[key],
        gamesPlayed: data[key].gamesPlayed !== undefined ? data[key].gamesPlayed : (data[key].totalWins || 0),
        name: localPlayer ? localPlayer.name : data[key].name,
        pfpUrl: localPlayer ? localPlayer.pfpUrl : ''
      };
    });
  } else {
    // Very first run: database is empty, initialize it with local mock players
    const playersObj = {};
    initialPlayers.forEach(p => {
      const { id, pfpUrl, ...rest } = p; 
      playersObj[id] = rest;
    });
    await set(ref(db, 'players'), playersObj);
    return initialPlayers;
  }
};

// Fetch all matches
export const getMatches = async () => {
  const dbRef = ref(db, 'matches');
  const snapshot = await get(dbRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    const matchesArray = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
    return matchesArray.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    const matchesObj = {};
    mockMatches.forEach(m => {
      const newKey = push(ref(db, 'matches')).key;
      matchesObj[newKey] = {
        winnerId: m.winnerId,
        timestamp: m.timestamp,
        dateString: m.dateString
      };
    });
    await set(ref(db, 'matches'), matchesObj);
    return mockMatches.sort((a, b) => b.timestamp - a.timestamp);
  }
};

// Add win (Manual Legacy method for AddScore view)
export const addWin = async (playerId) => {
  const now = new Date();
  
  const matchData = {
    winnerId: playerId,
    timestamp: now.getTime(),
    dateString: now.toISOString()
  };
  
  const updates = {};
  const newMatchKey = push(child(ref(db), 'matches')).key;
  updates[`/matches/${newMatchKey}`] = matchData;
  
  const playerRef = ref(db, `players/${playerId}`);
  const playerSnapshot = await get(playerRef);
  
  if (playerSnapshot.exists()) {
    const dbP = playerSnapshot.val();
    updates[`/players/${playerId}/totalWins`] = (dbP.totalWins || 0) + 1;
    updates[`/players/${playerId}/gamesPlayed`] = (dbP.gamesPlayed || dbP.totalWins || 0) + 1;
  } else {
    updates[`/players/${playerId}/totalWins`] = 1;
    updates[`/players/${playerId}/gamesPlayed`] = 1;
  }
  
  await update(ref(db), updates);
  return true;
};

// Advanced Game Post-Match synchronizer
export const submitMatchData = async (winnerId, participantIds, bestScores, turns = [], startingScore = 501) => {
  const now = new Date();
  
  const matchData = {
    winnerId: winnerId,
    participantIds: participantIds,
    turns: turns,
    startingScore: startingScore,
    timestamp: now.getTime(),
    dateString: now.toISOString()
  };
  
  const updates = {};
  const newMatchKey = push(child(ref(db), 'matches')).key;
  updates[`/matches/${newMatchKey}`] = matchData;
  
  const playersSnap = await get(ref(db, 'players'));
  if (playersSnap.exists()) {
    const dbPlayers = playersSnap.val();
    
    participantIds.forEach(pId => {
      const dbP = dbPlayers[pId] || { totalWins: 0, gamesPlayed: 0, bestScore: 0 };
      
      const newGamesPlayed = (dbP.gamesPlayed || dbP.totalWins || 0) + 1;
      let newTotalWins = dbP.totalWins || 0;
      let newBestScore = dbP.bestScore || 0;
      
      if (pId === winnerId) {
        newTotalWins += 1;
      }
      
      // Update high score secretly if beaten
      if (bestScores[pId] && bestScores[pId] > newBestScore) {
        newBestScore = bestScores[pId];
      }
      
      updates[`/players/${pId}/gamesPlayed`] = newGamesPlayed;
      updates[`/players/${pId}/totalWins`] = newTotalWins;
      updates[`/players/${pId}/bestScore`] = newBestScore;
    });
  }
  
  await update(ref(db), updates);
  return true;
};

// Add New Player
export const addPlayerToDb = async (name) => {
  const newKey = push(child(ref(db), 'players')).key;
  const playerData = {
    name: name,
    totalWins: 0,
    gamesPlayed: 0,
    bestScore: 0
  };
  
  const updates = {};
  updates[`/players/${newKey}`] = playerData;
  await update(ref(db), updates);
  return true;
};
