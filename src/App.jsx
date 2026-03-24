import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './views/Home';
import AddPlayer from './views/AddPlayer';
import PlayerProfiles from './views/PlayerProfiles';
import PlayerDetail from './views/PlayerDetail';
import GameLobby from './views/game/Lobby';
import GameSetup from './views/game/Setup';
import GamePlay from './views/game/Play';
import MatchesList from './views/MatchesList';
import MatchDetail from './views/MatchDetail';
import { useEffect, useState } from 'react';
import { getPlayers, getMatches } from './firebase/db';

export default function App() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const p = await getPlayers();
      const m = await getMatches();
      setPlayers(p);
      setMatches(m);
    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          <p className="text-indigo-400 font-medium tracking-widest animate-pulse text-sm">LOADING</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
        <Navigation />
        <div className="max-w-md md:max-w-5xl mx-auto w-full min-h-[100dvh] pt-0 md:pt-28 pb-20 md:pb-0 relative transition-all duration-300">
          <Routes>
            <Route path="/" element={<Home players={players} matches={matches} />} />
            <Route path="/add" element={<AddPlayer onPlayerAdded={fetchData} />} />
            <Route path="/profile" element={<PlayerProfiles players={players} />} />
            <Route path="/profile/:id" element={<PlayerDetail players={players} matches={matches} />} />
            <Route path="/game" element={<GameLobby players={players} />} />
            <Route path="/game/setup" element={<GameSetup />} />
            <Route path="/game/play" element={<GamePlay onMatchComplete={fetchData} />} />
            <Route path="/matches" element={<MatchesList matches={matches} players={players} />} />
            <Route path="/matches/:id" element={<MatchDetail matches={matches} players={players} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
