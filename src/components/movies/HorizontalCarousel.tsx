import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
} from "react";
import { useRef as useRefReact } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Movie, getMovieDetails } from "../../services/tmdbApi";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";
import { addToCompare } from "../../services/compareStore";
import { PlusIcon } from "@heroicons/react/24/solid";
import Alert from "../shared/Alert";

type Props = {
  title: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
  selectedIds?: number[];
  variant?: "poster" | "wide";
  viewMoreTo?: string;
};

const toMovieSectionSlug = (title: string): string | null => {
  const t = title.toLowerCase();
  if (t.includes("tendenc")) return "trending";
  if (t.includes("popular")) return "popular";
  if (t.includes("mejor calific")) return "top_rated";
  if (t.includes("cartelera")) return "now_playing";
  if (t.includes("próxim") || t.includes("proxim")) return "upcoming";
  return null;
};

const HorizontalCarousel: React.FC<Props> = ({
  title,
  movies,
  onSelect,
  selectedIds = [],
  variant = "poster",
  viewMoreTo,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showCompareAlert, setShowCompareAlert] = useState(false);
  const [compareAlertMovie, setCompareAlertMovie] = useState<string>("");
  const [detailsCache, setDetailsCache] = useState<
    Record<number, Partial<Movie>>
  >({});
  const fetchingIdsRef = useRefReact<Set<number>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(8);
  const [thumbLeft, setThumbLeft] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Memoizar movies para evitar re-renders
  const memoizedMovies = useMemo(() => movies, [movies]);

  const scrollLeft = useCallback(() => {
    scrollerRef.current?.scrollBy({ left: -600, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    scrollerRef.current?.scrollBy({ left: 600, behavior: "smooth" });
  }, []);

  const onScroll = useCallback(() => {
    if (rafIdRef.current) return;

    rafIdRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) {
        rafIdRef.current = null;
        return;
      }

      const max = el.scrollWidth - el.clientWidth;
      const progress = max > 0 ? el.scrollLeft / max : 0;
      setScrollProgress(progress);

      const w = Math.max(
        6,
        Math.min(100, (el.clientWidth / el.scrollWidth) * 100)
      );
      setThumbWidth(w);
      setThumbLeft(progress * (100 - w));
      setIsScrolling(true);

      if (scrollTimeoutRef.current)
        window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(
        () => setIsScrolling(false),
        800
      );

      rafIdRef.current = null;
    });
  }, []);

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
    const w = Math.max(
      6,
      Math.min(100, (el.clientWidth / el.scrollWidth) * 100)
    );
    setThumbWidth(w);
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setThumbLeft(progress * (100 - w));
  }, [movies]);

  const ensureDetails = useCallback(
    async (movieId: number) => {
      if (detailsCache[movieId] || fetchingIdsRef.current.has(movieId)) return;
      try {
        fetchingIdsRef.current.add(movieId);
        const details = await getMovieDetails(movieId);
        setDetailsCache((prev) => ({ ...prev, [movieId]: details }));
      } catch (e) {
        // Silenciar errores de red para no afectar la UI del carrusel
        console.error(
          "No se pudieron cargar detalles de la película",
          movieId,
          e
        );
      } finally {
        fetchingIdsRef.current.delete(movieId);
      }
    },
    [detailsCache]
  );

  return (
    <section className="relative rounded-2xl overflow-hidden mb-8">
      <GlassElement
        width={0}
        height={0}
        radius={16}
        depth={8}
        strength={70}
        chromaticAberration={3}
        blur={3}
      >
        <div className="relative p-6 md:p-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-tertiary text-xl font-semibold">{title}</h3>
            {(viewMoreTo || toMovieSectionSlug(title)) && (
              <Link
                to={
                  viewMoreTo || `/movies/section/${toMovieSectionSlug(title)}`
                }
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-tertiary text-sm"
              >
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
              <img
                src="/arrow_back_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Izquierda"
                className="w-4 h-4 block filter invert"
              />
            </button>
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              onWheel={onWheel}
              className="flex gap-4 overflow-x-auto py-2 snap-x snap-proximity scrollbar-hide"
            >
              {movies.slice(0, 20).map((movie) => {
                const selected = selectedIds.includes(movie.id);
                const isWide = variant === "wide";
                const cardRing = selected
                  ? "ring-2 ring-accent"
                  : "ring-1 ring-primary/30";

                return (
                  <div
                    key={movie.id}
                    className={`snap-start shrink-0 ${
                      isWide ? "w-[24rem] sm:w-[28rem]" : "w-[200px]"
                    }`}
                  >
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
                                : "https://via.placeholder.com/500x281?text=No+Image"
                            }
                            alt={movie.title}
                            className="w-full h-40 sm:h-48 md:h-56 object-cover rounded-md shadow-md"
                          />
                        ) : (
                          <img
                            src={
                              movie.poster_path
                                ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                                : "https://via.placeholder.com/342x513?text=No+Image"
                            }
                            alt={movie.title}
                            className="w-[200px] h-[300px] object-cover rounded-md shadow-md"
                          />
                        )}

                        {/* Botón de agregar a comparación */}
                        <div className="absolute bottom-2 right-2 z-20">
                          <GlassElement
                            width={36}
                            height={36}
                            radius={18}
                            depth={4}
                            strength={70}
                            chromaticAberration={2}
                            blur={2}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const result = addToCompare("movie", {
                                  id: movie.id,
                                  title: movie.title,
                                  poster_path: movie.poster_path,
                                  vote_average: movie.vote_average,
                                  release_date: movie.release_date,
                                });
                                if (!result.ok) {
                                  alert(result.reason || "No se pudo agregar");
                                } else {
                                  setCompareAlertMovie(movie.title);
                                  setShowCompareAlert(true);
                                }
                              }}
                              className="w-9 h-9 flex items-center justify-center hover:scale-110 transition-transform rounded-full"
                              aria-label="Agregar a comparación"
                            >
                              <PlusIcon className="w-5 h-5 text-white" />
                            </button>
                          </GlassElement>
                        </div>

                        <div className="absolute inset-0 rounded-md bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end pr-12">
                          <h4 className="text-tertiary text-sm font-semibold truncate">
                            {movie.title}
                          </h4>
                          <div className="text-[11px] text-tertiary/90 truncate">
                            {(() => {
                              const details = detailsCache[movie.id];
                              const genres = details?.genres
                                ?.map((g) => g.name)
                                .slice(0, 2)
                                .join(", ");
                              const runtime = details?.runtime
                                ? `${details.runtime} min`
                                : null;
                              const parts = [genres, runtime].filter(Boolean);
                              return parts.length ? parts.join(" • ") : " ";
                            })()}
                          </div>
                          <div className="text-[11px] text-tertiary/90">
                            ⭐ {movie.vote_average?.toFixed?.(1) ?? "N/A"}
                          </div>
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
              <img
                src="/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Derecha"
                className="w-4 h-4 block filter invert"
              />
            </button>
            <div
              className={`absolute left-10 right-10 bottom-2 pointer-events-none transition-opacity duration-300`}
              style={{ opacity: isScrolling ? 1 : 0 }}
            >
              <div className="carousel-scrollbar-track">
                <div
                  className="carousel-scrollbar-thumb"
                  style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassElement>

      {/* Alert de confirmación */}
      <Alert
        isOpen={showCompareAlert}
        onClose={() => setShowCompareAlert(false)}
        onConfirm={() => {
          setShowCompareAlert(false);
          navigate("/compare");
        }}
        title="¡Película agregada!"
        message={`"${compareAlertMovie}" se agregó a tu lista de comparación. ¿Quieres ir a la sección de comparaciones ahora?`}
        type="confirm"
        confirmText="Ir a comparar"
        cancelText="Continuar aquí"
      />
    </section>
  );
};

export default memo(HorizontalCarousel, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian las props relevantes
  return (
    prevProps.title === nextProps.title &&
    prevProps.movies.length === nextProps.movies.length &&
    prevProps.variant === nextProps.variant &&
    prevProps.viewMoreTo === nextProps.viewMoreTo &&
    JSON.stringify(prevProps.selectedIds) ===
      JSON.stringify(nextProps.selectedIds)
  );
});
