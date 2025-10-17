import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import { TVShow, getTVDetails, getTVVideos, MovieVideo, getTVRecommendations } from '../../services/tmdbApi';
import { useAuth } from '../../contexts/AuthContext';
import { getItemStates, setUserRating, toggleLike, toggleWatchLater } from '../../services/userData';
import { HeartIcon as HeartOutline, BookmarkIcon as BookmarkOutline, StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, BookmarkIcon as BookmarkSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { addToCompare } from '../../services/compareStore';

const TVDetails: React.FC = () => {
  const { id } = useParams();
  const tvId = Number(id);
  const navigate = useNavigate();
  const [show, setShow] = useState<TVShow | null>(null);
  const [trailer, setTrailer] = useState<MovieVideo | null>(null);
  const [recs, setRecs] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser, isGuest } = useAuth();
  const [liked, setLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setRatingState] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [details, videos, recommendations] = await Promise.all([
          getTVDetails(tvId),
          getTVVideos(tvId),
          getTVRecommendations(tvId)
        ]);
        setShow(details as TVShow);
        setRecs(recommendations?.slice(0, 12) || []);
        const trailerVid = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          || videos.find(v => v.site === 'YouTube');
        setTrailer(trailerVid || null);
        if (currentUser && !isGuest) {
          const st = await getItemStates(currentUser.uid, 'tv', tvId);
          setLiked(st.liked);
          setInWatchlist(st.inWatchlist);
          setRatingState(st.rating);
        } else {
          setLiked(false);
          setInWatchlist(false);
          setRatingState(null);
        }
      } catch (e) {
        console.error(e);
        setError('No se pudo cargar la información de la serie');
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isNaN(tvId)) load();
  }, [tvId, currentUser, isGuest]);

  const requireAuth = () => {
    if (!currentUser || isGuest) {
      alert('Inicia sesión para usar listas y calificaciones');
      return false;
    }
    return true;
  };

  const toggleLikeHandler = async () => {
    if (!requireAuth() || !show || !currentUser) return;
    try {
      setSaving(true);
      const newVal = await toggleLike(currentUser.uid, {
        id: show.id,
        type: 'tv',
        title: show.name,
        poster_path: show.poster_path,
      });
      setLiked(newVal);
    } finally {
      setSaving(false);
    }
  };

  const toggleWatchLaterHandler = async () => {
    if (!requireAuth() || !show || !currentUser) return;
    try {
      setSaving(true);
      const newVal = await toggleWatchLater(currentUser.uid, {
        id: show.id,
        type: 'tv',
        title: show.name,
        poster_path: show.poster_path,
      });
      setInWatchlist(newVal);
    } finally {
      setSaving(false);
    }
  };

  const onRate = async (val: number) => {
    if (!requireAuth() || !show || !currentUser) return;
    try {
      setSaving(true);
      await setUserRating(currentUser.uid, {
        id: show.id,
        type: 'tv',
        title: show.name,
        poster_path: show.poster_path,
      }, val);
      setRatingState(val);
    } finally {
      setSaving(false);
    }
  };

  const onAddCompare = () => {
    if (!show) return;
    const res = addToCompare('tv', {
      id: show.id,
      name: show.name,
      poster_path: show.poster_path,
      vote_average: show.vote_average,
      first_air_date: show.first_air_date,
    } as any);
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
        {show && (
          <>
            {/* Hero */}
            <section
              className="relative rounded-[32px] overflow-hidden mb-6"
              style={{
                backgroundImage: show.backdrop_path
                  ? `url(https://image.tmdb.org/t/p/original${show.backdrop_path})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/10" />
              <div className="relative z-10 p-4 md:p-8 glass-strong">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-40 md:w-48 lg:w-56 shrink-0 glass-card overflow-hidden">
                    <img
                      src={show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'}
                      alt={show.name}
                      className="w-full h-full object-cover rounded-[24px]"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-tertiary mb-1">
                      {show.name} {show.first_air_date ? `(${new Date(show.first_air_date).getFullYear()})` : ''}
                    </h1>
                    <p className="text-tertiary/90 mb-4">
                      {show.first_air_date ? new Date(show.first_air_date).toLocaleDateString() : '—'}
                      {show.number_of_seasons ? ` • ${show.number_of_seasons} temporadas` : ''}
                      {show.genres?.length ? ` • ${show.genres.map(g => g.name).join(', ')}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="glass px-3 py-1 text-sm">{show.status || '—'}</span>
                      <span className="glass px-3 py-1 text-sm">Idioma: {show.original_language?.toUpperCase?.() || '—'}</span>
                      <span className="glass px-3 py-1 text-sm">⭐ {show.vote_average?.toFixed?.(1) ?? '—'}</span>
                      {Array.isArray(show.episode_run_time) && show.episode_run_time[0] && (
                        <span className="glass px-3 py-1 text-sm">{show.episode_run_time[0]} min/ep</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {trailer && (
                        <a
                          href={`https://www.youtube.com/watch?v=${trailer.key}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary"
                        >
                          Ver tráiler
                        </a>
                      )}
                      <button
                        className={`glass px-3 py-2 rounded-xl flex items-center gap-2 ${liked ? 'border-primary/50' : ''}`}
                        onClick={toggleLikeHandler}
                        aria-pressed={liked}
                        disabled={saving}
                        title={liked ? 'Quitar Me gusta' : 'Me gusta'}
                      >
                        {liked ? <HeartSolid className="w-5 h-5 text-red-400"/> : <HeartOutline className="w-5 h-5"/>}
                        <span className="text-sm">Me gusta</span>
                      </button>
                      <button
                        className={`glass px-3 py-2 rounded-xl flex items-center gap-2 ${inWatchlist ? 'border-primary/50' : ''}`}
                        onClick={toggleWatchLaterHandler}
                        aria-pressed={inWatchlist}
                        disabled={saving}
                        title={inWatchlist ? 'Quitar de Ver más tarde' : 'Ver más tarde'}
                      >
                        {inWatchlist ? <BookmarkSolid className="w-5 h-5 text-yellow-300"/> : <BookmarkOutline className="w-5 h-5"/>}
                        <span className="text-sm">Ver más tarde</span>
                      </button>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <button key={i} onClick={() => onRate(i)} aria-label={`Calificar ${i}`}
                            className="p-1">
                            {userRating && userRating >= i ? (
                              <StarSolid className="w-5 h-5 text-yellow-300"/>
                            ) : (
                              <StarOutline className="w-5 h-5"/>
                            )}
                          </button>
                        ))}
                        <span className="ml-1 text-sm opacity-80">{userRating ? `${userRating}/5` : 'Calificar'}</span>
                      </div>
                      <button className="btn text-sm" onClick={onAddCompare}>Agregar a comparación</button>
                      <button className="btn text-sm" onClick={() => navigate('/compare')}>Ver comparación</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 flex flex-col gap-6">
                <div className="glass-panel p-6">
                  <h2 className="card-title mb-2">Overview</h2>
                  <p className="text-tertiary">{show.overview || '—'}</p>
                </div>
                <div className="glass-panel p-6">
                  <h3 className="card-title mb-4">Top Billed Cast</h3>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                    {(show.cast || []).map(c => (
                      <div key={c.id} className="min-w-[140px] glass-card p-2">
                        <img
                          src={c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                          alt={c.name}
                          className="h-32 w-full object-cover rounded-md mb-2"
                        />
                        <div className="text-sm font-medium text-tertiary truncate" title={c.name}>{c.name}</div>
                        <div className="text-xs text-tertiary/80 truncate" title={c.character}>{c.character}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {recs && recs.length > 0 && (
                  <div className="glass-panel p-6">
                    <h3 className="card-title mb-4">Recomendaciones</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {recs.map((t) => (
                        <button key={t.id} className="glass-card p-2 text-left" onClick={() => navigate(`/tv/${t.id}`)}>
                          <img
                            src={t.poster_path ? `https://image.tmdb.org/t/p/w185${t.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                            alt={t.name}
                            className="w-full h-48 object-cover rounded"
                          />
                          <div className="mt-2 text-xs text-tertiary truncate" title={t.name}>{t.name}</div>
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
                    <div className="flex justify-between"><dt className="text-tertiary/80">Estado</dt><dd className="text-tertiary">{show.status || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-tertiary/80">Idioma original</dt><dd className="text-tertiary">{show.original_language?.toUpperCase?.() || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-tertiary/80">Temporadas</dt><dd className="text-tertiary">{show.number_of_seasons ?? '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-tertiary/80">Episodios</dt><dd className="text-tertiary">{show.number_of_episodes ?? '—'}</dd></div>
                    {Array.isArray(show.episode_run_time) && show.episode_run_time[0] && (
                      <div className="flex justify-between"><dt className="text-tertiary/80">Duración por episodio</dt><dd className="text-tertiary">{show.episode_run_time[0]} min</dd></div>
                    )}
                    <div className="flex justify-between"><dt className="text-tertiary/80">Creadores</dt><dd className="text-tertiary">{show.created_by?.map(c => c.name).join(', ') || '—'}</dd></div>
                  </dl>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default TVDetails;