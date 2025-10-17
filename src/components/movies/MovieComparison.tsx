import React, { useEffect, useState } from 'react';
import { Movie, getMovieDetails } from '../../services/tmdbApi';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';
import { addComparisonHistory } from '../../services/userData';
import { useNavigate } from 'react-router-dom';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Helpers de formato
const formatMoney = (value: number) => {
  if (!value || value <= 0) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const formatRoi = (revenue: number, budget: number) => {
  if (!budget || budget <= 0) return '—';
  const r = revenue / budget;
  return `${r.toFixed(2)}x`;
};

interface MovieComparisonProps {
  movies: Movie[];
}

interface CriteriaWeight {
  key: 'rating' | 'year' | 'popularity' | 'runtime' | 'votes' | 'revenue' | 'roi';
  name: string;
  weight: number;
}

const MovieComparison: React.FC<MovieComparisonProps> = ({ movies }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [criteria, setCriteria] = useState<CriteriaWeight[]>(() => {
    try {
      const saved = localStorage.getItem('movieCriteriaDefaults');
      if (saved) {
        const parsed = JSON.parse(saved) as CriteriaWeight[];
        const expected: CriteriaWeight['key'][] = ['rating','year','popularity','runtime','votes','revenue','roi'];
        const ok = Array.isArray(parsed) && expected.every(k => parsed.find(p => p.key === k));
        if (ok) return parsed;
      }
    } catch {}
    return [
      { key: 'rating', name: 'Calificación IMDB', weight: 7 },
      { key: 'year', name: 'Año de estreno (más reciente)', weight: 5 },
      { key: 'popularity', name: 'Popularidad', weight: 6 },
      { key: 'runtime', name: 'Duración (min)', weight: 5 },
      { key: 'votes', name: 'Votos totales', weight: 4 },
      { key: 'revenue', name: 'Recaudación', weight: 5 },
      { key: 'roi', name: 'Rentabilidad (Ingresos/Presupuesto)', weight: 6 }
    ];
  });
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<Movie>>>({});
  const [savedKey, setSavedKey] = useState<string>('');

  useEffect(() => {
    const fetchMissing = async () => {
      for (const m of movies) {
        const needRuntime = !m.runtime && !detailsCache[m.id]?.runtime;
        const needRevenue = (m.revenue == null) && (detailsCache[m.id]?.revenue == null);
        const needBudget = (m.budget == null) && (detailsCache[m.id]?.budget == null);
        if (needRuntime || needRevenue || needBudget) {
          try {
            const det = await getMovieDetails(m.id);
            setDetailsCache(prev => ({ ...prev, [m.id]: det }));
          } catch {
            // silencioso
          }
        }
      }
    };
    if (movies.length) fetchMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  const updateCriteriaWeight = (index: number, newWeight: number) => {
    const newCriteria = [...criteria];
    newCriteria[index].weight = newWeight;
    setCriteria(newCriteria);
  };

  // Guardar cambios locales para usarlos como defaults si no hay Configuración
  useEffect(() => {
    try {
      localStorage.setItem('movieCriteriaDefaults', JSON.stringify(criteria));
    } catch {}
  }, [criteria]);

  // Calcular puntajes ponderados (escala final 1–100)
  const calculateScores = () => {
    const pops = movies.map(m => m.popularity ?? 0);
    const votes = movies.map(m => m.vote_count ?? 0);
    const runtimes = movies.map(m => m.runtime ?? detailsCache[m.id]?.runtime ?? 0);
    const revenues = movies.map(m => m.revenue ?? detailsCache[m.id]?.revenue ?? 0);
    const budgets = movies.map(m => m.budget ?? detailsCache[m.id]?.budget ?? 0);
    const rois = movies.map((m, i) => {
      const rev = revenues[i] || 0;
      const bud = budgets[i] || 0;
      return bud > 0 ? rev / bud : 0;
    });
    const minPop = Math.min(...pops);
    const maxPop = Math.max(...pops);
    const minVotes = Math.min(...votes);
    const maxVotes = Math.max(...votes);
    const minRun = Math.min(...runtimes);
    const maxRun = Math.max(...runtimes);
    const minRev = Math.min(...revenues);
    const maxRev = Math.max(...revenues);
    const minRoi = Math.min(...rois);
    const maxRoi = Math.max(...rois);
    const popRange = Math.max(1, maxPop - minPop);
    const votesRange = Math.max(1, maxVotes - minVotes);
    const runRange = Math.max(1, maxRun - minRun);
    const revRange = Math.max(1, maxRev - minRev);
    const roiRange = Math.max(1, maxRoi - minRoi);

    return movies
      .map(movie => {
        const ratingScore10 = Math.max(0, Math.min(10, movie.vote_average ?? 0));
        const currentYear = new Date().getFullYear();
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
        const yearScore10 = Math.min(10, Math.max(0, ((releaseYear - 1900) / (currentYear - 1900)) * 10));
        const popularityScore10 = (((movie.popularity ?? 0) - minPop) / popRange) * 10;
        const votesScore10 = (((movie.vote_count ?? 0) - minVotes) / votesRange) * 10;
        const runtimeVal = movie.runtime ?? detailsCache[movie.id]?.runtime ?? 0;
        const runtimeScore10 = ((runtimeVal - minRun) / runRange) * 10;
        const revenueVal = movie.revenue ?? detailsCache[movie.id]?.revenue ?? 0;
        const budgetVal = movie.budget ?? detailsCache[movie.id]?.budget ?? 0;
        const revenueScore10 = ((revenueVal - minRev) / revRange) * 10;
        const roiRaw = budgetVal > 0 ? revenueVal / budgetVal : 0;
        const roiScore10 = ((roiRaw - minRoi) / roiRange) * 10;

        const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
        const metricMap: Record<string, number> = {
          rating: ratingScore10,
          year: yearScore10,
          popularity: popularityScore10,
          runtime: runtimeScore10,
          votes: votesScore10,
          revenue: revenueScore10,
          roi: roiScore10,
        };
        const weightedSum = criteria.reduce((sum, c) => sum + c.weight * (metricMap[c.key] ?? 0), 0);
        const weightedScore10 = weightedSum / totalWeight;
        const weightedScore100 = Math.round(weightedScore10 * 10);

        return {
          movie,
          ratingScore10,
          yearScore10,
          popularityScore10,
          runtimeScore10,
          votesScore10,
          revenueScore10,
          roiScore10,
          weightedScore10,
          weightedScore100
        };
      })
      .sort((a, b) => b.weightedScore100 - a.weightedScore100);
  };

  const scores = calculateScores();
const top = scores[0];

const [tint, setTint] = useState<string>('rgba(244,244,244,0.06)');
useEffect(() => {
  if (!top?.movie?.poster_path) { setTint('rgba(244,244,244,0.06)'); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = `https://image.tmdb.org/t/p/w185${top.movie.poster_path}`;
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 20; canvas.height = 20;
      ctx.drawImage(img, 0, 0, 20, 20);
      const data = ctx.getImageData(0, 0, 20, 20).data;
      let r=0,g=0,b=0,count=0;
      for (let i=0; i<data.length; i+=4) { r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++; }
      r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
      setTint(`rgba(${r}, ${g}, ${b}, 0.14)`);
    } catch { setTint('rgba(244,244,244,0.06)'); }
  };
  img.onerror = () => setTint('rgba(244,244,244,0.06)');
}, [top?.movie?.poster_path]);

const openDetails = () => {
    setShowAll(true);
    setShowInfo(true);
    // Guardar historial de comparación en Firebase (una sola vez por conjunto)
    try {
      const key = movies.map(m => m.id).sort((a,b) => a - b).join('-');
      if (currentUser && key && key !== savedKey) {
        addComparisonHistory(currentUser.uid, {
          type: 'movie',
          movies: movies.map(m => m.title).filter(Boolean),
          ids: movies.map(m => m.id),
          timestamp: new Date().toISOString(),
        });
        setSavedKey(key);
      }
    } catch {}
    setTimeout(() => {
      const el = document.getElementById('comparacion-detalle');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  // Datos para el gráfico de barras
  const chartData = {
    labels: scores.map(score => score.movie.title),
    datasets: [
      {
        label: 'Puntaje final',
        data: scores.map(score => score.weightedScore100),
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderColor: '#ffffff',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#ffffff' },
      },
      title: {
        display: true,
        text: 'Comparación de películas (1–100 pts)',
        color: '#ffffff',
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.y} pts`
        }
      }
    },
    animation: {
      duration: 900,
      easing: 'easeOutQuart',
    },
    animations: {
      y: { from: 0 },
    },
    scales: {
      x: {
        ticks: { color: '#ffffff' },
        grid: { color: 'rgba(255,255,255,0.15)' }
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#ffffff', stepSize: 20 },
        grid: { color: 'rgba(255,255,255,0.15)' }
      }
    }
    } as const;

  const palette = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(153, 102, 255, 0.6)',
    'rgba(255, 159, 64, 0.6)',
    'rgba(199, 199, 199, 0.6)'
  ];

  const weightsData = {
    labels: criteria.map(c => c.name),
    datasets: [
      {
        label: 'Importancia',
        data: criteria.map(c => c.weight),
        backgroundColor: criteria.map((_, i) => palette[i % palette.length]),
        borderWidth: 0
      }
    ]
  };

  const weightsOptions = {
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#ffffff' } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} / 10` } }
    }
  } as const;

  return (
    <div>
      {!showAll && top && (
        <div className="mb-8 glass-card tinted-glass p-4 sm:p-6 flex flex-col items-center text-center" style={{ background: tint }}>
          <button
            className="focus:outline-none"
            onClick={() => navigate(`/movie/${top.movie.id}`)}
            aria-label={`Abrir detalles de ${top.movie.title}`}
            title="Ver detalles"
          >
            <img
              src={top.movie.poster_path ? `https://image.tmdb.org/t/p/w500${top.movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'}
              alt={top.movie.title}
              className="w-40 sm:w-56 md:w-64 lg:w-72 rounded-lg shadow-xl object-cover mb-3"
            />
          </button>
          <h3
            className="text-2xl font-semibold text-tertiary mb-1 cursor-pointer hover:underline"
            onClick={() => navigate(`/movie/${top.movie.id}`)}
            title="Ver detalles"
          >
            {top.movie.title}
          </h3>
          <p className="text-tertiary/80 mb-3">
            {top.movie.release_date ? new Date(top.movie.release_date).getFullYear() : '—'} • {(top.movie.runtime ?? (detailsCache[top.movie.id]?.runtime ?? 0))} min • {(typeof top.movie.vote_average === 'number' ? top.movie.vote_average.toFixed(1) : '—')}⭐
          </p>
          <div className="flex items-center gap-4">
            <div className="text-sm text-tertiary/80">Mejor opción según tus criterios</div>
            <div className="text-4xl font-bold text-tertiary">{top.weightedScore100.toFixed(0)} pts</div>
            <button className="btn-primary" onClick={openDetails}>Ver más</button>
            <button className="btn-accent" onClick={() => navigate(`/movie/${top.movie.id}`)}>Ver detalles</button>
          </div>
        </div>
      )}

      {showAll && (
      <div className="mb-6" id="comparacion-detalle">
        <h3 className="text-lg font-medium text-tertiary mb-3">Ajustar criterios de comparación</h3>
        <div className="space-y-4">
          {criteria.map((criterion, index) => (
            <div key={criterion.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-tertiary">{criterion.name}</span>
                <span className="text-xs text-tertiary/90">Importancia: <span className="font-semibold">{criterion.weight}/10</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-tertiary/70">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={criterion.weight}
                  onChange={(e) => updateCriteriaWeight(index, parseInt(e.target.value))}
                  className="flex-grow h-2 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <span className="text-[11px] text-tertiary/70">10</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {showAll && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          className="px-3 py-1.5 rounded-md bg-primary/30 hover:bg-primary/40 text-tertiary text-sm border border-primary/40"
          onClick={() => setShowInfo(v => !v)}
        >
          {showInfo ? 'Ocultar explicación de cálculo' : 'Ver cómo se calcula el puntaje'}
        </button>
        <button
          className="px-3 py-1.5 rounded-md bg-accent/20 hover:bg-accent/30 text-tertiary text-sm border border-accent/40"
          onClick={() => setShowAll(false)}
        >
          Mostrar menos
        </button>
      </div>
      )}

      {showAll && showInfo && (
        <div className="mb-6 p-3 rounded-lg border border-primary/30 bg-primary/20 text-tertiary text-[13px] leading-relaxed">
          <p className="opacity-90">
            Calculamos un puntaje final (1–100) combinando varias métricas normalizadas a escala 0–10 y ponderadas por la importancia que configuras.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 opacity-90">
            <li>Calificación: usa <code>vote_average</code> (0–10).</li>
            <li>Año: películas más recientes obtienen mayor puntaje relativo.</li>
            <li>Popularidad, votos, duración, recaudación y rentabilidad (ingresos/presupuesto) se normalizan entre el mínimo y máximo del conjunto comparado.</li>
            <li>El puntaje final = suma( peso_i × métrica_i_normalizada ) / suma(pesos) × 10.</li>
            <li>Ordenamos de mayor a menor puntaje; la primera fila es la más compatible.</li>
          </ul>
        </div>
      )}

      {showAll && (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-tertiary mb-3 section-title">Resultados de la comparación</h3>
        <div className="overflow-x-auto card">
          <table className="comparison-table min-w-full divide-y divide-primary/40 border border-primary border-opacity-30">
            <thead className="bg-primary bg-opacity-25">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Película</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Calificación</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Año</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Popularidad</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Duración</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Votos</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Recaudación</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Rentabilidad</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Puntaje final (1–100)</th>
              </tr>
            </thead>
            <tbody className="bg-primary bg-opacity-10 divide-y divide-primary/30">
              {scores.map((score) => (
                <tr key={score.movie.id} className={score === scores[0] ? 'bg-accent bg-opacity-10' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-full object-cover" 
                          src={score.movie.poster_path 
                            ? `https://image.tmdb.org/t/p/w92${score.movie.poster_path}`
                            : 'https://via.placeholder.com/92x138?text=No+Image'
                          } 
                          alt={score.movie.title} 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-tertiary">{score.movie.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">{score.ratingScore10.toFixed(1)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">
                      {score.movie.release_date ? new Date(score.movie.release_date).getFullYear() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">{score.popularityScore10.toFixed(1)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">{(score.movie.runtime ?? (detailsCache[score.movie.id]?.runtime ?? 0))} min</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">{(score.movie.vote_count ?? 0).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">{formatMoney((score.movie.revenue ?? (detailsCache[score.movie.id]?.revenue ?? 0)))}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-tertiary">{formatRoi((score.movie.revenue ?? (detailsCache[score.movie.id]?.revenue ?? 0)), (score.movie.budget ?? (detailsCache[score.movie.id]?.budget ?? 0)))}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-tertiary">{score.weightedScore100.toFixed(0)} pts</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {showAll && (
      <div className="mt-8">
        <h3 className="text-lg font-medium text-tertiary mb-3">Gráficas comparativas</h3>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="h-64 glass-card p-3 tinted-glass" style={{ background: tint }}>
    <Bar data={chartData} options={chartOptions} />
  </div>
  <div className="h-64 glass-card p-3 tinted-glass" style={{ background: tint }}>
    <Doughnut data={weightsData} options={weightsOptions} />
  </div>
</div>
      </div>
      )}
    </div>
  );
};

export default MovieComparison;