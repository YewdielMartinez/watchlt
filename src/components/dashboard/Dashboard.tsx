import React, { useState, useEffect, useMemo, memo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getNowPlayingMovies,
  getTrendingMovies,
  Movie,
} from "../../services/tmdbApi";
import { getFavoriteGenres } from "../../services/userData";
import MovieSearch from "../movies/MovieSearch";
import Navbar from "../layout/Navbar";
import { useUI } from "../../contexts/UIContext";
import HorizontalCarousel from "../movies/HorizontalCarousel";
import { useNavigate } from "react-router-dom";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";

const Dashboard: React.FC = () => {
  const { currentUser, isGuest } = useAuth();
  const navigate = useNavigate();
  const { setBackgroundFromMovie } = useUI();

  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [recommended, setRecommended] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLocalLoading] = useState(true);

  // Memoizar los datos para evitar re-renders innecesarios
  const memoizedData = useMemo(
    () => ({
      popular,
      topRated,
      upcoming,
      nowPlaying,
      trendingMovies,
      recommended,
    }),
    [popular, topRated, upcoming, nowPlaying, trendingMovies, recommended]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pop, top, upc, now, trend] = await Promise.all([
          getPopularMovies(),
          getTopRatedMovies(),
          getUpcomingMovies(),
          getNowPlayingMovies(),
          getTrendingMovies(),
        ]);
        setPopular(pop);
        setTopRated(top);
        setUpcoming(upc);
        setNowPlaying(now);
        setTrendingMovies(trend);
        if (pop && pop[0]) setBackgroundFromMovie(pop[0]);

        try {
          if (currentUser?.uid) {
            const favGenres = await getFavoriteGenres(currentUser.uid);
            if (favGenres && favGenres.length) {
              const { discoverMoviesByGenres } = await import(
                "../../services/tmdbApi"
              );
              const rec = await discoverMoviesByGenres(favGenres.slice(0, 3));
              setRecommended(rec);
            } else {
              setRecommended([]);
            }
          } else {
            setRecommended([]);
          }
        } catch {
          // silencioso para recomendaciones
        }
      } catch (e) {
        setError("No se pudieron cargar datos");
      } finally {
        setLocalLoading(false);
      }
    };
    fetchData();
  }, [setBackgroundFromMovie, currentUser?.uid]);

  const handleOpenDetails = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-8 section-title">
          {currentUser?.displayName
            ? `Hola, ${currentUser.displayName}`
            : isGuest
            ? "Hola, Invitado"
            : "Hola"}
        </h1>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="mb-8">
              <GlassElement
                width={0}
                height={0}
                radius={20}
                depth={10}
                strength={80}
                chromaticAberration={3}
                blur={4}
              >
                <div className="p-6">
                  <h2 className="card-title mb-4">Buscar películas</h2>
                  <MovieSearch
                    onMovieSelect={handleOpenDetails}
                    selectedMovies={[]}
                  />
                </div>
              </GlassElement>
            </div>
            {/* Carruseles debajo del buscador */}
            {!loading && (
              <>
                {(() => {
                  const sections: { title: string; movies: Movie[] }[] = [];
                  if (recommended.length > 0)
                    sections.push({
                      title: "Recomendado para ti",
                      movies: recommended,
                    });
                  sections.push(
                    { title: "Tendencias", movies: trendingMovies },
                    { title: "Populares", movies: popular },
                    { title: "Mejor calificadas", movies: topRated },
                    { title: "En cartelera", movies: nowPlaying },
                    { title: "Próximos estrenos", movies: upcoming }
                  );
                  return sections.map((sec, i) => (
                    <HorizontalCarousel
                      key={sec.title}
                      title={sec.title}
                      movies={sec.movies}
                      onSelect={handleOpenDetails}
                      selectedIds={[]}
                      variant={i % 2 === 0 ? "wide" : "poster"}
                    />
                  ));
                })()}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
