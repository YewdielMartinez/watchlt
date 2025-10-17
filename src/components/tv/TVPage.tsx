import React, { useEffect, useState } from 'react';
import Navbar from '../layout/Navbar';
import { TVShow, getPopularTV, getTopRatedTV, getAiringTodayTV, getOnTheAirTV } from '../../services/tmdbApi';
import TVCarousel from './TVCarousel';
import { useNavigate } from 'react-router-dom';

const TVPage: React.FC = () => {
  const [popular, setPopular] = useState<TVShow[]>([]);
  const [topRated, setTopRated] = useState<TVShow[]>([]);
  const [airingToday, setAiringToday] = useState<TVShow[]>([]);
  const [onTheAir, setOnTheAir] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [p, t, a, o] = await Promise.all([
          getPopularTV(),
          getTopRatedTV(),
          getAiringTodayTV(),
          getOnTheAirTV()
        ]);
        setPopular(p); setTopRated(t); setAiringToday(a); setOnTheAir(o);
        setError('');
      } catch (e) {
        console.error(e);
        setError('No se pudieron cargar las listas de series');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openDetails = (show: TVShow) => navigate(`/tv/${show.id}`);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">Series</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {!loading && (
          <>
            <TVCarousel title="Populares" shows={popular} onSelect={openDetails} />
            <TVCarousel title="Mejor calificadas" shows={topRated} onSelect={openDetails} />
            <TVCarousel title="Emitiéndose hoy" shows={airingToday} onSelect={openDetails} />
            <TVCarousel title="En el aire" shows={onTheAir} onSelect={openDetails} />
          </>
        )}
      </main>
    </div>
  );
};

export default TVPage;