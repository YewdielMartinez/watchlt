import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Movie } from '../services/tmdbApi';

type UIContextType = {
  backgroundUrl: string | null;
  setBackgroundUrl: (url: string | null) => void;
  setBackgroundFromMovie: (movie: Movie | null) => void;
  lockBackground: boolean;
  setLockBackground: (lock: boolean) => void;
};

const UIContext = createContext<UIContextType | null>(null);

export const useUI = (): UIContextType => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fondo por defecto: usa REACT_APP_DEFAULT_BG_URL si está definido
  const DEFAULT_BG_URL =
    (process.env.REACT_APP_DEFAULT_BG_URL as string | undefined) ?? `${process.env.PUBLIC_URL || ''}/backgrounds/app-bg.png`;
  const [backgroundUrl, setBgState] = useState<string | null>(DEFAULT_BG_URL);
  const [lockBackground, setLockBackground] = useState<boolean>(true);

  const setBackgroundUrl = useCallback((url: string | null) => {
    if (lockBackground) {
      // Si está bloqueado, nunca dejamos fondo nulo: usamos el por defecto
      setBgState(url ?? DEFAULT_BG_URL);
    } else {
      setBgState(url);
    }
  }, [lockBackground, DEFAULT_BG_URL]);

  const setBackgroundFromMovie = useCallback((movie: Movie | null) => {
    // Si el fondo está bloqueado, mantenemos el fondo estático configurado
    if (lockBackground) return;
    if (!movie) {
      setBgState(null);
      return;
    }
    const url = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : null;
    setBgState(url);
  }, [lockBackground]);

  const value = useMemo(
    () => ({ backgroundUrl, setBackgroundUrl, setBackgroundFromMovie, lockBackground, setLockBackground }),
    [backgroundUrl, setBackgroundUrl, setBackgroundFromMovie, lockBackground]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};