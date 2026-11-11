import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Zap, Clock, Skull, Target, Flame, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DartFlowHeader from '../components/DartFlowHeader';

const STROKE_COLORS = ['#00f0a8', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#f43f5e'];

export default function MatchDetail({ matches = [], players = [] }) {
  const { id } = useParams();
  const match = matches.find(m => m.id === id);

  const isKiller = match?.gameMode === 'killer' || match?.startingScore === 'Killer';
  const isCricket = match?.gameMode === 'cricket' || match?.startingScore === 'Cricket';
  const isAroundTheClock = match?.gameMode === 'around_the_clock' || match?.startingScore === 'Around the Clock';

  const resolvePlayer = (pId) => {
    const found = players.find(p => p.id === pId);
    if (found) return found;
    if (pId && pId.startsWith('guest__')) {
      return {
        id: pId,
        name: decodeURIComponent(pId.split('__')[1]),
        isGuest: true
      };
    }
    return { id: pId || 'unknown', name: pId || 'Unknown Player' };
  };

  const winner = resolvePlayer(match?.winnerId);
  const pIds = match?.participantIds || [];
  const participantList = pIds.map(resolvePlayer);

  // X01 Specific Memo
  const x01Data = useMemo(() => {
    if (!match || isKiller || isCricket || isAroundTheClock) return null;

    const startingScore = typeof match.startingScore === 'number' ? match.startingScore : parseInt(match.startingScore) || 501;
    const currentScores = {};
    pIds.forEach(pId => currentScores[pId] = startingScore);

    const dataPoints = [{ name: 'Start', ...currentScores }];
    let pHigh = -1;
    let pHighId = null;

    if (match.turns) {
      match.turns
        .filter(t => t && typeof t.score === 'number' && !isNaN(t.score))
        .sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0))
        .forEach((t, index) => {
          if (!t.isBust) {
            currentScores[t.playerId] = Math.max(0, currentScores[t.playerId] - t.score);
            if (t.score > pHigh) {
              pHigh = t.score;
              pHighId = t.playerId;
            }
          }
          dataPoints.push({ name: `${index+1}`, ...currentScores });
        });
    }

    const pStats = participantList.map((p, i) => {
      const pTurns = (match.turns || []).filter(t => t && t.playerId === p.id && !t.isBust && typeof t.score === 'number');
      const totalScore = pTurns.reduce((sum, t) => sum + t.score, 0);
      const avg = pTurns.length > 0 ? (totalScore / pTurns.length).toFixed(1) : '0.0';
      const high = pTurns.length > 0 ? Math.max(...pTurns.map(t => t.score)) : 0;
      
      const firstThreeTurns = pTurns.slice(0, 3);
      const nineDartSum = firstThreeTurns.reduce((sum, t) => sum + t.score, 0);
      const avg9 = (nineDartSum / 3).toFixed(1);

      return {
        ...p,
        avg,
        high,
        avg9,
        color: STROKE_COLORS[i % STROKE_COLORS.length]
      };
    });

    return {
      chartData: dataPoints,
      playerStats: pStats,
      highestScore: pHigh,
      highestScorer: resolvePlayer(pHighId),
      startingScore
    };
  }, [match, isKiller, isCricket, isAroundTheClock, pIds, participantList]);

  // Killer Specific Memo
  const killerData = useMemo(() => {
    if (!match || !isKiller) return null;

    let totalDarts = 0;
    let killsCount = {};
    let totalHits = {};

    pIds.forEach(pId => {
      killsCount[pId] = 0;
      totalHits[pId] = 0;
    });

    (match.turns || []).forEach(t => {
      (t.darts || []).forEach(d => {
        totalDarts++;
        if (d.type === 'kill') {
          killsCount[t.playerId] = (killsCount[t.playerId] || 0) + 1;
        }
        if (d.type === 'heart' || d.type === 'damage' || d.type === 'became_killer') {
          totalHits[t.playerId] = (totalHits[t.playerId] || 0) + 1;
        }
      });
    });

    const playerStats = participantList.map((p, i) => {
      const pTurns = (match.turns || []).filter(t => t.playerId === p.id);
      const dartsThrown = pTurns.reduce((acc, t) => acc + (t.darts?.length || 0), 0);
      return {
        ...p,
        dartsThrown,
        kills: killsCount[p.id] || 0,
        hits: totalHits[p.id] || 0,
        color: STROKE_COLORS[i % STROKE_COLORS.length]
      };
    });

    return {
      totalDarts,
      playerStats,
      turnHistory: match.turns || []
    };
  }, [match, isKiller, pIds, participantList]);

  if (!match) return <Navigate to="/matches" />;

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader showBack />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Match Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
              isKiller ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
              isCricket ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
              isAroundTheClock ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
              'bg-[#00f0a8]/20 text-[#00f0a8] border-[#00f0a8]/30'
            }`}>
              {match.gameMode ? match.gameMode.toUpperCase().replace(/_/g, ' ') : (match.startingScore || 'X01')}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {match.dateString ? new Date(match.dateString).toLocaleDateString() : ''}
            </span>
          </div>
        </div>

        {/* Top Winner Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Winner Card */}
          <div className="bg-[#131b2a] border border-[#00f0a8]/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(0,240,168,0.15)] relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[#00f0a8]/15 border border-[#00f0a8]/40 flex items-center justify-center text-[#00f0a8] mb-3 shadow-[0_0_15px_rgba(0,240,168,0.3)]">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00f0a8] mb-1">
              {isKiller ? 'Survivor & Winner' : 'Match Winner'}
            </span>
            <h2 className="text-2xl font-black text-white">{winner?.name || 'Unknown'}</h2>
          </div>

          {/* Mode Highlights Card */}
          {isKiller && (
            <div className="bg-[#131b2a] border border-rose-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(244,63,94,0.15)] relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Skull className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 mb-1">Total Darts In Game</span>
              <span className="text-3xl font-black text-rose-300 mt-0.5">{killerData?.totalDarts || 0}</span>
            </div>
          )}

          {!isKiller && x01Data && (
            <div className="bg-[#131b2a] border border-[#f97316]/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(249,115,22,0.15)] relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-[#f97316]/15 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] mb-3 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <Zap className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-1">Highest Throw</span>
              <h2 className="text-2xl font-black text-white">{x01Data.highestScorer?.name || 'Unknown'}</h2>
              <span className="text-3xl font-black text-[#f97316] mt-0.5">{x01Data.highestScore > -1 ? x01Data.highestScore : '-'}</span>
            </div>
          )}
        </div>

        {/* X01 Score Timeline Chart */}
        {!isKiller && !isCricket && !isAroundTheClock && x01Data && (
          <div className="bg-[#131b2a] border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-xl flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 className="font-extrabold text-white text-base">Score Timeline</h3>
              <div className="flex flex-wrap gap-2">
                {participantList.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-[#0a0e17] px-2.5 py-1 rounded-lg border border-white/5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STROKE_COLORS[i % STROKE_COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-300">{p.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={x01Data.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} dy={8} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, x01Data.startingScore]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#101726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  
                  {participantList.map((p, i) => (
                    <Line 
                      key={p.id}
                      type="stepAfter" 
                      dataKey={p.id} 
                      name={p.name.split(' ')[0]}
                      stroke={STROKE_COLORS[i % STROKE_COLORS.length]} 
                      strokeWidth={3} 
                      dot={{ r: 0 }} 
                      activeDot={{ r: 5, fill: STROKE_COLORS[i % STROKE_COLORS.length], stroke: "#0a0e17", strokeWidth: 2 }} 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Killer Player Stats Breakdown */}
        {isKiller && killerData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {killerData.playerStats.map((p) => (
              <div key={p.id} className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a2336] flex items-center justify-center font-extrabold text-white text-xs border" style={{ borderColor: p.color }}>
                    {p.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{p.name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {p.id === match.winnerId ? '🏆 Winner' : 'Participant'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#0a0e17] p-2.5 rounded-xl border border-white/5 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Kills</span>
                    <span className="text-sm font-black text-rose-400">{p.kills}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Hits</span>
                    <span className="text-sm font-black text-[#00f0a8]">{p.hits}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Darts</span>
                    <span className="text-sm font-black text-cyan-400">{p.dartsThrown}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* X01 Player Stats Breakdown */}
        {!isKiller && x01Data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {x01Data.playerStats.map((p) => (
              <div key={p.id} className="bg-[#131b2a] border border-white/[0.08] rounded-2xl p-4 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a2336] flex items-center justify-center font-extrabold text-white text-xs border" style={{ borderColor: p.color }}>
                    {p.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{p.name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Participant</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#0a0e17] p-2.5 rounded-xl border border-white/5 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Avg</span>
                    <span className="text-sm font-black text-[#00f0a8]">{p.avg}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">High</span>
                    <span className="text-sm font-black text-[#f97316]">{p.high}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">9 Dart</span>
                    <span className="text-sm font-black text-[#a855f7]">{p.avg9}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
