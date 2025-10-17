import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../layout/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Movie, getMovieDetails, getMovieGenres, Genre } from '../../services/tmdbApi';
import { setFavoriteGenres } from '../../services/userData';
import { setCompareList } from '../../services/compareStore';

type UserDoc = {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  favorites?: Array<number | Movie>;
  history?: any[];
  createdAt?: string;
  favoriteGenres?: number[];
};

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [savingGenres, setSavingGenres] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string>('');
  const navigate = useNavigate();

  const displayName = useMemo(() => {
    if (!currentUser) return '';
    return currentUser.displayName || currentUser.email?.split('@')[0] || '';
  }, [currentUser]);

  const derivedNames = useMemo(() => {
    const name = userDoc?.firstName || displayName?.split(' ')[0] || userDoc?.username || '';
    const last = userDoc?.lastName || (displayName?.split(' ').slice(1).join(' ') || '');
    return { name, last };
  }, [userDoc, displayName]);

  useEffect(() => {
    // Fetch static list of movie genres from TMDB
    getMovieGenres()
      .then((gs) => setAvailableGenres(gs || []))
      .catch((e) => console.error('Error cargando géneros', e));
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const uid = currentUser.uid;
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const data = (snap.exists() ? snap.data() : null) as UserDoc | null;
        setUserDoc(data);
        setSelectedGenreIds(Array.isArray(data?.favoriteGenres) ? (data!.favoriteGenres as number[]) : []);
        // Leer subcolecciones
        const [likesSnap, wlSnap, ratSnap] = await Promise.all([
          getDocs(collection(db, 'users', uid, 'likes')),
          getDocs(collection(db, 'users', uid, 'watchlist')),
          getDocs(collection(db, 'users', uid, 'ratings')),
        ]);
        setLikes(likesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setWatchlist(wlSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRatings(ratSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        // Resolver favoritos: pueden ser ids o objetos Movie
        const favs = (data?.favorites || []) as Array<number | Movie>;
        const ids = favs
          .map((f) => (typeof f === 'number' ? f : (f?.id as number)))
          .filter(Boolean)
          .slice(0, 12);
        if (ids.length) {
          const details = await Promise.all(ids.map((id) => getMovieDetails(id)));
          setFavoriteMovies(details);
        } else {
          setFavoriteMovies([]);
        }
        setError('');
      } catch (e: any) {
        console.error(e);
        setError('No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const toggleGenre = (id: number) => {
    setSelectedGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const handleSaveGenres = async () => {
    if (!currentUser) return;
    try {
      setSavingGenres(true);
      setSaveMsg('');
      await setFavoriteGenres(currentUser.uid, selectedGenreIds);
      setSaveMsg('Géneros favoritos guardados');
      // reflect in local userDoc
      setUserDoc((prev) => ({ ...(prev || {}), favoriteGenres: selectedGenreIds }));
    } catch (e) {
      console.error(e);
      setSaveMsg('No se pudieron guardar los géneros');
    } finally {
      setSavingGenres(false);
      setTimeout(() => setSaveMsg(''), 2500);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-panel p-6">Debes iniciar sesión para ver tu perfil.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">Perfil</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del usuario */}
          <section className="glass-panel p-6 lg:col-span-1">
            <h2 className="card-title mb-4">Información de usuario</h2>
            {loading ? (
              <div>Cargando...</div>
            ) : (
              <dl className="space-y-3 text-tertiary">
                <div className="flex justify-between">
                  <dt className="opacity-80">Nombre</dt>
                  <dd className="font-medium">{derivedNames.name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-80">Apellidos</dt>
                  <dd className="font-medium">{derivedNames.last || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-80">Correo</dt>
                  <dd className="font-medium">{currentUser.email || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-80">Desde</dt>
                  <dd className="font-medium">{userDoc?.createdAt ? new Date(userDoc.createdAt).toLocaleDateString() : '—'}</dd>
                </div>
              </dl>
            )}
          </section>

          {/* Géneros favoritos */}
          <section className="glass-panel p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="card-title">Géneros favoritos</h2>
              <button
                className="btn btn-primary"
                onClick={handleSaveGenres}
                disabled={savingGenres}
              >
                {savingGenres ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            <p className="text-sm text-tertiary opacity-80 mb-4">Selecciona tus géneros favoritos para personalizar recomendaciones en Inicio.</p>
            {availableGenres.length ? (
              <div className="flex flex-wrap gap-2">
                {availableGenres.map((g) => {
                  const active = selectedGenreIds.includes(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      className={`px-3 py-1 rounded-full border text-sm transition ${
                        active ? 'bg-primary text-white border-primary' : 'glass border-primary/30 text-tertiary'
                      }`}
                      onClick={() => toggleGenre(g.id)}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>Cargando géneros...</div>
            )}
            {saveMsg && <div className="mt-3 text-sm text-tertiary">{saveMsg}</div>}
          </section>

          {/* Sección Favoritos oculta temporalmente */}
        </div>

        {/* Me gusta y Ver más tarde */}
        <section className="glass-panel p-6 mt-6">
          <h2 className="card-title mb-4">Me gusta</h2>
          {loading ? (
            <div>Cargando...</div>
          ) : likes.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {likes.map((it: any) => (
                <button key={it.id} className="glass-card p-2 rounded text-left" onClick={() => {
                  const mediaId = typeof it.id === 'number' ? it.id : (String(it.id).includes('_') ? Number(String(it.id).split('_')[1]) : Number(it.id));
                  navigate(`/${it.type === 'movie' ? 'movie' : 'tv'}/${mediaId}`);
                }}>
                  <img
                    src={it.poster_path ? `https://image.tmdb.org/t/p/w185${it.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                    alt={it.title}
                    className="w-full h-48 object-cover rounded"
                  />
                  <div className="mt-2 text-xs text-tertiary truncate" title={it.title}>{it.title}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-tertiary opacity-80">Aún no tienes likes.</div>
          )}
        </section>

        <section className="glass-panel p-6 mt-6">
          <h2 className="card-title mb-4">Ver más tarde</h2>
          {loading ? (
            <div>Cargando...</div>
          ) : watchlist.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {watchlist.map((it: any) => (
                <button key={it.id} className="glass-card p-2 rounded text-left" onClick={() => {
                  const mediaId = typeof it.id === 'number' ? it.id : (String(it.id).includes('_') ? Number(String(it.id).split('_')[1]) : Number(it.id));
                  navigate(`/${it.type === 'movie' ? 'movie' : 'tv'}/${mediaId}`);
                }}>
                  <img
                    src={it.poster_path ? `https://image.tmdb.org/t/p/w185${it.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                    alt={it.title}
                    className="w-full h-48 object-cover rounded"
                  />
                  <div className="mt-2 text-xs text-tertiary truncate" title={it.title}>{it.title}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-tertiary opacity-80">Tu lista está vacía.</div>
          )}
        </section>

        {/* Calificaciones */}
        <section className="glass-panel p-6 mt-6">
          <h2 className="card-title mb-4">Mis calificaciones</h2>
          {loading ? (
            <div>Cargando...</div>
          ) : ratings.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {ratings.map((it: any) => (
                <button key={it.id} className="glass-card p-2 rounded text-left" onClick={() => {
                  const mediaId = typeof it.id === 'number' ? it.id : (String(it.id).includes('_') ? Number(String(it.id).split('_')[1]) : Number(it.id));
                  navigate(`/${it.type === 'movie' ? 'movie' : 'tv'}/${mediaId}`);
                }}>
                  <div className="relative">
                    <img
                      src={it.poster_path ? `https://image.tmdb.org/t/p/w185${it.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                      alt={it.title}
                      className="w-full h-48 object-cover rounded"
                    />
                    <div className="absolute bottom-1 right-1 glass px-2 py-1 rounded text-xs">{it.rating}/5</div>
                  </div>
                  <div className="mt-2 text-xs text-tertiary truncate" title={it.title}>{it.title}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-tertiary opacity-80">Aún no calificaste contenidos.</div>
          )}
        </section>

        {/* Historial */}
        <section className="glass-panel p-6 mt-6">
          <h2 className="card-title mb-4">Historial de comparaciones</h2>
          {loading ? (
            <div>Cargando historial...</div>
          ) : userDoc?.history && userDoc.history.length ? (
            <ul className="space-y-3 text-tertiary">
              {userDoc.history.slice(0, 10).map((entry: any, idx: number) => (
                <li
                  key={idx}
                  className="glass-card p-3 rounded border border-primary/30 hover:bg-primary/40 cursor-pointer transition"
                  title="Abrir esta comparación"
                  onClick={() => {
                    try {
                      if (entry?.type === 'movie' && Array.isArray(entry?.ids)) {
                        const list = entry.ids.map((id: number, i: number) => ({ id, title: entry.movies?.[i] || `Película ${i+1}` }));
                        setCompareList('movie', list);
                        navigate('/compare');
                      } else if (entry?.type === 'tv' && Array.isArray(entry?.ids)) {
                        const list = entry.ids.map((id: number, i: number) => ({ id, name: entry.shows?.[i] || `Serie ${i+1}` }));
                        setCompareList('tv', list);
                        navigate('/compare');
                      }
                    } catch {}
                  }}
                >
                  <div className="text-sm">
                    <span className="opacity-80">Fecha: </span>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                  </div>
                  <div className="text-sm">
                    <span className="opacity-80">{entry?.type === 'tv' ? 'Series' : 'Películas'}: </span>
                    {Array.isArray(entry?.type === 'tv' ? entry.shows : entry.movies)
                      ? (entry?.type === 'tv' ? entry.shows : entry.movies)
                          .map((v: any) => (typeof v === 'string' ? v : (v?.title || v?.name)))
                          .filter(Boolean)
                          .join(' • ')
                      : '—'}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-tertiary opacity-80">Aún no hay comparaciones guardadas.</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Profile;