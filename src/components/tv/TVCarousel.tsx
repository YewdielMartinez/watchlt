import React, { useRef, useState, useEffect } from 'react';
import { useRef as useRefReact } from 'react';
import { Link } from 'react-router-dom';
import { TVShow, getTVDetails } from '../../services/tmdbApi';

type Props = {
  title: string;
  shows: TVShow[];
  onSelect: (show: TVShow) => void;
};

const toTVSectionSlug = (title: string): string | null => {
  const t = title.toLowerCase();
  if (t.includes('popular')) return 'popular';
  if (t.includes('mejor calific')) return 'top_rated';
  if (t.includes('hoy')) return 'airing_today';
  if (t.includes('aire')) return 'on_the_air';
  return null;
};

const TVCarousel: React.FC<Props> = ({ title, shows, onSelect }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<TVShow>>>({});
  const fetchingIdsRef = useRefReact<Set<number>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(8);
  const [thumbLeft, setThumbLeft] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);

  const scrollLeft = () => scrollerRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
  const scrollRight = () => scrollerRef.current?.scrollBy({ left: 600, behavior: 'smooth' });

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setScrollProgress(progress);
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
    const el = scrollerRef.current;
    if (!el) return;
    const w = Math.max(6, Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
    setThumbWidth(w);
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setThumbLeft(progress * (100 - w));
  }, [shows]);

  const ensureDetails = async (id: number) => {
    if (detailsCache[id] || fetchingIdsRef.current.has(id)) return;
    try {
      fetchingIdsRef.current.add(id);
      const details = await getTVDetails(id);
      setDetailsCache(prev => ({ ...prev, [id]: details }));
    } catch (e) {
      console.error('No se pudieron cargar detalles de la serie', id, e);
    } finally {
      fetchingIdsRef.current.delete(id);
    }
  };

  const bgUrl = shows[0]?.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${shows[0].backdrop_path}`
    : shows[0]?.poster_path
    ? `https://image.tmdb.org/t/p/w500${shows[0].poster_path}`
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
          {toTVSectionSlug(title) && (
            <Link to={`/tv/section/${toTVSectionSlug(title)}`} className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-tertiary text-sm">
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
          <div ref={scrollerRef} onScroll={onScroll} onWheel={onWheel} className="flex gap-4 overflow-x-auto py-2 snap-x snap-proximity scrollbar-hide">
            {shows.slice(0, 20).map(show => {
              return (
                <div key={show.id} className="snap-start shrink-0 w-40">
                  <div
                    className="glass-card group p-2 rounded-xl cursor-pointer transition-transform hover:scale-105 ring-1 ring-primary/30"
                    onClick={() => onSelect(show)}
                    onMouseEnter={() => ensureDetails(show.id)}
                  >
                    <div className="relative">
                      <img
                        src={show.poster_path ? `https://image.tmdb.org/t/p/w185${show.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                        alt={show.name}
                        className="w-full h-56 object-cover rounded-md shadow-md"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                        <h4 className="text-tertiary text-sm font-semibold truncate">{show.name}</h4>
                        <div className="text-[11px] text-tertiary/90 truncate">
                          {(() => {
                            const details = detailsCache[show.id];
                            const genres = details?.genres?.map(g => g.name).slice(0, 2).join(', ');
                            const runtime = details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : null;
                            const parts = [genres, runtime].filter(Boolean);
                            return parts.length ? parts.join(' • ') : ' ';
                          })()}
                        </div>
                        <div className="text-[11px] text-tertiary/90">⭐ {show.vote_average?.toFixed?.(1) ?? 'N/A'}</div>
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

export default TVCarousel;