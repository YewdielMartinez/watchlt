import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../layout/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserCollection } from '../../services/userData';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Crit = { key: string; name: string; weight: number };

const defaultMovieCriteria: Crit[] = [
  { key: 'rating', name: 'Calificación IMDB', weight: 7 },
  { key: 'year', name: 'Año de estreno (más reciente)', weight: 5 },
  { key: 'popularity', name: 'Popularidad', weight: 6 },
  { key: 'runtime', name: 'Duración (min)', weight: 5 },
  { key: 'votes', name: 'Votos totales', weight: 4 },
  { key: 'revenue', name: 'Recaudación', weight: 5 },
  { key: 'roi', name: 'Rentabilidad (Ingresos/Presupuesto)', weight: 6 },
];

const defaultTvCriteria: Crit[] = [
  { key: 'rating', name: 'Calificación TMDB', weight: 7 },
  { key: 'year', name: 'Año de estreno (más reciente)', weight: 5 },
  { key: 'popularity', name: 'Popularidad', weight: 6 },
  { key: 'votes', name: 'Votos totales', weight: 5 },
  { key: 'seasons', name: 'Temporadas', weight: 4 },
  { key: 'episodes', name: 'N.º de episodios', weight: 5 },
  { key: 'ep_runtime', name: 'Duración de episodio (min)', weight: 3 },
];

const readLocal = (key: string, fallback: Crit[]): Crit[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [movieCriteria, setMovieCriteria] = useState<Crit[]>(() => readLocal('movieCriteriaDefaults', defaultMovieCriteria));
  const [tvCriteria, setTvCriteria] = useState<Crit[]>(() => readLocal('tvCriteriaDefaults', defaultTvCriteria));
  const [ratings, setRatings] = useState<any[]>([]);
  const [movieCompareLimit, setMovieCompareLimit] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('compare_limit_movies');
      const n = raw ? parseInt(raw) : 15;
      return Number.isFinite(n) ? Math.max(2, Math.min(30, n)) : 15;
    } catch { return 15; }
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    fetchUserCollection(currentUser.uid, 'ratings')
      .then(setRatings)
      .catch(() => setRatings([]));
  }, [currentUser?.uid]);

  useEffect(() => {
    try { localStorage.setItem('movieCriteriaDefaults', JSON.stringify(movieCriteria)); } catch {}
  }, [movieCriteria]);

  useEffect(() => {
    try { localStorage.setItem('tvCriteriaDefaults', JSON.stringify(tvCriteria)); } catch {}
  }, [tvCriteria]);

  useEffect(() => {
    try { localStorage.setItem('compare_limit_movies', String(movieCompareLimit)); } catch {}
  }, [movieCompareLimit]);

  const movieRatings = useMemo(() => ratings.filter(r => r.type === 'movie'), [ratings]);
  const avgMyRating = useMemo(() => {
    if (!movieRatings.length) return 0;
    const sum = movieRatings.reduce((s: number, r: any) => s + (r.rating || 0), 0);
    return +(sum / movieRatings.length).toFixed(2);
  }, [movieRatings]);

  const chartData = useMemo(() => ({
    labels: movieRatings.slice(0, 15).map(r => r.title),
    datasets: [{
      label: 'Mi calificación',
      data: movieRatings.slice(0, 15).map(r => r.rating),
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderColor: '#ffffff',
      borderWidth: 1,
    }]
  }), [movieRatings]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#ffffff' } },
      title: { display: true, text: 'Películas calificadas (muestras top 15)', color: '#ffffff' },
    },
    scales: {
      x: { ticks: { color: '#ffffff' }, grid: { color: 'rgba(255,255,255,0.15)' } },
      y: { beginAtZero: true, max: 10, ticks: { color: '#ffffff' }, grid: { color: 'rgba(255,255,255,0.15)' } },
    }
  }), []);

  const updateCrit = (list: Crit[], i: number, w: number, setter: (v: Crit[]) => void) => {
    const next = [...list];
    next[i] = { ...next[i], weight: w };
    setter(next);
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-tertiary mb-6">Configuración</h1>

        <section className="glass-panel p-6 mb-8">
          <h2 className="card-title mb-4">Criterios por defecto</h2>
          <p className="text-tertiary/80 text-sm mb-6">Estos pesos se aplican por defecto en las comparaciones. Puedes ajustarlos aquí y se guardarán en este dispositivo.</p>

          <div className="grid md:grid-cols-1 gap-8">
            <div>
              <h3 className="text-lg font-medium text-tertiary mb-3">Películas</h3>
              <div className="space-y-4">
                {movieCriteria.map((c, i) => (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-tertiary">{c.name}</span>
                      <span className="text-xs text-tertiary/90">{c.weight}/10</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-tertiary/70">1</span>
                      <input type="range" min="1" max="10" value={c.weight} onChange={(e) => updateCrit(movieCriteria, i, parseInt(e.target.value), setMovieCriteria)} className="flex-grow h-2 rounded-lg appearance-none cursor-pointer accent-accent" />
                      <span className="text-[11px] text-tertiary/70">10</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button className="btn-primary text-white text-sm" onClick={() => setMovieCriteria(defaultMovieCriteria)}>Restablecer</button>
              </div>
            </div>
            {/* Sección Series oculta temporalmente */}
          </div>
        </section>

        <section className="glass-panel p-6 mb-8">
          <h2 className="card-title mb-4">Límite de comparación</h2>
          <p className="text-tertiary/80 text-sm mb-4">Configura cuántas películas puedes seleccionar para comparar.</p>
          <div className="flex items-center gap-4">
            <label htmlFor="limitMovies" className="text-tertiary">Películas</label>
            <input
              id="limitMovies"
              type="number"
              min={2}
              max={30}
              value={movieCompareLimit}
              onChange={(e) => setMovieCompareLimit(Math.max(2, Math.min(30, parseInt(e.target.value || '0'))))}
              className="glass-input w-28 px-3 py-2 rounded"
            />
            <span className="text-tertiary/70 text-sm">entre 2 y 30</span>
          </div>
        </section>

        <section className="glass-panel p-6">
          <h2 className="card-title mb-4">Gráficas de películas calificadas</h2>
          {currentUser ? (
            <>
              <p className="text-tertiary/80 text-sm mb-4">
                Promedio de mis calificaciones: <span className="font-semibold">{avgMyRating || 0}</span> / 10
              </p>
              {movieRatings.length ? (
                <div className="h-64">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              ) : (
                <p className="text-tertiary/70 text-sm">Aún no has calificado películas.</p>
              )}
            </>
          ) : (
            <p className="text-tertiary/70 text-sm">Inicia sesión para ver tus gráficas de calificaciones.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Settings;