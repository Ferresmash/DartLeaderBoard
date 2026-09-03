import { HashRouter, Routes, Route } from 'react-router-dom';
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
import CompareStats from './views/CompareStats';
import { useEffect, useState } from 'react';
import { getPlayers, getMatches } from './firebase/db';
import { DartFlowLogoMark } from './components/DartFlowLogo';

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e17]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#00f0a8]/20 border-t-[#00f0a8] rounded-full animate-spin shadow-[0_0_25px_rgba(0,240,168,0.4)]" />
            <div className="absolute">
              <DartFlowLogoMark className="w-7 h-7" />
            </div>
          </div>
          <p className="text-[#00f0a8] font-black tracking-widest text-xs uppercase animate-pulse">
            Loading DartTable
          </p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-[100dvh] bg-[#0a0e17] text-slate-100 font-sans selection:bg-[#00f0a8]/30 selection:text-white overflow-x-hidden">
        <Navigation />
        <div className="max-w-md md:max-w-6xl mx-auto w-full min-h-[100dvh] pt-0 md:pt-20 pb-0 relative transition-all duration-300">
          <Routes>
            <Route path="/" element={<Home players={players} matches={matches} />} />
            <Route path="/add" element={<AddPlayer onPlayerAdded={fetchData} />} />
            <Route path="/profile" element={<PlayerProfiles players={players} matches={matches} />} />
            <Route path="/profile/:id" element={<PlayerDetail players={players} matches={matches} />} />
            <Route path="/game" element={<GameLobby players={players} />} />
            <Route path="/game/setup" element={<GameSetup />} />
            <Route path="/game/play" element={<GamePlay onMatchComplete={fetchData} />} />
            <Route path="/matches" element={<MatchesList matches={matches} players={players} />} />
            <Route path="/matches/:id" element={<MatchDetail matches={matches} players={players} />} />
            <Route path="/compare" element={<CompareStats players={players} matches={matches} />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}

