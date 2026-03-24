import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Zap, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STROKE_COLORS = ['#f43f5e', '#fb923c', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];

export default function MatchDetail({ matches, players }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const match = matches.find(m => m.id === id);

  if (!match) return <Navigate to="/matches" />;

  const { chartData, participantList, highestScore, highestScorer, winner } = useMemo(() => {
    const startingScore = match.startingScore || 501;
    const pIds = match.participantIds || [];
    
    // Auto-discover participants from turns if missing in legacy matches
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

    const w = players.find(p => p.id === match.winnerId);
    const h = players.find(p => p.id === pHighId);
    const pList = players.filter(p => pIds.includes(p.id));

    return {
      chartData: dataPoints,
      participantList: pList,
      highestScore: pHigh,
      highestScorer: h,
      winner: w
    };
  }, [match, players]);

  return (
    <div className="pb-28 min-h-[100dvh] bg-slate-950 font-sans relative">
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-slate-900 to-transparent -z-10"></div>
      
      <div className="max-w-4xl mx-auto pt-4 px-4 md:px-8">
        <button 
          onClick={() => navigate('/matches')} 
          className="mb-6 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors text-slate-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden text-center shadow-lg">
            <div className="absolute -right-4 -top-4 text-indigo-500/10">
              <Trophy className="w-32 h-32" />
            </div>
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-3">Match Winner</p>
            {winner && (
              <>
                {winner.pfpUrl ? (
                  <img src={winner.pfpUrl} alt={winner.name} className="w-20 h-20 rounded-full border-4 border-indigo-400 shadow-xl mb-3 object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-400 bg-slate-800 flex items-center justify-center font-black text-slate-300 uppercase text-2xl mb-3 shadow-xl shrink-0">{winner.name.substring(0,2)}</div>
                )}
                <h2 className="text-2xl font-black text-white">{winner.name}</h2>
              </>
            )}
            {!winner && <span className="text-white font-bold">Unknown</span>}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden text-center shadow-lg">
            <div className="absolute -left-4 -top-4 text-amber-500/10">
              <Zap className="w-32 h-32" />
            </div>
            <p className="text-amber-400 font-bold uppercase tracking-widest text-sm mb-3">Highest Score Recorded</p>
            {highestScorer && highestScore > -1 ? (
              <>
                {highestScorer.pfpUrl ? (
                  <img src={highestScorer.pfpUrl} alt={highestScorer.name} className="w-20 h-20 rounded-full border-4 border-amber-400 shadow-xl mb-3 object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-amber-400 bg-slate-800 flex items-center justify-center font-black text-slate-300 uppercase text-2xl mb-3 shadow-xl shrink-0">{highestScorer.name.substring(0,2)}</div>
                )}
                <h2 className="text-2xl font-black text-white mb-1">{highestScorer.name}</h2>
                <span className="text-4xl font-black text-amber-300 drop-shadow-md">{highestScore}</span>
              </>
            ) : (
              <span className="text-slate-400 font-bold">No High Score logic recorded</span>
            )}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-5 md:p-8 rounded-3xl shadow-xl backdrop-blur-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="font-bold text-xl md:text-2xl text-slate-100 flex items-center gap-2">
              Score Timeline
            </h3>
            <div className="flex flex-wrap gap-3">
              {participantList.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STROKE_COLORS[i % STROKE_COLORS.length] }}></span>
                  <span className="text-sm font-bold text-slate-300">{p.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-64 md:h-96 w-full">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} dy={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} axisLine={false} tickLine={false} domain={[0, match.startingScore || 501]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
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
                    activeDot={{ r: 6, fill: STROKE_COLORS[i % STROKE_COLORS.length], stroke: "#0f172a", strokeWidth: 2 }} 
                    animationDuration={1500}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
