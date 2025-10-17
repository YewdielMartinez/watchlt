import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import { Movie, getMovieDetails, getMovieVideos, MovieVideo, getMovieRecommendations, getMovieCertification, getMovieLogoPath } from '../../services/tmdbApi';
import { useAuth } from '../../contexts/AuthContext';
import { getItemStates, setUserRating, toggleLike, toggleWatchLater, setLikeReason, setRatingReason } from '../../services/userData';
import { HeartIcon as HeartOutline, BookmarkIcon as BookmarkOutline, StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, BookmarkIcon as BookmarkSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { addToCompare } from '../../services/compareStore';

const MovieDetails: React.FC = () => {
  const { id } = useParams();
  const movieId = Number(id);
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [trailer, setTrailer] = useState<MovieVideo | null>(null);
  const [recs, setRecs] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser, isGuest } = useAuth();
  const [liked, setLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setRatingState] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [savingReason, setSavingReason] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [certification, setCertification] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [details, videos, recommendations] = await Promise.all([
          getMovieDetails(movieId),
          getMovieVideos(movieId),
          getMovieRecommendations(movieId)
        ]);
        setMovie(details);
        setRecs(recommendations?.slice(0, 12) || []);
        const trailerVid = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          || videos.find(v => v.site === 'YouTube');
        setTrailer(trailerVid || null);

        // Cargar logo del título y certificación de estreno
        try {
          const [logo, cert] = await Promise.all([
            getMovieLogoPath(movieId),
            getMovieCertification(movieId)
          ]);
          setLogoPath(logo);
          setCertification(cert);
        } catch {}


        if (currentUser && !isGuest) {
          const st = await getItemStates(currentUser.uid, 'movie', movieId);
          setLiked(st.liked);
          setInWatchlist(st.inWatchlist);
          setRatingState(st.rating);
          setReason(st.likeReason || st.ratingReason || '');
        } else {
          setLiked(false);
          setInWatchlist(false);
          setRatingState(null);
          setReason('');
        }
      } catch (e) {
        console.error(e);
        setError('No se pudo cargar la información de la película');
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isNaN(movieId)) load();
  }, [movieId, currentUser, isGuest]);

  const requireAuth = () => {
    if (!currentUser || isGuest) {
      alert('Inicia sesión para usar listas y calificaciones');
      return false;
    }
    return true;
  };

  const onSaveReason = async () => {
    if (!requireAuth() || !movie || !currentUser) return;
    if (!liked && !userRating) {
      alert('Primero marca Me gusta o califica para guardar tu razón');
      return;
    }
    try {
      setSavingReason(true);
      const summary = {
        id: movie.id,
        type: 'movie' as const,
        title: movie.title,
        poster_path: movie.poster_path,
      };
      if (liked) {
        await setLikeReason(currentUser.uid, summary, reason || '');
      } else if (userRating) {
        await setRatingReason(currentUser.uid, summary, reason || '');
      }
    } finally {
      setSavingReason(false);
    }
  };

  const toggleLikeHandler = async () => {
    if (!requireAuth() || !movie || !currentUser) return;
    try {
      setSaving(true);
      const newVal = await toggleLike(currentUser.uid, {
        id: movie.id,
        type: 'movie',
        title: movie.title,
        poster_path: movie.poster_path,
      });
      setLiked(newVal);
    } finally {
      setSaving(false);
    }
  };

  const toggleWatchLaterHandler = async () => {
    if (!requireAuth() || !movie || !currentUser) return;
    try {
      setSaving(true);
      const newVal = await toggleWatchLater(currentUser.uid, {
        id: movie.id,
        type: 'movie',
        title: movie.title,
        poster_path: movie.poster_path,
      });
      setInWatchlist(newVal);
    } finally {
      setSaving(false);
    }
  };

  const onRate = async (val: number) => {
    if (!requireAuth() || !movie || !currentUser) return;
    try {
      setSaving(true);
      await setUserRating(currentUser.uid, {
        id: movie.id,
        type: 'movie',
        title: movie.title,
        poster_path: movie.poster_path,
      }, val);
      setRatingState(val);
    } finally {
      setSaving(false);
    }
  };

  const onAddCompare = () => {
    if (!movie) return;
    const res = addToCompare('movie', {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
    });
    if (!res.ok) alert(res.reason || 'No se pudo agregar');
    else alert('Agregado a comparación');
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        {loading && <div>Cargando...</div>}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {movie && (
          <>
            {/* Hero con poster de fondo y overlays */}
            <section
              className="relative rounded-[32px] overflow-hidden mb-6"
              style={{
                backgroundImage: movie.backdrop_path
                  ? `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`
                  : (movie.poster_path ? `url(https://image.tmdb.org/t/p/original${movie.poster_path})` : undefined),
                backgroundSize: movie.backdrop_path ? 'cover' : 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: '#000',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
              <div className="relative z-10 min-h-[380px] md:min-h-[500px]">
                {/* Logo o título arriba izquierda */}
                {logoPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/original${logoPath}`}
                    alt={movie.title}
                    className="absolute top-6 left-6 h-16 md:h-20 object-contain"
                  />
                ) : (
                  <h1 className="absolute top-6 left-6 text-3xl md:text-4xl font-bold text-tertiary">{movie.title}</h1>
                )}


                {/* Metadatos a la derecha */}
                <div className="absolute bottom-6 right-6 flex flex-row items-center gap-2 flex-wrap text-xs md:text-sm justify-end">
                  <div className="tinted-glass glass-strong px-3 py-1 rounded-full">{movie.runtime ? `${movie.runtime} min` : '—'}</div>
                  <div className="tinted-glass glass-strong px-3 py-1 rounded-full">{movie.release_date ? new Date(movie.release_date).toLocaleDateString() : '—'}</div>
                  <div className="tinted-glass glass-strong px-3 py-1 rounded-full">{certification || '—'}</div>
                  <div className="tinted-glass glass-strong px-3 py-1 rounded-full">TMDb {typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : '—'}</div>
                </div>

                {/* Botón de tráiler a la izquierda y acciones debajo */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-3">
                  {trailer && (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-accent text-sm px-3 py-1 rounded-lg w-fit"
                    >
                      Ver tráiler
                    </a>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      className={`glass-strong tinted-glass px-3 py-2 rounded-full flex items-center gap-2 ${liked ? 'border-primary/50' : ''}`}
                      onClick={toggleLikeHandler}
                      aria-pressed={liked}
                      disabled={saving}
                      title={liked ? 'Quitar Me gusta' : 'Me gusta'}
                    >
                      {liked ? <HeartSolid className="w-5 h-5 text-red-400"/> : <HeartOutline className="w-5 h-5"/>}
                      <span className="text-sm">Me gusta</span>
                    </button>
                    <button
                      className={`glass-strong tinted-glass px-3 py-2 rounded-full flex items-center gap-2 ${inWatchlist ? 'border-primary/50' : ''}`}
                      onClick={toggleWatchLaterHandler}
                      aria-pressed={inWatchlist}
                      disabled={saving}
                      title={inWatchlist ? 'Quitar de Ver más tarde' : 'Ver más tarde'}
                    >
                      {inWatchlist ? <BookmarkSolid className="w-5 h-5 text-yellow-300"/> : <BookmarkOutline className="w-5 h-5"/>}
                      <span className="text-sm">Guardar</span>
                    </button>
                    <div className="glass-strong tinted-glass px-2 py-1 rounded-full flex items-center gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <button key={i} onClick={() => onRate(i)} aria-label={`Calificar ${i}`} className="p-1 rating-star">
                          {userRating && userRating >= i ? (
                            <StarSolid className="w-5 h-5 text-yellow-300"/>
                          ) : (
                            <StarOutline className="w-5 h-5"/>
                          )}
                        </button>
                      ))}
                      <span className="ml-1 text-sm opacity-80">{userRating ? `${userRating}/5` : 'Calificar'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

                      {/* Botones de comparación en móvil (inline) */}
                      <button className="glass px-3 py-2 rounded-xl text-sm md:hidden" onClick={onAddCompare}>Agregar a comparación</button>
                      <button className="glass px-3 py-2 rounded-xl text-sm md:hidden" onClick={() => navigate('/compare')}>Ver comparación</button>



            {/* Cuerpo distribuido */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 flex flex-col gap-6">
                <div className="glass-panel p-6">
                  <h2 className="card-title mb-2">Overview</h2>
                  <p className="text-tertiary">{movie.overview || '—'}</p>
                </div>

                {(liked || !!userRating) && (
                  <div className="glass-panel p-6">
                    <h3 className="card-title mb-3">¿Por qué te gustó?</h3>
                    <textarea
                      className="glass-input w-full min-h-[88px] p-3 text-sm"
                      placeholder="Escribe en pocas palabras qué te gustó de esta película..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="mt-3 flex justify-end">
                      <button className="btn-primary text-sm" disabled={savingReason} onClick={onSaveReason}>
                        {savingReason ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                    {recs && recs.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-tertiary font-semibold mb-3">Recomendadas para ti</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {recs.slice(0, 6).map((m) => (
                            <button key={m.id} className="glass-card p-2 text-left hover:scale-105 transition-transform" onClick={() => navigate(`/movie/${m.id}`)}>
                              <img
                                src={m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                                alt={m.title}
                                className="w-full h-48 object-cover rounded"
                              />
                              <div className="mt-2 text-xs text-tertiary truncate" title={m.title}>{m.title}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="glass-panel p-6">
                  <h3 className="card-title mb-4">Reparto principal</h3>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                    {(movie.cast || []).map(c => (
                      <button
                        key={c.id}
                        className="min-w-[140px] glass-card p-2 text-left hover:scale-105 transition-transform"
                        onClick={() => navigate(`/person/${c.id}`)}
                        aria-label={`Ver persona ${c.name}`}
                      >
                        <img
                          src={c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                          alt={c.name}
                          className="h-32 w-full object-cover rounded-md mb-2"
                        />
                        <div className="text-sm font-medium text-tertiary truncate" title={c.name}>{c.name}</div>
                        <div className="text-xs text-tertiary/80 truncate" title={c.character}>{c.character}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {movie.crew && movie.crew.length > 0 && (
                  <div className="glass-panel p-6">
                    <h3 className="card-title mb-4">Equipo</h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                      {movie.crew.map((m) => (
                        <button
                          key={m.id + '-' + m.job}
                          className="min-w-[140px] glass-card p-2 text-left hover:scale-105 transition-transform"
                          onClick={() => navigate(`/person/${m.id}`)}
                          aria-label={`Ver persona ${m.name}`}
                        >
                          <img
                            src={m.profile_path ? `https://image.tmdb.org/t/p/w185${m.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                            alt={m.name}
                            className="h-32 w-full object-cover rounded-md mb-2"
                          />
                          <div className="text-sm font-medium text-tertiary truncate" title={m.name}>{m.name}</div>
                          <div className="text-xs text-tertiary/80 truncate" title={m.job}>{m.job}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {recs && recs.length > 0 && (
                  <div className="glass-panel p-6">
                    <h3 className="card-title mb-4">Recomendaciones</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {recs.map((m) => (
                        <button key={m.id} className="glass-card p-2 text-left" onClick={() => navigate(`/movie/${m.id}`)}>
                          <img
                            src={m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                            alt={m.title}
                            className="w-full h-48 object-cover rounded"
                          />
                          <div className="mt-2 text-xs text-tertiary truncate" title={m.title}>{m.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {trailer && (
                  <div className="glass-panel p-6">
                    <h3 className="card-title mb-2">Trailer</h3>
                    <div className="aspect-video rounded overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${trailer.key}`}
                        title={trailer.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </section>
              <aside className="lg:col-span-1">
                <div className="glass-panel p-6">
                  <h3 className="card-title mb-4">Información</h3>
                  <dl className="text-sm grid grid-cols-1 gap-3">
                    <div className="flex justify-between"><dt className="text-tertiary/80">Estado</dt><dd className="text-tertiary">{movie.status || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-tertiary/80">Idioma original</dt><dd className="text-tertiary">{movie.original_language?.toUpperCase?.() || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-tertiary/80">Presupuesto</dt><dd className="text-tertiary">{typeof movie.budget === 'number' ? `$${movie.budget.toLocaleString()}` : '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-tertiary/80">Ingresos</dt><dd className="text-tertiary">{typeof movie.revenue === 'number' ? `$${movie.revenue.toLocaleString()}` : '—'}</dd></div>
                  </dl>
                </div>
                <div className="glass-panel p-6 mt-6">
                  <h3 className="card-title mb-2">Créditos</h3>
                  <div className="text-sm"><span className="text-tertiary/80">Director: </span><span className="text-tertiary">{movie.director || '—'}</span></div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MovieDetails;
