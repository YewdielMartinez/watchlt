import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../layout/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { fetchUserCollection } from "../../services/userData";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";

type Crit = { key: string; name: string; weight: number };

const defaultMovieCriteria: Crit[] = [
  { key: "rating", name: "Calificación IMDB", weight: 7 },
  { key: "year", name: "Año de estreno (más reciente)", weight: 5 },
  { key: "popularity", name: "Popularidad", weight: 6 },
  { key: "runtime", name: "Duración (min)", weight: 5 },
  { key: "votes", name: "Votos totales", weight: 4 },
  { key: "revenue", name: "Recaudación", weight: 5 },
  { key: "roi", name: "Rentabilidad (Ingresos/Presupuesto)", weight: 6 },
];

const defaultTvCriteria: Crit[] = [
  { key: "rating", name: "Calificación TMDB", weight: 7 },
  { key: "year", name: "Año de estreno (más reciente)", weight: 5 },
  { key: "popularity", name: "Popularidad", weight: 6 },
  { key: "votes", name: "Votos totales", weight: 5 },
  { key: "seasons", name: "Temporadas", weight: 4 },
  { key: "episodes", name: "N.º de episodios", weight: 5 },
  { key: "ep_runtime", name: "Duración de episodio (min)", weight: 3 },
];

