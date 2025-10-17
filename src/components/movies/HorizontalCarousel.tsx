import React, { useRef, useState, useEffect } from 'react';
import { useRef as useRefReact } from 'react';
import { Link } from 'react-router-dom';
import { Movie, getMovieDetails } from '../../services/tmdbApi';

type Props = {
  title: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
  selectedIds?: number[];
  variant?: 'poster' | 'wide';
  viewMoreTo?: string;
};

const toMovieSectionSlug = (title: string): string | null => {
  const t = title.toLowerCase();
  if (t.includes('tendenc')) return 'trending';
  if (t.includes('popular')) return 'popular';
  if (t.includes('mejor calific')) return 'top_rated';
  if (t.includes('cartelera')) return 'now_playing';
  if (t.includes('próxim') || t.includes('proxim')) return 'upcoming';
  return null;
};

const HorizontalCarousel: React.FC<Props> = ({ title, movies, onSelect, selectedIds = [], variant = 'poster', viewMoreTo }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<Movie>>>({});
  const fetchingIdsRef = useRefReact<Set<number>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(8);
  const [thumbLeft, setThumbLeft] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);

  const scrollLeft = () => {
    scrollerRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
  };
  const scrollRight = () => {
    scrollerRef.current?.scrollBy({ left: 600, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setScrollProgress(progress);
    // pulgar proporcional y desplazamiento
    const w = Math.max(6, Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
    setThumbWidth(w);
    setThumbLeft(progress * (100 - w));
    setIsScrolling(true);
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => setIsScrolling(false), 800);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Solo permitir desplazamiento horizontal con Shift. Sin Shift, no mover el carrusel.
    if (e.shiftKey) {
      e.preventDefault();
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      el.scrollLeft += delta;
    }
  };

  useEffect(() => {
    // inicializa el pulgar cuando cambian los datos
    const el = scrollerRef.current;
    if (!el) return;
    const w = Math.max(6, Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
    setThumbWidth(w);
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setThumbLeft(progress * (100 - w));
  }, [movies]);

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-tertiary text-xl font-semibold">{title}</h3>
          {(viewMoreTo || toMovieSectionSlug(title)) && (
            <Link to={viewMoreTo || `/movies/section/${toMovieSectionSlug(title)}`} className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-tertiary text-sm">
              Ver más
            </Link>
          )}
        </div>
        <div className="relative">
          <button
            className="carousel-arrow absolute top-1/2 -translate-y-1/2 left-2"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <img src="/arrow_back_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Izquierda" className="w-4 h-4 block filter invert" />
          </button>
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            onWheel={onWheel}
            className="flex gap-4 overflow-x-auto py-2 snap-x snap-proximity scrollbar-hide"
          >
            {movies.slice(0, 20).map((movie) => {
              const selected = selectedIds.includes(movie.id);
              const isWide = variant === 'wide';
              const cardRing = selected ? 'ring-2 ring-accent' : 'ring-1 ring-primary/30';

              return (
                <div key={movie.id} className={`snap-start shrink-0 ${isWide ? 'w-[20rem] sm:w-[24rem]' : 'w-[185px]'}`}>
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
                              ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                              : 'https://via.placeholder.com/342x513?text=No+Image'
                          }
                          alt={movie.title}
                          className="w-[185px] h-[278px] object-cover rounded-md shadow-md"
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
            <img src="/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Derecha" className="w-4 h-4 block filter invert" />
          </button>
          <div className={`absolute left-10 right-10 bottom-2 pointer-events-none transition-opacity duration-300`} style={{ opacity: isScrolling ? 1 : 0 }}>
             <div className="carousel-scrollbar-track">
               <div className="carousel-scrollbar-thumb" style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }} />
             </div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default HorizontalCarousel;