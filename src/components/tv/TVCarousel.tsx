import React, { useRef, useState } from 'react';
import { useRef as useRefReact } from 'react';
import { TVShow, getTVDetails } from '../../services/tmdbApi';

type Props = {
  title: string;
  shows: TVShow[];
  onSelect: (show: TVShow) => void;
};

const TVCarousel: React.FC<Props> = ({ title, shows, onSelect }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, Partial<TVShow>>>({});
  const fetchingIdsRef = useRefReact<Set<number>>(new Set());

  const scrollLeft = () => scrollerRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
  const scrollRight = () => scrollerRef.current?.scrollBy({ left: 600, behavior: 'smooth' });

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
        <h3 className="text-tertiary text-xl font-semibold mb-3">{title}</h3>
        <div className="relative">
          <button
            className="carousel-arrow absolute top-1/2 -translate-y-1/2 left-2"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            Ⴙ
          </button>
          <div ref={scrollerRef} className="flex gap-4 overflow-x-auto py-2 snap-x snap-mandatory scrollbar-hide">
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
            Ⴚ
          </button>
        </div>
      </div>
    </section>
  );
};

export default TVCarousel;