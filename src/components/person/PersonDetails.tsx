import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import {
  Person,
  CombinedCredit,
  getPersonDetails,
  getPersonCombinedCredits,
} from '../../services/tmdbApi';

const placeholderProfile = 'https://via.placeholder.com/300x450?text=No+Image';

const yearOf = (date?: string) => (date ? new Date(date).getFullYear() : '—');
const ageFrom = (birthday?: string, deathday?: string | null) => {
  if (!birthday) return '—';
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return `${age} años`;
};

type Credits = { cast: CombinedCredit[]; crew: CombinedCredit[] };

const PersonDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const pid = Number(id);
        const [p, cr] = await Promise.all([
          getPersonDetails(pid),
          getPersonCombinedCredits(pid),
        ]);
        setPerson(p);
        setCredits(cr);
      } catch (e) {
        setError('No se pudo cargar el detalle del actor.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const knownFor = useMemo(() => {
    if (!credits) return [] as CombinedCredit[];
    const pool = (credits.cast || []).filter(
      (c) => (c.media_type === 'movie' || c.media_type === 'tv') && c.poster_path
    );
    return pool
      .slice()
      .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 10);
  }, [credits]);

  const actingCredits = useMemo(() => {
    if (!credits) return [] as CombinedCredit[];
    return (credits.cast || [])
      .filter((c) => c.media_type === 'movie' || c.media_type === 'tv')
      .slice()
      .sort((a, b) => {
        const ad = a.media_type === 'movie' ? a.release_date : a.first_air_date;
        const bd = b.media_type === 'movie' ? b.release_date : b.first_air_date;
        return (bd ? +new Date(bd) : 0) - (ad ? +new Date(ad) : 0);
      });
  }, [credits]);

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <div className="text-tertiary">Cargando...</div>
      </main>
    </div>
  );

  if (error) return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <div className="text-red-400">{error}</div>
      </main>
    </div>
  );

  if (!person) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        {/* Encabezado nombre */}
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">{person.name}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Columna izquierda: foto + info personal */}
          <aside className="lg:col-span-1">
            <div className="glass-card overflow-hidden">
              <img
                src={person.profile_path ? `https://image.tmdb.org/t/p/w342${person.profile_path}` : placeholderProfile}
                alt={person.name}
                className="w-full object-cover"
              />
            </div>
            <div className="glass-panel p-4 mt-4">
              <h3 className="text-lg font-semibold text-tertiary mb-2">Información personal</h3>
              <dl className="text-sm text-tertiary/90 space-y-2">
                <div>
                  <dt className="font-medium">Conocido por</dt>
                  <dd>{person.known_for_department || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Género</dt>
                  <dd>{person.gender === 1 ? 'Femenino' : person.gender === 2 ? 'Masculino' : '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Cumpleaños</dt>
                  <dd>
                    {person.birthday || '—'} {person.birthday && <span className="opacity-75">({ageFrom(person.birthday, person.deathday)})</span>}
                  </dd>
                </div>
                {person.deathday && (
                  <div>
                    <dt className="font-medium">Fallecimiento</dt>
                    <dd>{person.deathday}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium">Lugar de nacimiento</dt>
                  <dd>{person.place_of_birth || '—'}</dd>
                </div>
                {person.also_known_as && person.also_known_as.length > 0 && (
                  <div>
                    <dt className="font-medium">También conocido como</dt>
                    <dd className="whitespace-pre-line">{person.also_known_as.slice(0, 6).join('\n')}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>

          {/* Columna derecha: biografía, known for y créditos */}
          <section className="lg:col-span-3 space-y-6">
            {/* Biografía */}
            <div className="glass-panel p-6">
              <h3 className="card-title mb-3">Biografía</h3>
              <p className="text-tertiary/90 leading-relaxed whitespace-pre-line">
                {person.biography && person.biography.trim().length > 0 ? person.biography : 'No hay biografía disponible.'}
              </p>
            </div>

            {/* Known For */}
            {knownFor.length > 0 && (
              <div className="glass-panel p-6">
                <h3 className="card-title mb-4">Conocido por</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {knownFor.map((k) => (
                    <button
                      key={`${k.media_type}-${k.id}`}
                      className="shrink-0 w-36 glass-card p-2 text-left hover:scale-105 transition-transform"
                      onClick={() =>
                        navigate(k.media_type === 'movie' ? `/movie/${k.id}` : `/tv/${k.id}`)
                      }
                    >
                      <div className="relative pb-[150%]">
                        <img
                          src={k.poster_path ? `https://image.tmdb.org/t/p/w185${k.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                          alt={(k.media_type === 'movie' ? k.title : k.name) || ''}
                          className="absolute inset-0 w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-tertiary truncate">{k.media_type === 'movie' ? k.title : k.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Créditos de actuación */}
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title">Actuación</h3>
                <div className="text-tertiary/70 text-sm">Todos</div>
              </div>
              <div className="divide-y divide-primary/40">
                {actingCredits.map((c) => {
                  const year = c.media_type === 'movie' ? yearOf(c.release_date) : yearOf(c.first_air_date);
                  const title = c.media_type === 'movie' ? c.title : c.name;
                  return (
                    <div key={`${c.media_type}-${c.id}-${c.character}-${c.job}`} className="py-3 flex items-center gap-3">
                      <div className="text-tertiary/70 w-14 shrink-0 text-sm">{year}</div>
                      <div className="flex-1">
                        <Link
                          to={c.media_type === 'movie' ? `/movie/${c.id}` : `/tv/${c.id}`}
                          className="text-tertiary hover:opacity-80 text-sm font-medium"
                        >
                          {title}
                        </Link>
                        <span className="text-tertiary/70 text-sm"> {c.character ? `como ${c.character}` : c.job ? `— ${c.job}` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PersonDetails;