const readLocal = (key: string, fallback: Crit[]): Crit[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [movieCriteria, setMovieCriteria] = useState<Crit[]>(() =>
    readLocal("movieCriteriaDefaults", defaultMovieCriteria)
  );
  const [tvCriteria, setTvCriteria] = useState<Crit[]>(() =>
    readLocal("tvCriteriaDefaults", defaultTvCriteria)
  );
  const [ratings, setRatings] = useState<any[]>([]);
  const [movieCompareLimit, setMovieCompareLimit] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("compare_limit_movies");
      const n = raw ? parseInt(raw) : 15;
      return Number.isFinite(n) ? Math.max(2, Math.min(30, n)) : 15;
    } catch {
      return 15;
    }
  });

  // Calcular peso total de películas
  const totalMovieWeight = useMemo(
    () => movieCriteria.reduce((sum, c) => sum + c.weight, 0),
    [movieCriteria]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    fetchUserCollection(currentUser.uid, "ratings")
      .then(setRatings)
      .catch(() => setRatings([]));
  }, [currentUser?.uid]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "movieCriteriaDefaults",
        JSON.stringify(movieCriteria)
      );
    } catch {}
  }, [movieCriteria]);

  useEffect(() => {
    try {
      localStorage.setItem("tvCriteriaDefaults", JSON.stringify(tvCriteria));
    } catch {}
  }, [tvCriteria]);

  useEffect(() => {
    try {
      localStorage.setItem("compare_limit_movies", String(movieCompareLimit));
    } catch {}
  }, [movieCompareLimit]);

  const movieRatings = useMemo(
    () => ratings.filter((r) => r.type === "movie"),
    [ratings]
  );

  const updateCrit = (
    list: Crit[],
    i: number,
    w: number,
    setter: (v: Crit[]) => void
  ) => {
    const next = [...list];
    next[i] = { ...next[i], weight: w };
    setter(next);
  };

  // Función para obtener el color según el peso (tonos dorados/ámbar cinematográficos)
  const getColorClasses = (weight: number) => {
    if (weight >= 8)
      return {
        bg: "from-amber-400/10 to-yellow-500/10",
        border: "border-amber-400/30",
        text: "text-amber-400",
        gradient: "from-amber-400 to-yellow-500",
      };
    if (weight >= 6)
      return {
        bg: "from-amber-500/10 to-amber-600/10",
        border: "border-amber-500/30",
        text: "text-amber-500",
        gradient: "from-amber-500 to-amber-600",
      };
    if (weight >= 4)
      return {
        bg: "from-amber-700/10 to-amber-800/10",
        border: "border-amber-700/30",
        text: "text-amber-600",
        gradient: "from-amber-700 to-amber-800",
      };
    return {
      bg: "from-amber-900/10 to-yellow-900/10",
      border: "border-amber-900/30",
      text: "text-amber-700",
      gradient: "from-amber-900 to-yellow-900",
    };
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-tertiary mb-6">Configuración</h1>

        <GlassElement
          width={0}
          height={0}
          radius={16}
          depth={8}
          strength={70}
          chromaticAberration={3}
          blur={3}
        >
          <div className="p-6 mb-8">
            <h2 className="card-title mb-4">Criterios por defecto</h2>
            <p className="text-tertiary/80 text-sm mb-6">
              Estos pesos se aplican por defecto en las comparaciones. Puedes
              ajustarlos aquí y se guardarán en este dispositivo.
            </p>

            <div className="space-y-6">
              {/* Películas */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-tertiary">
                    Películas
                  </h3>
                  <button
                    className="btn-accent text-sm px-4 py-2 flex items-center gap-2 hover:scale-105 transition-transform"
                    onClick={() => setMovieCriteria(defaultMovieCriteria)}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Restaurar valores
                  </button>
                </div>

                {/* Grid de criterios */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {movieCriteria.map((c, i) => {
                    const colors = getColorClasses(c.weight);
                    return (
                      <div
                        key={c.key}
                        className={`glass-panel p-4 border-2 bg-gradient-to-br ${colors.bg} ${colors.border} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                      >
                        {/* Header con nombre y valor */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-tertiary">
                            {c.name}
                          </span>
                          <span className={`text-2xl font-bold ${colors.text}`}>
                            {c.weight}
                          </span>
                        </div>

                        {/* Barras de intensidad visual */}
                        <div className="flex items-end justify-between gap-1 h-12 mb-3">
                          {Array.from({ length: 10 }).map((_, level) => {
                            const isActive = level < c.weight;
                            const barColors = getColorClasses(level + 1);
                            return (
                              <div
                                key={level}
                                className={`flex-1 rounded-t transition-all duration-500 ${
                                  isActive
                                    ? `bg-gradient-to-t ${barColors.gradient} opacity-80`
                                    : "bg-white/5"
                                }`}
                                style={{
                                  height: `${((level + 1) / 10) * 100}%`,
                                  transitionDelay: `${level * 20}ms`,
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-tertiary/50 w-4">
                              1
                            </span>
                            <div className="flex-grow relative">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={c.weight}
                                onChange={(e) =>
                                  updateCrit(
                                    movieCriteria,
                                    i,
                                    parseInt(e.target.value),
                                    setMovieCriteria
                                  )
                                }
                                className={`slider-${c.key} w-full h-2 rounded-lg appearance-none cursor-pointer`}
                                style={{
                                  background: `linear-gradient(to right, 
                                  rgb(120, 53, 15) 0%, 
                                  rgb(146, 64, 14) 25%, 
                                  rgb(217, 119, 6) 50%, 
                                  rgb(245, 158, 11) 75%, 
                                  rgb(251, 191, 36) 100%)`,
                                }}
                              />
                              <style
                                dangerouslySetInnerHTML={{
                                  __html: `
                              .slider-${c.key}::-webkit-slider-thumb {
                                appearance: none;
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                background: ${(() => {
                                  const percent = ((c.weight - 1) / 9) * 100;
                                  if (percent <= 25) {
                                    const t = percent / 25;
                                    const r = Math.round(120 + (146 - 120) * t);
                                    const g = Math.round(53 + (64 - 53) * t);
                                    const b = Math.round(15 + (14 - 15) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else if (percent <= 50) {
                                    const t = (percent - 25) / 25;
                                    const r = Math.round(146 + (217 - 146) * t);
                                    const g = Math.round(64 + (119 - 64) * t);
                                    const b = Math.round(14 + (6 - 14) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else if (percent <= 75) {
                                    const t = (percent - 50) / 25;
                                    const r = Math.round(217 + (245 - 217) * t);
                                    const g = Math.round(119 + (158 - 119) * t);
                                    const b = Math.round(6 + (11 - 6) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else {
                                    const t = (percent - 75) / 25;
                                    const r = Math.round(245 + (251 - 245) * t);
                                    const g = Math.round(158 + (191 - 158) * t);
                                    const b = Math.round(11 + (36 - 11) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  }
                                })()};
                                cursor: pointer;
                                box-shadow: 0 2px 8px ${(() => {
                                  const percent = ((c.weight - 1) / 9) * 100;
                                  if (percent <= 25) {
                                    const t = percent / 25;
                                    const r = Math.round(120 + (146 - 120) * t);
                                    const g = Math.round(53 + (64 - 53) * t);
                                    const b = Math.round(15 + (14 - 15) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  } else if (percent <= 50) {
                                    const t = (percent - 25) / 25;
                                    const r = Math.round(146 + (217 - 146) * t);
                                    const g = Math.round(64 + (119 - 64) * t);
                                    const b = Math.round(14 + (6 - 14) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  } else if (percent <= 75) {
                                    const t = (percent - 50) / 25;
                                    const r = Math.round(217 + (245 - 217) * t);
                                    const g = Math.round(119 + (158 - 119) * t);
                                    const b = Math.round(6 + (11 - 6) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  } else {
                                    const t = (percent - 75) / 25;
                                    const r = Math.round(245 + (251 - 245) * t);
                                    const g = Math.round(158 + (191 - 158) * t);
                                    const b = Math.round(11 + (36 - 11) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  }
                                })()};
                                transition: transform 0.2s ease;
                              }
                              .slider-${c.key}::-webkit-slider-thumb:hover {
                                transform: scale(1.3);
                              }
                              .slider-${c.key}::-webkit-slider-thumb:active {
                                transform: scale(1.5);
                              }
                              .slider-${c.key}::-moz-range-thumb {
                                width: 20px;
                                height: 20px;
                                border: none;
                                border-radius: 50%;
                                background: ${(() => {
                                  const percent = ((c.weight - 1) / 9) * 100;
                                  if (percent <= 25) {
                                    const t = percent / 25;
                                    const r = Math.round(120 + (146 - 120) * t);
                                    const g = Math.round(53 + (64 - 53) * t);
                                    const b = Math.round(15 + (14 - 15) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else if (percent <= 50) {
                                    const t = (percent - 25) / 25;
                                    const r = Math.round(146 + (217 - 146) * t);
                                    const g = Math.round(64 + (119 - 64) * t);
                                    const b = Math.round(14 + (6 - 14) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else if (percent <= 75) {
                                    const t = (percent - 50) / 25;
                                    const r = Math.round(217 + (245 - 217) * t);
                                    const g = Math.round(119 + (158 - 119) * t);
                                    const b = Math.round(6 + (11 - 6) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else {
                                    const t = (percent - 75) / 25;
                                    const r = Math.round(245 + (251 - 245) * t);
                                    const g = Math.round(158 + (191 - 158) * t);
                                    const b = Math.round(11 + (36 - 11) * t);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  }
                                })()};
                                cursor: pointer;
                                box-shadow: 0 2px 8px ${(() => {
                                  const percent = ((c.weight - 1) / 9) * 100;
                                  if (percent <= 25) {
                                    const t = percent / 25;
                                    const r = Math.round(120 + (146 - 120) * t);
                                    const g = Math.round(53 + (64 - 53) * t);
                                    const b = Math.round(15 + (14 - 15) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  } else if (percent <= 50) {
                                    const t = (percent - 25) / 25;
                                    const r = Math.round(146 + (217 - 146) * t);
                                    const g = Math.round(64 + (119 - 64) * t);
                                    const b = Math.round(14 + (6 - 14) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  } else if (percent <= 75) {
                                    const t = (percent - 50) / 25;
                                    const r = Math.round(217 + (245 - 217) * t);
                                    const g = Math.round(119 + (158 - 119) * t);
                                    const b = Math.round(6 + (11 - 6) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  } else {
                                    const t = (percent - 75) / 25;
                                    const r = Math.round(245 + (251 - 245) * t);
                                    const g = Math.round(158 + (191 - 158) * t);
                                    const b = Math.round(11 + (36 - 11) * t);
                                    return `rgba(${r}, ${g}, ${b}, 0.4)`;
                                  }
                                })()};
                                transition: transform 0.2s ease;
                              }
                              .slider-${c.key}::-moz-range-thumb:hover {
                                transform: scale(1.3);
                              }
                              .slider-${c.key}::-moz-range-thumb:active {
                                transform: scale(1.5);
                              }
                            `,
                                }}
                              />
                            </div>
                            <span className="text-xs text-tertiary/50 w-4">
                              10
                            </span>
                          </div>

                          {/* Barra de progreso visual */}
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 shadow-lg`}
                              style={{
                                width: `${(c.weight / 10) * 100}%`,
                                boxShadow: `0 0 10px ${
                                  c.weight <= 3
                                    ? "rgba(120, 53, 15, 0.5)"
                                    : c.weight <= 5
                                    ? "rgba(146, 64, 14, 0.5)"
                                    : c.weight <= 7
                                    ? "rgba(217, 119, 6, 0.5)"
                                    : "rgba(251, 191, 36, 0.5)"
                                }`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Panel de resumen */}
                <div className="glass-panel p-4 border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-tertiary/70 mb-1">
                        Peso total de criterios
                      </p>
                      <p className="text-xs text-tertiary/50">
                        Suma de todos los pesos configurados
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-accent">
                        {totalMovieWeight}
                      </p>
                      <p className="text-xs text-tertiary/70">
                        / {movieCriteria.length * 10}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassElement>

        <GlassElement
          width={0}
          height={0}
          radius={16}
          depth={8}
          strength={70}
          chromaticAberration={3}
          blur={3}
        >
          <div className="p-6 mb-8">
            <h2 className="card-title mb-4">Límite de comparación</h2>
            <p className="text-tertiary/80 text-sm mb-4">
              Configura cuántas películas puedes seleccionar para comparar.
            </p>
            <div className="flex items-center gap-4">
              <label htmlFor="limitMovies" className="text-tertiary">
                Películas
              </label>
              <input
                id="limitMovies"
                type="number"
                min={2}
                max={30}
                value={movieCompareLimit}
                onChange={(e) =>
                  setMovieCompareLimit(
                    Math.max(2, Math.min(30, parseInt(e.target.value || "0")))
                  )
                }
                className="glass-input w-28 px-3 py-2 rounded"
              />
              <span className="text-tertiary/70 text-sm">entre 2 y 30</span>
            </div>
          </div>
        </GlassElement>
      </main>
    </div>
  );
};

export default Settings;
