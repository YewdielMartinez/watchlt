import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../layout/Navbar';
import { useNavigate, useParams } from 'react-router-dom';
import { Movie, discoverMoviesByGenres, getMovieDetails } from '../../services/tmdbApi';
import PaginationGlass from '../shared/PaginationGlass';

const MoviesGenrePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<Movie>>>({});
  const fetchingIdsRef = useRef<Set<number>>(new Set());

  const loadPage = async (nextPage: number) => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const results = await discoverMoviesByGenres([parseInt(id, 10)], nextPage);
      setItems(results);
      setHasMore(results.length > 0);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
      setError('No se pudieron cargar más películas');
    } finally {
      setLoading(false);
    }
  };

  const ensureDetails = async (movieId: number) => {
    if (detailsCache[movieId] || fetchingIdsRef.current.has(movieId)) return;
    try {
      fetchingIdsRef.current.add(movieId);
      const details = await getMovieDetails(movieId);
      setDetailsCache(prev => ({ ...prev, [movieId]: details }));
    } catch (e) {
      console.error('No se pudieron cargar detalles de la película', movieId, e);
    } finally {
      fetchingIdsRef.current.delete(movieId);
    }
  };

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setDetailsCache({});
    loadPage(1);
  }, [id]);

  const openDetails = (movie: Movie) => navigate(`/movie/${movie.id}`);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">Películas por género</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <section className="glass-panel p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
            {items.map((m) => (
              <button key={m.id} className="glass-card group p-2 text-left rounded-xl transition-transform hover:scale-105 ring-1 ring-primary/30" onClick={() => openDetails(m)} onMouseEnter={() => ensureDetails(m.id)}>
                <div className="relative">
                  <img
                    src={m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Image'}
                    alt={m.title}
                    className="w-[185px] h-[278px] object-cover rounded-md shadow-md"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <h4 className="text-tertiary text-sm font-semibold truncate">{m.title}</h4>
                    <div className="text-[11px] text-tertiary/90 truncate">
                      {(() => {
                        const details = detailsCache[m.id];
                        const genres = details?.genres?.map(g => g.name).slice(0, 2).join(', ');
                        const runtime = (details as any)?.runtime ? `${(details as any).runtime} min` : null;
                        const parts = [genres, runtime].filter(Boolean);
                        return parts.length ? parts.join(' • ') : ' ';
                      })()}
                    </div>
                    <div className="text-[11px] text-tertiary/90">⭐ {m.vote_average?.toFixed?.(1) ?? 'N/A'}</div>
                  </div>
                </div>
                
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <PaginationGlass
              page={page}
              canPrev={!loading && page > 1}
              canNext={!loading && hasMore}
              onPrev={() => loadPage(Math.max(1, page - 1))}
              onNext={() => loadPage(page + 1)}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default MoviesGenrePage;