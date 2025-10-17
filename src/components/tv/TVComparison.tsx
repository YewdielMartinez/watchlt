import React, { useEffect, useState } from 'react';
import { TVShow, getTVDetails } from '../../services/tmdbApi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';
import { addComparisonHistory } from '../../services/userData';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Props = { shows: TVShow[] };

type CriteriaKey = 'rating' | 'year' | 'popularity' | 'votes' | 'seasons' | 'episodes' | 'ep_runtime';

interface CriteriaWeight { key: CriteriaKey; name: string; weight: number; }

const TVComparison: React.FC<Props> = ({ shows }) => {
  const { currentUser } = useAuth();
  const [criteria, setCriteria] = useState<CriteriaWeight[]>(() => {
    try {
      const saved = localStorage.getItem('tvCriteriaDefaults');
      if (saved) {
        const parsed = JSON.parse(saved) as CriteriaWeight[];
        const keys: CriteriaKey[] = ['rating','year','popularity','votes','seasons','episodes','ep_runtime'];
        const ok = Array.isArray(parsed) && keys.every(k => parsed.find(p => p.key === k));
        if (ok) return parsed;
      }
    } catch {}
    return [
      { key: 'rating', name: 'Calificación TMDB', weight: 7 },
      { key: 'year', name: 'Año de estreno (más reciente)', weight: 5 },
      { key: 'popularity', name: 'Popularidad', weight: 6 },
      { key: 'votes', name: 'Votos totales', weight: 5 },
      { key: 'seasons', name: 'Temporadas', weight: 4 },
      { key: 'episodes', name: 'N.º de episodios', weight: 5 },
      { key: 'ep_runtime', name: 'Duración de episodio (min)', weight: 3 },
    ];
  });
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [savedKey, setSavedKey] = useState<string>('');

  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<TVShow>>>({});

  useEffect(() => {
    const fetchMissing = async () => {
      for (const s of shows) {
        const needSeasons = !s.number_of_seasons && !detailsCache[s.id]?.number_of_seasons;
        const needEpisodes = !s.number_of_episodes && !detailsCache[s.id]?.number_of_episodes;
        const needRuntime = !(s.episode_run_time && s.episode_run_time.length) && !(detailsCache[s.id]?.episode_run_time && detailsCache[s.id]?.episode_run_time?.length);
        if (needSeasons || needEpisodes || needRuntime) {
          try {
            const det = await getTVDetails(s.id);
            setDetailsCache(prev => ({ ...prev, [s.id]: det }));
          } catch {
            // silencioso
          }
        }
      }
    };
    if (shows.length) fetchMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shows]);

  const updateCriteriaWeight = (index: number, newWeight: number) => {
    const next = [...criteria];
    next[index].weight = newWeight;
    setCriteria(next);
  };

  // Persistir cambios locales para usarlos como defaults en Configuración
  useEffect(() => {
    try { localStorage.setItem('tvCriteriaDefaults', JSON.stringify(criteria)); } catch {}
  }, [criteria]);

  const calcScores = () => {
    const pops = shows.map(s => s.popularity ?? 0);
    const votes = shows.map(s => s.vote_count ?? 0);
    const seasons = shows.map(s => s.number_of_seasons ?? detailsCache[s.id]?.number_of_seasons ?? 0);
    const episodes = shows.map(s => s.number_of_episodes ?? detailsCache[s.id]?.number_of_episodes ?? 0);
    const epRuntime = shows.map(s => (s.episode_run_time?.[0] ?? detailsCache[s.id]?.episode_run_time?.[0] ?? 0));

    const minPop = Math.min(...pops); const maxPop = Math.max(...pops); const popRange = Math.max(1, maxPop - minPop);
    const minVotes = Math.min(...votes); const maxVotes = Math.max(...votes); const votesRange = Math.max(1, maxVotes - minVotes);
    const minSeasons = Math.min(...seasons); const maxSeasons = Math.max(...seasons); const seasonsRange = Math.max(1, maxSeasons - minSeasons);
    const minEpisodes = Math.min(...episodes); const maxEpisodes = Math.max(...episodes); const episodesRange = Math.max(1, maxEpisodes - minEpisodes);
    const minRuntime = Math.min(...epRuntime); const maxRuntime = Math.max(...epRuntime); const runtimeRange = Math.max(1, maxRuntime - minRuntime);

    return shows
      .map(show => {
        const rating10 = Math.max(0, Math.min(10, show.vote_average ?? 0));
        const currentYear = new Date().getFullYear();
        const startYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 0;
        const yearScore10 = Math.min(10, Math.max(0, ((startYear - 1990) / (currentYear - 1990)) * 10));
        const popularityScore10 = (((show.popularity ?? 0) - minPop) / popRange) * 10;
        const votesScore10 = (((show.vote_count ?? 0) - minVotes) / votesRange) * 10;
        const seasonsVal = (show.number_of_seasons ?? detailsCache[show.id]?.number_of_seasons ?? 0);
        const seasonsScore10 = ((seasonsVal - minSeasons) / seasonsRange) * 10;
        const episodesVal = (show.number_of_episodes ?? detailsCache[show.id]?.number_of_episodes ?? 0);
        const episodesScore10 = ((episodesVal - minEpisodes) / episodesRange) * 10;
        const runtimeVal = (show.episode_run_time?.[0] ?? detailsCache[show.id]?.episode_run_time?.[0] ?? 0);
        const runtimeScore10 = ((runtimeVal - minRuntime) / runtimeRange) * 10;

        const metricMap: Record<CriteriaKey, number> = {
          rating: rating10,
          year: yearScore10,
          popularity: popularityScore10,
          votes: votesScore10,
          seasons: seasonsScore10,
          episodes: episodesScore10,
          ep_runtime: runtimeScore10,
        };
        const totalWeight = criteria.reduce((s, c) => s + c.weight, 0) || 1;
        const weighted = criteria.reduce((sum, c) => sum + c.weight * (metricMap[c.key] ?? 0), 0) / totalWeight;
        const weighted100 = Math.round(weighted * 10);

        return {
          show,
          rating10,
          yearScore10,
          popularityScore10,
          votesScore10,
          seasonsVal,
          episodesVal,
          runtimeVal,
          weighted100,
        };
      })
      .sort((a, b) => b.weighted100 - a.weighted100);
  };

  const scores = calcScores();

  const top = scores[0];

  const openDetails = () => {
    setShowAll(true);
    setShowInfo(true);
    try {
      const key = shows.map(s => s.id).sort((a,b) => a - b).join('-');
      if (currentUser && key && key !== savedKey) {
        addComparisonHistory(currentUser.uid, {
          type: 'tv',
          shows: shows.map(s => s.name).filter(Boolean),
          ids: shows.map(s => s.id),
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

  const chartData = {
    labels: scores.map(s => s.show.name),
    datasets: [
      {
        label: 'Puntaje final',
        data: scores.map(s => s.weighted100),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: '#4fd1c5',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#fff' } },
      title: { display: true, text: 'Comparación de series (1–100 pts)', color: '#fff' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.y} pts`,
        },
      },
    },
    animation: {
      duration: 900,
      easing: 'easeOutQuart',
    },
    animations: {
      y: { from: 0 },
    },
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.15)' } },
      y: { beginAtZero: true, max: 100, ticks: { color: '#fff', stepSize: 20 }, grid: { color: 'rgba(255,255,255,0.15)' } },
    },
  } as const;

  return (
    <div>
      {!showAll && top && (
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={top.show.poster_path ? `https://image.tmdb.org/t/p/w500${top.show.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'}
            alt={top.show.name}
            className="w-40 sm:w-56 md:w-64 lg:w-72 rounded-lg shadow-xl object-cover mb-3"
          />
          <h3 className="text-2xl font-semibold text-tertiary mb-1">{top.show.name}</h3>
          <p className="text-tertiary/80 mb-3">
            {top.show.first_air_date ? new Date(top.show.first_air_date).getFullYear() : '—'} • {top.seasonsVal} temp • {top.episodesVal} ep • {(typeof top.show.vote_average === 'number' ? top.show.vote_average.toFixed(1) : '—')}⭐
          </p>
          <div className="flex items-center gap-4">
            <div className="text-sm text-tertiary/80">Mejor opción según tus criterios</div>
            <div className="text-4xl font-bold text-tertiary">{top.weighted100} pts</div>
            <button className="btn-primary" onClick={openDetails}>Ver más</button>
          </div>
        </div>
      )}

      {showAll && (
      <div className="mb-6" id="comparacion-detalle">
        <h3 className="text-lg font-medium text-tertiary mb-3">Ajustar criterios de comparación</h3>
        <div className="space-y-4">
          {criteria.map((c, i) => (
            <div key={c.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-tertiary">{c.name}</span>
                <span className="text-xs text-tertiary/90">Importancia: <span className="font-semibold">{c.weight}/10</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-tertiary/70">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={c.weight}
                  onChange={(e) => updateCriteriaWeight(i, parseInt(e.target.value))}
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
            El puntaje final (1–100) combina métricas de cada serie normalizadas entre 0–10 y ponderadas por la importancia elegida.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 opacity-90">
            <li>Calificación: usa <code>vote_average</code> (0–10).</li>
            <li>Año: series más recientes obtienen mayor puntaje relativo.</li>
            <li>Popularidad, votos, temporadas, episodios y duración de episodio se normalizan entre el mínimo y máximo del conjunto.</li>
            <li>Puntaje final = suma( peso_i × métrica_i_normalizada ) / suma(pesos) × 10.</li>
            <li>Ordenamos de mayor a menor; la primera fila es la más compatible.</li>
          </ul>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-medium text-tertiary mb-3 section-title">Resultados de la comparación</h3>
        <div className="overflow-x-auto card">
          <table className="min-w-full divide-y divide-primary/40 border border-primary border-opacity-30">
            <thead className="bg-primary bg-opacity-25">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Serie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Calificación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Año</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Popularidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Votos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Temporadas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Episodios</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Duración ep.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider">Puntaje final (1–100)</th>
              </tr>
            </thead>
            <tbody className="bg-primary bg-opacity-10 divide-y divide-primary/30">
              {(showAll ? scores : scores.slice(0, 1)).map((s) => (
                <tr key={s.show.id} className={s === scores[0] ? 'bg-accent bg-opacity-10' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={s.show.poster_path ? `https://image.tmdb.org/t/p/w92${s.show.poster_path}` : 'https://via.placeholder.com/92x138?text=No+Image'}
                          alt={s.show.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-tertiary">{s.show.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{(s.show.vote_average ?? 0).toFixed(1)}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{s.show.first_air_date ? new Date(s.show.first_air_date).getFullYear() : 'N/A'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{(s.show.popularity ?? 0).toFixed(0)}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{(s.show.vote_count ?? 0).toLocaleString()}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{s.seasonsVal}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{s.episodesVal}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-tertiary">{s.runtimeVal} min</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-tertiary">{s.weighted100} pts</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAll && (
      <div className="mt-8">
        <h3 className="text-lg font-medium text-tertiary mb-3">Gráfico comparativo</h3>
        <div className="h-64">
          <Bar data={chartData} options={options} />
        </div>
      </div>
      )}
    </div>
  );
};

export default TVComparison;