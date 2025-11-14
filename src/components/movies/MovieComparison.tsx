import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Movie, getMovieDetails } from "../../services/tmdbApi";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useAuth } from "../../contexts/AuthContext";
import { addComparisonHistory } from "../../services/userData";
import { useNavigate } from "react-router-dom";
import {
  TrophyIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  ChartBarIcon,
  FilmIcon,
} from "@heroicons/react/24/solid";

// Registrar los componentes de Chart.js
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// Helpers de formato
const formatMoney = (value: number) => {
  if (!value || value <= 0) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const formatRoi = (revenue: number, budget: number) => {
  if (!budget || budget <= 0) return "—";
  const r = revenue / budget;
  return `${r.toFixed(2)}x`;
};

interface MovieComparisonProps {
  movies: Movie[];
}

interface CriteriaWeight {
  key:
    | "rating"
    | "year"
    | "popularity"
    | "runtime"
    | "votes"
    | "revenue"
    | "roi";
  name: string;
  weight: number;
}

const MovieComparison: React.FC<MovieComparisonProps> = ({ movies }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [criteria, setCriteria] = useState<CriteriaWeight[]>(() => {
    try {
      const saved = localStorage.getItem("movieCriteriaDefaults");
      if (saved) {
        const parsed = JSON.parse(saved) as CriteriaWeight[];
        const expected: CriteriaWeight["key"][] = [
          "rating",
          "year",
          "popularity",
          "runtime",
          "votes",
          "revenue",
          "roi",
        ];
        const ok =
          Array.isArray(parsed) &&
          expected.every((k) => parsed.find((p) => p.key === k));
        if (ok) return parsed;
      }
    } catch {}
    return [
      { key: "rating", name: "Calificación IMDB", weight: 7 },
      { key: "year", name: "Año de estreno (más reciente)", weight: 5 },
      { key: "popularity", name: "Popularidad", weight: 6 },
      { key: "runtime", name: "Duración (min)", weight: 5 },
      { key: "votes", name: "Votos totales", weight: 4 },
      { key: "revenue", name: "Recaudación", weight: 5 },
      { key: "roi", name: "Rentabilidad (Ingresos/Presupuesto)", weight: 6 },
    ];
  });
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [detailsCache, setDetailsCache] = useState<
    Record<number, Partial<Movie>>
  >({});
  const [savedKey, setSavedKey] = useState<string>("");

  useEffect(() => {
    const fetchMissing = async () => {
      for (const m of movies) {
        const needRuntime = !m.runtime && !detailsCache[m.id]?.runtime;
        const needRevenue =
          m.revenue == null && detailsCache[m.id]?.revenue == null;
        const needBudget =
          m.budget == null && detailsCache[m.id]?.budget == null;
        if (needRuntime || needRevenue || needBudget) {
          try {
            const det = await getMovieDetails(m.id);
            setDetailsCache((prev) => ({ ...prev, [m.id]: det }));
          } catch {
            // silencioso
          }
        }
      }
    };
    if (movies.length) fetchMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  const updateCriteriaWeight = useCallback(
    (index: number, newWeight: number) => {
      setCriteria((prev) => {
        const newCriteria = [...prev];
        newCriteria[index].weight = newWeight;
        return newCriteria;
      });
    },
    []
  );

  // Función para obtener el color según el peso (tonos dorados/ámbar cinematográficos)
  const getColorClasses = useCallback((weight: number) => {
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
  }, []);

  // Guardar cambios locales para usarlos como defaults si no hay Configuración
  useEffect(() => {
    try {
      localStorage.setItem("movieCriteriaDefaults", JSON.stringify(criteria));
    } catch {}
  }, [criteria]);

  // Calcular puntajes ponderados (escala final 1–100)
  const calculateScores = useMemo(() => {
    const pops = movies.map((m) => m.popularity ?? 0);
    const votes = movies.map((m) => m.vote_count ?? 0);
    const runtimes = movies.map(
      (m) => m.runtime ?? detailsCache[m.id]?.runtime ?? 0
    );
    const revenues = movies.map(
      (m) => m.revenue ?? detailsCache[m.id]?.revenue ?? 0
    );
    const budgets = movies.map(
      (m) => m.budget ?? detailsCache[m.id]?.budget ?? 0
    );
    const rois = movies.map((m, i) => {
      const rev = revenues[i] || 0;
      const bud = budgets[i] || 0;
      return bud > 0 ? rev / bud : 0;
    });
    const minPop = Math.min(...pops);
    const maxPop = Math.max(...pops);
    const minVotes = Math.min(...votes);
    const maxVotes = Math.max(...votes);
    const minRun = Math.min(...runtimes);
    const maxRun = Math.max(...runtimes);
    const minRev = Math.min(...revenues);
    const maxRev = Math.max(...revenues);
    const minRoi = Math.min(...rois);
    const maxRoi = Math.max(...rois);
    const popRange = Math.max(1, maxPop - minPop);
    const votesRange = Math.max(1, maxVotes - minVotes);
    const runRange = Math.max(1, maxRun - minRun);
    const revRange = Math.max(1, maxRev - minRev);
    const roiRange = Math.max(1, maxRoi - minRoi);

    return movies
      .map((movie) => {
        const ratingScore10 = Math.max(
          0,
          Math.min(10, movie.vote_average ?? 0)
        );
        const currentYear = new Date().getFullYear();
        const releaseYear = movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : 0;
        const yearScore10 = Math.min(
          10,
          Math.max(0, ((releaseYear - 1900) / (currentYear - 1900)) * 10)
        );
        const popularityScore10 =
          (((movie.popularity ?? 0) - minPop) / popRange) * 10;
        const votesScore10 =
          (((movie.vote_count ?? 0) - minVotes) / votesRange) * 10;
        const runtimeVal =
          movie.runtime ?? detailsCache[movie.id]?.runtime ?? 0;
        const runtimeScore10 = ((runtimeVal - minRun) / runRange) * 10;
        const revenueVal =
          movie.revenue ?? detailsCache[movie.id]?.revenue ?? 0;
        const budgetVal = movie.budget ?? detailsCache[movie.id]?.budget ?? 0;
        const revenueScore10 = ((revenueVal - minRev) / revRange) * 10;
        const roiRaw = budgetVal > 0 ? revenueVal / budgetVal : 0;
        const roiScore10 = ((roiRaw - minRoi) / roiRange) * 10;

        const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
        const metricMap: Record<string, number> = {
          rating: ratingScore10,
          year: yearScore10,
          popularity: popularityScore10,
          runtime: runtimeScore10,
          votes: votesScore10,
          revenue: revenueScore10,
          roi: roiScore10,
        };
        const weightedSum = criteria.reduce(
          (sum, c) => sum + c.weight * (metricMap[c.key] ?? 0),
          0
        );
        const weightedScore10 = weightedSum / totalWeight;
        const weightedScore100 = Math.round(weightedScore10 * 10);

        return {
          movie,
          ratingScore10,
          yearScore10,
          popularityScore10,
          runtimeScore10,
          votesScore10,
          revenueScore10,
          roiScore10,
          weightedScore10,
          weightedScore100,
        };
      })
      .sort((a, b) => b.weightedScore100 - a.weightedScore100);
  }, [movies, criteria, detailsCache]);

  const scores = calculateScores;
  const top = useMemo(() => scores[0], [scores]);

  const [tint, setTint] = useState<string>("rgba(244,244,244,0.06)");

  const topMoviePosterPath = useMemo(
    () => top?.movie?.poster_path,
    [top?.movie?.poster_path]
  );

  useEffect(() => {
    if (!topMoviePosterPath) {
      setTint("rgba(244,244,244,0.06)");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://image.tmdb.org/t/p/w185${topMoviePosterPath}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 20;
        canvas.height = 20;
        ctx.drawImage(img, 0, 0, 20, 20);
        const data = ctx.getImageData(0, 0, 20, 20).data;
        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        setTint(`rgba(${r}, ${g}, ${b}, 0.14)`);
      } catch {
        setTint("rgba(244,244,244,0.06)");
      }
    };
    img.onerror = () => setTint("rgba(244,244,244,0.06)");
  }, [topMoviePosterPath]);

  const openDetails = useCallback(() => {
    console.log("📊 openDetails ejecutado - expandiendo detalles");
    setShowAll(true);
    setShowInfo(true);
    // No guardamos aquí porque ya se guardó automáticamente en el useEffect
    setTimeout(() => {
      const el = document.getElementById("comparacion-detalle");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  // Guardar comparación automáticamente cuando se muestra el componente
  const movieIds = useMemo(
    () => movies.map((m) => m.id).sort((a, b) => a - b),
    [movies]
  );

  useEffect(() => {
    if (!currentUser || movies.length < 2) return;

    const key = movieIds.join("-");

    if (key && key !== savedKey) {
      addComparisonHistory(currentUser.uid, {
        type: "movie",
        movies: movies.map((m) => m.title).filter(Boolean),
        ids: movieIds,
        timestamp: new Date().toISOString(),
      })
        .then(() => {
          console.log("✅ Comparación guardada automáticamente en Firebase");
          setSavedKey(key);
        })
        .catch((error) => {
          console.error(
            "❌ Error al guardar comparación automáticamente:",
            error
          );
        });
    }
  }, [currentUser, movieIds, savedKey, movies]);

  // Datos para el gráfico de radar
  const radarData = useMemo(
    () => ({
      labels: criteria.map((c) => c.name),
      datasets: scores.map((score, idx) => {
        const colors = [
          "rgba(251, 191, 36, 0.6)", // dorado brillante
          "rgba(217, 119, 6, 0.6)", // ámbar medio
          "rgba(146, 64, 14, 0.6)", // ámbar oscuro
          "rgba(120, 53, 15, 0.6)", // marrón oscuro
          "rgba(245, 158, 11, 0.6)", // dorado medio
          "rgba(234, 179, 8, 0.6)", // amarillo
          "rgba(202, 138, 4, 0.6)", // ámbar
        ];
        const borderColors = [
          "rgba(251, 191, 36, 1)",
          "rgba(217, 119, 6, 1)",
          "rgba(146, 64, 14, 1)",
          "rgba(120, 53, 15, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(234, 179, 8, 1)",
          "rgba(202, 138, 4, 1)",
        ];

        return {
          label: score.movie.title,
          data: [
            score.ratingScore10,
            score.yearScore10,
            score.popularityScore10,
            score.runtimeScore10,
            score.votesScore10,
            score.revenueScore10,
            score.roiScore10,
          ],
          backgroundColor: colors[idx % colors.length],
          borderColor: borderColors[idx % borderColors.length],
          borderWidth: 2,
          pointBackgroundColor: borderColors[idx % borderColors.length],
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: borderColors[idx % borderColors.length],
        };
      }),
    }),
    [criteria, scores]
  );

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: "#ffffff",
            padding: 15,
            font: { size: 11 },
          },
        },
        title: {
          display: true,
          text: "Comparación multidimensional",
          color: "#ffffff",
          font: { size: 16, weight: "bold" as const },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)}/10`,
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 10,
          ticks: {
            color: "#ffffff",
            backdropColor: "rgba(0,0,0,0.5)",
            stepSize: 2,
          },
          grid: { color: "rgba(255,255,255,0.2)" },
          pointLabels: {
            color: "#ffffff",
            font: { size: 10 },
          },
        },
      },
    }),
    []
  );

  return (
    <div>
      {!showAll && top && (
        <div
          className="mb-8 glass-card tinted-glass p-6 sm:p-8 flex flex-col lg:flex-row items-center gap-6 relative overflow-hidden"
          style={{ background: tint }}
        >
          {/* Efecto de brillo animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

          {/* Imagen del poster */}
          <button
            className="focus:outline-none relative group flex-shrink-0"
            onClick={() => navigate(`/movie/${top.movie.id}`)}
            aria-label={`Abrir detalles de ${top.movie.title}`}
            title="Ver detalles"
          >
            <div className="relative">
              <img
                src={
                  top.movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${top.movie.poster_path}`
                    : "https://via.placeholder.com/500x750?text=No+Image"
                }
                alt={top.movie.title}
                className="w-48 sm:w-56 md:w-64 rounded-lg shadow-2xl object-cover transition-transform duration-300 group-hover:scale-105 group-hover:shadow-accent/50"
              />
              {/* Badge de "Mejor opción" */}
              <div className="absolute -top-3 -right-3 bg-accent text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-1">
                <TrophyIcon className="w-4 h-4" />
                <span>#1</span>
              </div>
            </div>
          </button>

          {/* Información y controles */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full border border-accent/30 mb-3">
                MEJOR OPCIÓN
              </span>
            </div>

            <h3
              className="text-3xl sm:text-4xl font-bold text-tertiary mb-2 cursor-pointer hover:text-accent transition-colors duration-200"
              onClick={() => navigate(`/movie/${top.movie.id}`)}
              title="Ver detalles"
            >
              {top.movie.title}
            </h3>

            <div className="flex items-center justify-center lg:justify-start gap-3 text-tertiary/80 mb-4 flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {top.movie.release_date
                  ? new Date(top.movie.release_date).getFullYear()
                  : "—"}
              </span>
              <span className="text-tertiary/40">•</span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {top.movie.runtime ??
                  detailsCache[top.movie.id]?.runtime ??
                  0}{" "}
                min
              </span>
              <span className="text-tertiary/40">•</span>
              <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                <StarIcon className="w-4 h-4" />
                {typeof top.movie.vote_average === "number"
                  ? top.movie.vote_average.toFixed(1)
                  : "—"}
              </span>
            </div>

            {/* Puntaje destacado */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-accent/20 to-primary/20 px-6 py-4 rounded-xl border border-accent/30">
                <div className="text-left">
                  <div className="text-xs text-tertiary/70 uppercase tracking-wide mb-1">
                    Puntaje Final
                  </div>
                  <div className="text-5xl font-black text-accent">
                    {top.weightedScore100.toFixed(0)}
                  </div>
                </div>
                <div className="text-3xl text-tertiary/30">/</div>
                <div className="text-2xl text-tertiary/70 font-light">100</div>
              </div>
            </div>

            {/* Resumen compacto de criterios evaluados */}
            <div className="mb-6 glass-panel p-3 border border-primary/20 text-left max-w-md mx-auto lg:mx-0">
              <h4 className="text-xs font-semibold text-tertiary/80 mb-2 flex items-center gap-1">
                <ChartBarIcon className="w-3 h-3 text-accent" />
                Criterios evaluados
              </h4>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                {criteria.map((c) => {
                  const colors = getColorClasses(c.weight);
                  return (
                    <div
                      key={c.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-tertiary/60 truncate pr-1">
                        {c.name}
                      </span>
                      <span
                        className={`font-bold ${colors.text} whitespace-nowrap text-[11px]`}
                      >
                        {c.weight}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-center lg:justify-start gap-3 flex-wrap">
              <button
                className="btn-primary px-6 py-3 text-base font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                onClick={openDetails}
              >
                <ChartBarIcon className="w-5 h-5" />
                Ver análisis completo
              </button>
              <button
                className="btn-accent px-6 py-3 text-base font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                onClick={() => navigate(`/movie/${top.movie.id}`)}
              >
                <FilmIcon className="w-5 h-5" />
                Ver detalles
              </button>
            </div>
          </div>
        </div>
      )}

      {showAll && (
        <div className="mb-6" id="comparacion-detalle">
          <div className="glass-card p-6 border border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-tertiary mb-1">
                  Personaliza tu comparación
                </h3>
                <p className="text-sm text-tertiary/70">
                  Ajusta la importancia de cada criterio según tus preferencias
                </p>
              </div>
              <button
                className="btn-accent px-4 py-2"
                onClick={() => {
                  // Resetear a valores por defecto
                  const defaults: CriteriaWeight[] = [
                    { key: "rating", name: "Calificación IMDB", weight: 7 },
                    {
                      key: "year",
                      name: "Año de estreno (más reciente)",
                      weight: 5,
                    },
                    { key: "popularity", name: "Popularidad", weight: 6 },
                    { key: "runtime", name: "Duración (min)", weight: 5 },
                    { key: "votes", name: "Votos totales", weight: 4 },
                    { key: "revenue", name: "Recaudación", weight: 5 },
                    {
                      key: "roi",
                      name: "Rentabilidad (Ingresos/Presupuesto)",
                      weight: 6,
                    },
                  ];
                  setCriteria(defaults);
                }}
              >
                Restaurar valores
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criteria.map((criterion, index) => {
                const colors = getColorClasses(criterion.weight);

                return (
                  <div
                    key={criterion.key}
                    className={`glass-panel p-4 border-2 bg-gradient-to-br ${colors.bg} ${colors.border} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                  >
                    {/* Header con nombre y valor */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-tertiary">
                        {criterion.name}
                      </span>
                      <span className={`text-2xl font-bold ${colors.text}`}>
                        {criterion.weight}
                      </span>
                    </div>

                    {/* Barras de intensidad visual */}
                    <div className="flex items-end justify-between gap-1 h-12 mb-3">
                      {Array.from({ length: 10 }).map((_, level) => {
                        const isActive = level < criterion.weight;
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

                    {/* Slider con gradiente dorado/ámbar cinematográfico */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-tertiary/50 w-4">1</span>
                        <div className="flex-grow relative">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={criterion.weight}
                            onChange={(e) =>
                              updateCriteriaWeight(
                                index,
                                parseInt(e.target.value)
                              )
                            }
                            className={`slider-comp-${criterion.key} w-full h-2 rounded-lg appearance-none cursor-pointer`}
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
                          .slider-comp-${criterion.key}::-webkit-slider-thumb {
                            appearance: none;
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            background: ${(() => {
                              const percent =
                                ((criterion.weight - 1) / 9) * 100;
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
                              const percent =
                                ((criterion.weight - 1) / 9) * 100;
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
                          .slider-comp-${
                            criterion.key
                          }::-webkit-slider-thumb:hover {
                            transform: scale(1.3);
                          }
                          .slider-comp-${
                            criterion.key
                          }::-webkit-slider-thumb:active {
                            transform: scale(1.5);
                          }
                          .slider-comp-${criterion.key}::-moz-range-thumb {
                            width: 20px;
                            height: 20px;
                            border: none;
                            border-radius: 50%;
                            background: ${(() => {
                              const percent =
                                ((criterion.weight - 1) / 9) * 100;
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
                              const percent =
                                ((criterion.weight - 1) / 9) * 100;
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
                          .slider-comp-${
                            criterion.key
                          }::-moz-range-thumb:hover {
                            transform: scale(1.3);
                          }
                          .slider-comp-${
                            criterion.key
                          }::-moz-range-thumb:active {
                            transform: scale(1.5);
                          }
                        `,
                            }}
                          />
                        </div>
                        <span className="text-xs text-tertiary/50 w-4">10</span>
                      </div>

                      {/* Barra de progreso visual */}
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 shadow-lg`}
                          style={{
                            width: `${(criterion.weight / 10) * 100}%`,
                            boxShadow: `0 0 10px ${
                              criterion.weight <= 3
                                ? "rgba(120, 53, 15, 0.5)"
                                : criterion.weight <= 5
                                ? "rgba(146, 64, 14, 0.5)"
                                : criterion.weight <= 7
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

            {/* Resumen de pesos */}
            <div className="mt-6 p-4 bg-primary/20 rounded-lg border border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-tertiary/80">
                    Peso total asignado:
                  </span>
                  <span className="text-lg font-bold text-accent">
                    {criteria.reduce((sum, c) => sum + c.weight, 0)}/
                    {criteria.length * 10}
                  </span>
                </div>
                <div className="text-xs text-tertiary/60">
                  Los puntajes se calculan proporcionalmente
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAll && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            className="px-3 py-1.5 rounded-md bg-primary/30 hover:bg-primary/40 text-tertiary text-sm border border-primary/40"
            onClick={() => setShowInfo((v) => !v)}
          >
            {showInfo
              ? "Ocultar explicación de cálculo"
              : "Ver cómo se calcula el puntaje"}
          </button>
          <button
            className="px-3 py-1.5 rounded-md bg-accent/20 hover:bg-accent/30 text-tertiary text-sm border border-accent/40"
            onClick={() => setShowAll(false)}
          >
            Mostrar menos
          </button>
        </div>
      )}

      {showAll && showInfo && (
        <div className="mb-6 p-3 rounded-lg border border-primary/30 bg-primary/20 text-tertiary text-[13px] leading-relaxed">
          <p className="opacity-90">
            Calculamos un puntaje final (1–100) combinando varias métricas
            normalizadas a escala 0–10 y ponderadas por la importancia que
            configuras.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 opacity-90">
            <li>
              Calificación: usa <code>vote_average</code> (0–10).
            </li>
            <li>
              Año: películas más recientes obtienen mayor puntaje relativo.
            </li>
            <li>
              Popularidad, votos, duración, recaudación y rentabilidad
              (ingresos/presupuesto) se normalizan entre el mínimo y máximo del
              conjunto comparado.
            </li>
            <li>
              El puntaje final = suma( peso_i × métrica_i_normalizada ) /
              suma(pesos) × 10.
            </li>
            <li>
              Ordenamos de mayor a menor puntaje; la primera fila es la más
              compatible.
            </li>
          </ul>
        </div>
      )}

      {showAll && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-tertiary mb-3 section-title">
            Resultados de la comparación
          </h3>
          <div className="overflow-x-auto card">
            <table className="comparison-table min-w-full divide-y divide-primary/40 border border-primary border-opacity-30">
              <thead className="bg-primary bg-opacity-25">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Película
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Calificación
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Año
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Popularidad
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Duración
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Votos
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Recaudación
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Rentabilidad
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-tertiary opacity-80 uppercase tracking-wider"
                  >
                    Puntaje final (1–100)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-primary bg-opacity-10 divide-y divide-primary/30">
                {scores.map((score) => (
                  <tr
                    key={score.movie.id}
                    className={
                      score === scores[0] ? "bg-accent bg-opacity-10" : ""
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={
                              score.movie.poster_path
                                ? `https://image.tmdb.org/t/p/w92${score.movie.poster_path}`
                                : "https://via.placeholder.com/92x138?text=No+Image"
                            }
                            alt={score.movie.title}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-tertiary">
                            {score.movie.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {score.ratingScore10.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {score.movie.release_date
                          ? new Date(score.movie.release_date).getFullYear()
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {score.popularityScore10.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {score.movie.runtime ??
                          detailsCache[score.movie.id]?.runtime ??
                          0}{" "}
                        min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {(score.movie.vote_count ?? 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {formatMoney(
                          score.movie.revenue ??
                            detailsCache[score.movie.id]?.revenue ??
                            0
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tertiary">
                        {formatRoi(
                          score.movie.revenue ??
                            detailsCache[score.movie.id]?.revenue ??
                            0,
                          score.movie.budget ??
                            detailsCache[score.movie.id]?.budget ??
                            0
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-tertiary">
                        {score.weightedScore100.toFixed(0)} pts
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAll && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-tertiary mb-3">
            Gráfica comparativa
          </h3>
          <div
            className="glass-card p-6 tinted-glass"
            style={{ background: tint }}
          >
            <div className="h-96">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieComparison;
