import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Zap, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DartFlowHeader from '../components/DartFlowHeader';

const STROKE_COLORS = ['#00f0a8', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#f43f5e'];

export default function MatchDetail({ matches, players }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const match = matches.find(m => m.id === id);

  if (!match) return <Navigate to="/matches" />;

  const { chartData, participantList, playerStats, highestScore, highestScorer, winner } = useMemo(() => {
    const startingScore = match.startingScore || 501;
    const pIds = match.participantIds || [];
    
    if (pIds.length === 0 && match.turns) {
       match.turns.forEach(t => {
         if (!pIds.includes(t.playerId)) pIds.push(t.playerId);
       });
    }

    const currentScores = {};
    pIds.forEach(pId => currentScores[pId] = startingScore);

    const dataPoints = [];
    dataPoints.push({ name: 'Start', ...currentScores });

    let pHigh = -1;
    let pHighId = null;

    if (match.turns) {
      match.turns.sort((a,b) => a.timestamp - b.timestamp).forEach((t, index) => {
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

    const resolvePlayer = (id) => {
      const found = players.find(p => p.id === id);
      if (found) return found;
      if (id && id.startsWith('guest__')) {
        return {
          id,
          name: decodeURIComponent(id.split('__')[1]),
          isGuest: true
        };
      }
      return null;
    };

    const w = resolvePlayer(match.winnerId);
    const h = resolvePlayer(pHighId);
    const pList = pIds.map(resolvePlayer).filter(Boolean);

    const pStats = pList.map((p, i) => {
      const pTurns = (match.turns || []).filter(t => t.playerId === p.id && !t.isBust);
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
      participantList: pList,
      playerStats: pStats,
      highestScore: pHigh,
      highestScorer: h,
      winner: w
    };
  }, [match, players]);

  return (
    <div className="min-h-[100dvh] bg-[#0a0e17] font-sans pb-28 md:pb-12 flex flex-col">
      <DartFlowHeader showBack />

      <div className="max-w-4xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Top Winner & Highest Scorer Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Winner Card */}
          <div className="bg-[#131b2a] border border-[#00f0a8]/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(0,240,168,0.15)] relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[#00f0a8]/15 border border-[#00f0a8]/40 flex items-center justify-center text-[#00f0a8] mb-3 shadow-[0_0_15px_rgba(0,240,168,0.3)]">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00f0a8] mb-1">Match Winner</span>
            <h2 className="text-2xl font-black text-white">{winner?.name || 'Unknown'}</h2>
          </div>

          {/* Highest Score Card */}
          <div className="bg-[#131b2a] border border-[#f97316]/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(249,115,22,0.15)] relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[#f97316]/15 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] mb-3 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Zap className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-1">Highest Throw</span>
            <h2 className="text-2xl font-black text-white">{highestScorer?.name || 'Unknown'}</h2>
            <span className="text-3xl font-black text-[#f97316] mt-0.5">{highestScore > -1 ? highestScore : '-'}</span>
          </div>
        </div>

        {/* Score Timeline Chart */}
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
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} dy={8} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, match.startingScore || 501]} />
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

        {/* Player Stats Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {playerStats.map((p) => (
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
      </div>
    </div>
  );
}

