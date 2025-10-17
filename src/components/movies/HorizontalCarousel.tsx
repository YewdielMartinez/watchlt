import React, { useRef, useState } from 'react';
import { useRef as useRefReact } from 'react';
import { Movie, getMovieDetails } from '../../services/tmdbApi';

type Props = {
  title: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
  selectedIds?: number[];
  variant?: 'poster' | 'wide';
};

const HorizontalCarousel: React.FC<Props> = ({ title, movies, onSelect, selectedIds = [], variant = 'poster' }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<Movie>>>({});
  const fetchingIdsRef = useRefReact<Set<number>>(new Set());

  const scrollLeft = () => {
    scrollerRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
  };
  const scrollRight = () => {
    scrollerRef.current?.scrollBy({ left: 600, behavior: 'smooth' });
  };

  const ensureDetails = async (movieId: number) => {
    if (detailsCache[movieId] || fetchingIdsRef.current.has(movieId)) return;
    try {
      fetchingIdsRef.current.add(movieId);
      const details = await getMovieDetails(movieId);
      setDetailsCache(prev => ({ ...prev, [movieId]: details }));
    } catch (e) {
      // Silenciar errores de red para no afectar la UI del carrusel
      console.error('No se pudieron cargar detalles de la película', movieId, e);
    } finally {
      fetchingIdsRef.current.delete(movieId);
    }
  };

  const bgUrl = movies[0]?.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${movies[0].backdrop_path}`
    : movies[0]?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movies[0].poster_path}`
    : undefined;

  return (
    <section className="relative rounded-2xl overflow-hidden mb-8">
      {bgUrl && (
        <div
          className="absolute inset-0 bg-center bg-cover filter blur-xl opacity-40"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden
        />
      )}
      <div className="relative glass-panel p-4 md:p-6">
        <h3 className="text-tertiary text-xl font-semibold mb-3">{title}</h3>
        <div className="relative">
          <button
            className="carousel-arrow absolute top-1/2 -translate-y-1/2 left-2"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            󰁍
          </button>
          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto py-2 snap-x snap-mandatory scrollbar-hide"
          >
            {movies.slice(0, 20).map((movie) => {
              const selected = selectedIds.includes(movie.id);
              const isWide = variant === 'wide';
              const cardRing = selected ? 'ring-2 ring-accent' : 'ring-1 ring-primary/30';

              return (
                <div key={movie.id} className={`snap-start shrink-0 ${isWide ? 'w-[20rem] sm:w-[24rem]' : 'w-40'}`}>
                  <div
                    className={`glass-card group p-2 rounded-xl cursor-pointer transition-transform hover:scale-105 ${cardRing}`}
                    onClick={() => onSelect(movie)}
                    onMouseEnter={() => ensureDetails(movie.id)}
                  >
                    <div className="relative">
                      {isWide ? (
                        <img
                          src={
                            movie.backdrop_path
                              ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}`
                              : movie.poster_path
                              ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                              : 'https://via.placeholder.com/500x281?text=No+Image'
                          }
                          alt={movie.title}
                          className="w-full h-40 sm:h-48 md:h-56 object-cover rounded-md shadow-md"
                        />
                      ) : (
                        <img
                          src={
                            movie.poster_path
                              ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                              : 'https://via.placeholder.com/185x278?text=No+Image'
                          }
                          alt={movie.title}
                          className="w-full h-64 md:h-72 object-cover rounded-md shadow-md"
                        />
                      )}
                      <div className="absolute inset-0 rounded-md bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                        <h4 className="text-tertiary text-sm font-semibold truncate">{movie.title}</h4>
                        <div className="text-[11px] text-tertiary/90 truncate">
                          {(() => {
                            const details = detailsCache[movie.id];
                            const genres = details?.genres?.map(g => g.name).slice(0, 2).join(', ');
                            const runtime = details?.runtime ? `${details.runtime} min` : null;
                            const parts = [genres, runtime].filter(Boolean);
                            return parts.length ? parts.join(' • ') : ' ';
                          })()}
                        </div>
                        <div className="text-[11px] text-tertiary/90">⭐ {movie.vote_average?.toFixed?.(1) ?? 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="carousel-arrow absolute top-1/2 -translate-y-1/2 right-2"
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            󰁎
          </button>
        </div>
      </div>
    </section>
  );
};

export default HorizontalCarousel;