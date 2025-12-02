import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../layout/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";
import {
  Movie,
  getMovieDetails,
  getMovieGenres,
  Genre,
} from "../../services/tmdbApi";
import {
  setFavoriteGenres,
  fetchUserCollection,
} from "../../services/userData";
import { setCompareList } from "../../services/compareStore";
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
  const [error, setError] = useState("");
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [savingGenres, setSavingGenres] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [showAllComparisons, setShowAllComparisons] = useState(false);
  const navigate = useNavigate();

  const displayName = useMemo(() => {
    if (!currentUser) return "";
    return currentUser.displayName || currentUser.email?.split("@")[0] || "";
  }, [currentUser]);

  const derivedNames = useMemo(() => {
    const name =
      userDoc?.firstName ||
      displayName?.split(" ")[0] ||
      userDoc?.username ||
      "";
    const last =
      userDoc?.lastName || displayName?.split(" ").slice(1).join(" ") || "";
    return { name, last };
  }, [userDoc, displayName]);

  useEffect(() => {
    // Fetch static list of movie genres from TMDB
    getMovieGenres()
      .then((gs) => setAvailableGenres(gs || []))
      .catch((e) => console.error("Error cargando géneros", e));
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const uid = currentUser.uid;
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        const data = (snap.exists() ? snap.data() : null) as UserDoc | null;
        setUserDoc(data);
        setSelectedGenreIds(
          Array.isArray(data?.favoriteGenres)
            ? (data!.favoriteGenres as number[])
            : []
        );
        // Leer subcolecciones
        const [likesSnap, wlSnap, ratSnap] = await Promise.all([
          getDocs(collection(db, "users", uid, "likes")),
          getDocs(collection(db, "users", uid, "watchlist")),
          getDocs(collection(db, "users", uid, "ratings")),
        ]);
        setLikes(likesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setWatchlist(wlSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setRatings(ratSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        // Resolver favoritos: pueden ser ids o objetos Movie
        const favs = (data?.favorites || []) as Array<number | Movie>;
        const ids = favs
          .map((f) => (typeof f === "number" ? f : (f?.id as number)))
          .filter(Boolean)
          .slice(0, 12);
        if (ids.length) {
          const details = await Promise.all(
            ids.map((id) => getMovieDetails(id))
          );
          setFavoriteMovies(details);
        } else {
          setFavoriteMovies([]);
        }
        setError("");
      } catch (e: any) {
        console.error(e);
        setError("No se pudo cargar el perfil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const toggleGenre = (id: number) => {
    setSelectedGenreIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSaveGenres = async () => {
    if (!currentUser) return;
    try {
      setSavingGenres(true);
      setSaveMsg("");
      await setFavoriteGenres(currentUser.uid, selectedGenreIds);
      setSaveMsg("Géneros favoritos guardados");
      // reflect in local userDoc
      setUserDoc((prev) => ({
        ...(prev || {}),
        favoriteGenres: selectedGenreIds,
      }));
    } catch (e) {
      console.error(e);
      setSaveMsg("No se pudieron guardar los géneros");
    } finally {
      setSavingGenres(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-panel p-6">
          Debes iniciar sesión para ver tu perfil.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">
          Perfil
        </h1>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del usuario */}
          <GlassElement
            width={0}
            height={0}
            radius={16}
            depth={8}
            strength={70}
            chromaticAberration={3}
            blur={3}
          >
            <div className="p-6 lg:col-span-1">
              <h2 className="card-title mb-4">Información de usuario</h2>
              {loading ? (
                <div>Cargando...</div>
              ) : (
                <dl className="space-y-3 text-tertiary">
                  <div className="flex justify-between">
                    <dt className="opacity-80">Nombre</dt>
                    <dd className="font-medium">{derivedNames.name || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-80">Apellidos</dt>
                    <dd className="font-medium">{derivedNames.last || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-80">Correo</dt>
                    <dd className="font-medium">{currentUser.email || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-80">Desde</dt>
                    <dd className="font-medium">
                      {userDoc?.createdAt
                        ? new Date(userDoc.createdAt).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </GlassElement>

          {/* Géneros favoritos */}
          <GlassElement
            width={0}
            height={0}
            radius={16}
            depth={8}
            strength={70}
            chromaticAberration={3}
            blur={3}
          >
            <div className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="card-title">Géneros favoritos</h2>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveGenres}
                  disabled={savingGenres}
                >
                  {savingGenres ? "Guardando..." : "Guardar"}
                </button>
              </div>
              <p className="text-sm text-tertiary opacity-80 mb-4">
                Selecciona tus géneros favoritos para personalizar
                recomendaciones en Inicio.
              </p>
              {availableGenres.length ? (
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map((g) => {
                    const active = selectedGenreIds.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        className={`px-3 py-1 rounded-full border text-sm transition ${
                          active
                            ? "bg-primary text-white border-primary"
                            : "glass border-primary/30 text-tertiary"
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
              {saveMsg && (
                <div className="mt-3 text-sm text-tertiary">{saveMsg}</div>
              )}
            </div>
          </GlassElement>

          {/* Sección Favoritos oculta temporalmente */}
        </div>

        {/* Me gusta y Ver más tarde */}
        <GlassElement
          width={0}
          height={0}
          radius={16}
          depth={8}
          strength={70}
          chromaticAberration={3}
          blur={3}
        >
          <div className="p-6 mt-6">
            <h2 className="card-title mb-4">Me gusta</h2>
            {loading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-accent/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            ) : likes.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {likes.map((it: any) => (
                  <button
                    key={it.id}
                    className="glass-card p-2 rounded text-left hover:scale-105 transition-transform"
                    onClick={() => {
                      const mediaId =
                        typeof it.id === "number"
                          ? it.id
                          : String(it.id).includes("_")
                          ? Number(String(it.id).split("_")[1])
                          : Number(it.id);
                      navigate(
                        `/${it.type === "movie" ? "movie" : "tv"}/${mediaId}`
                      );
                    }}
                  >
                    <img
                      src={
                        it.poster_path
                          ? `https://image.tmdb.org/t/p/w342${it.poster_path}`
                          : "https://via.placeholder.com/342x513?text=No+Image"
                      }
                      alt={it.title}
                      className="w-full aspect-[2/3] object-cover rounded"
                    />
                    <div
                      className="mt-2 text-xs text-tertiary truncate"
                      title={it.title}
                    >
                      {it.title}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-tertiary opacity-80">
                Aún no tienes likes.
              </div>
            )}
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
          <div className="p-6 mt-6">
            <h2 className="card-title mb-4">Ver más tarde</h2>
            {loading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-accent/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            ) : watchlist.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {watchlist.map((it: any) => (
                  <button
                    key={it.id}
                    className="glass-card p-2 rounded text-left hover:scale-105 transition-transform"
                    onClick={() => {
                      const mediaId =
                        typeof it.id === "number"
                          ? it.id
                          : String(it.id).includes("_")
                          ? Number(String(it.id).split("_")[1])
                          : Number(it.id);
                      navigate(
                        `/${it.type === "movie" ? "movie" : "tv"}/${mediaId}`
                      );
                    }}
                  >
                    <img
                      src={
                        it.poster_path
                          ? `https://image.tmdb.org/t/p/w342${it.poster_path}`
                          : "https://via.placeholder.com/342x513?text=No+Image"
                      }
                      alt={it.title}
                      className="w-full aspect-[2/3] object-cover rounded"
                    />
                    <div
                      className="mt-2 text-xs text-tertiary truncate"
                      title={it.title}
                    >
                      {it.title}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-tertiary opacity-80">
                Tu lista está vacía.
              </div>
            )}
          </div>
        </GlassElement>

        {/* Calificaciones */}
        <GlassElement
          width={0}
          height={0}
          radius={16}
          depth={8}
          strength={70}
          chromaticAberration={3}
          blur={3}
        >
          <div className="p-6 mt-6">
            <h2 className="card-title mb-4">Mis calificaciones</h2>
            {loading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-accent/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            ) : ratings.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {ratings.map((it: any) => (
                  <button
                    key={it.id}
                    className="glass-card p-2 rounded text-left hover:scale-105 transition-transform"
                    onClick={() => {
                      const mediaId =
                        typeof it.id === "number"
                          ? it.id
                          : String(it.id).includes("_")
                          ? Number(String(it.id).split("_")[1])
                          : Number(it.id);
                      navigate(
                        `/${it.type === "movie" ? "movie" : "tv"}/${mediaId}`
                      );
                    }}
                  >
                    <div className="relative">
                      <img
                        src={
                          it.poster_path
                            ? `https://image.tmdb.org/t/p/w342${it.poster_path}`
                            : "https://via.placeholder.com/342x513?text=No+Image"
                        }
                        alt={it.title}
                        className="w-full aspect-[2/3] object-cover rounded"
                      />
                      <div className="absolute bottom-2 right-2 glass-strong px-2 py-1 rounded-lg text-xs font-semibold bg-black/60 backdrop-blur-sm border border-white/20">
                        ⭐ {it.rating}/5
                      </div>
                    </div>
                    <div
                      className="mt-2 text-xs text-tertiary truncate"
                      title={it.title}
                    >
                      {it.title}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-tertiary opacity-80">
                Aún no calificaste contenidos.
              </div>
            )}
          </div>
        </GlassElement>

        {/* Historial */}
        <GlassElement
          width={0}
          height={0}
          radius={16}
          depth={8}
          strength={70}
          chromaticAberration={3}
          blur={3}
        >
          <div className="p-6 mt-6">
            <h2 className="card-title mb-4">Historial de comparaciones</h2>
            {loading ? (
              <div>Cargando historial...</div>
            ) : userDoc?.history && userDoc.history.length ? (
              <>
                <ul className="space-y-3 text-tertiary">
                  {userDoc.history
                    .slice(0, showAllComparisons ? undefined : 10)
                    .map((entry: any, idx: number) => (
                      <li
                        key={idx}
                        className="glass-card p-3 rounded border border-primary/30 hover:bg-primary/40 cursor-pointer transition"
                        title="Abrir esta comparación"
                        onClick={() => {
                          try {
                            if (
                              entry?.type === "movie" &&
                              Array.isArray(entry?.ids)
                            ) {
                              const list = entry.ids.map(
                                (id: number, i: number) => ({
                                  id,
                                  title:
                                    entry.movies?.[i] || `Película ${i + 1}`,
                                })
                              );
                              setCompareList("movie", list);
                              navigate("/compare");
                            } else if (
                              entry?.type === "tv" &&
                              Array.isArray(entry?.ids)
                            ) {
                              const list = entry.ids.map(
                                (id: number, i: number) => ({
                                  id,
                                  name: entry.shows?.[i] || `Serie ${i + 1}`,
                                })
                              );
                              setCompareList("tv", list);
                              navigate("/compare");
                            }
                          } catch {}
                        }}
                      >
                        <div className="text-sm">
                          <span className="opacity-80">Fecha: </span>
                          {entry.timestamp
                            ? new Date(entry.timestamp).toLocaleString()
                            : "—"}
                        </div>
                        <div className="text-sm">
                          <span className="opacity-80">
                            {entry?.type === "tv" ? "Series" : "Películas"}:{" "}
                          </span>
                          {Array.isArray(
                            entry?.type === "tv" ? entry.shows : entry.movies
                          )
                            ? (entry?.type === "tv"
                                ? entry.shows
                                : entry.movies
                              )
                                .map((v: any) =>
                                  typeof v === "string"
                                    ? v
                                    : v?.title || v?.name
                                )
                                .filter(Boolean)
                                .join(" • ")
                            : "—"}
                        </div>
                      </li>
                    ))}
                </ul>
                {userDoc.history.length > 10 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      className="btn-accent px-6 py-2 text-sm"
                      onClick={() => setShowAllComparisons(!showAllComparisons)}
                    >
                      {showAllComparisons
                        ? "Ver menos"
                        : `Ver más (${userDoc.history.length - 10} restantes)`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-tertiary opacity-80">
                Aún no hay comparaciones guardadas.
              </div>
            )}
          </div>
        </GlassElement>

        {/* Gráfica de análisis de gustos */}
        <GlassElement
          width={0}
          height={0}
          radius={16}
          depth={8}
          strength={70}
          chromaticAberration={3}
          blur={3}
        >
          <div className="p-6 mt-6">
            <h2 className="card-title mb-4">
              Análisis de tus gustos cinematográficos
            </h2>
            {loading ? (
              <div>Cargando análisis...</div>
            ) : favoriteMovies.length >= 2 ? (
              <div className="h-[500px] flex items-center justify-center">
                <Radar
                  data={{
                    labels: [
                      "Calificación",
                      "Antigüedad",
                      "Popularidad",
                      "Duración",
                      "Reconocimiento",
                    ],
                    datasets: [
                      {
                        label: "Tus preferencias",
                        data: [
                          favoriteMovies.reduce(
                            (sum, m) => sum + (m.vote_average || 0),
                            0
                          ) / favoriteMovies.length || 0,
                          favoriteMovies.reduce((sum, m) => {
                            const year = m.release_date
                              ? new Date(m.release_date).getFullYear()
                              : 0;
                            return (
                              sum +
                              Math.min(
                                10,
                                Math.max(
                                  0,
                                  ((year - 1900) /
                                    (new Date().getFullYear() - 1900)) *
                                    10
                                )
                              )
                            );
                          }, 0) / favoriteMovies.length || 0,
                          Math.min(
                            10,
                            (favoriteMovies.reduce(
                              (sum, m) => sum + (m.popularity || 0),
                              0
                            ) / favoriteMovies.length || 0) / 50
                          ),
                          Math.min(
                            10,
                            (favoriteMovies.reduce(
                              (sum, m) => sum + (m.runtime || 0),
                              0
                            ) / favoriteMovies.length || 0) / 15
                          ),
                          Math.min(
                            10,
                            (favoriteMovies.reduce(
                              (sum, m) => sum + (m.vote_count || 0),
                              0
                            ) / favoriteMovies.length || 0) / 1000
                          ),
                        ],
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        borderColor: "rgb(255, 99, 132)",
                        borderWidth: 2,
                        pointBackgroundColor: "rgb(255, 99, 132)",
                        pointBorderColor: "#fff",
                        pointHoverBackgroundColor: "#fff",
                        pointHoverBorderColor: "rgb(255, 99, 132)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: "top" as const,
                        labels: {
                          color: "#ffffff",
                          font: {
                            size: 12,
                          },
                          padding: 15,
                        },
                      },
                      title: {
                        display: true,
                        text: "Perfil de preferencias basado en tus películas favoritas",
                        color: "#ffffff",
                        font: {
                          size: 16,
                          weight: "bold" as const,
                        },
                        padding: {
                          top: 10,
                          bottom: 20,
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) =>
                            ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(
                              1
                            )}/10`,
                        },
                      },
                    },
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 10,
                        min: 0,
                        ticks: {
                          stepSize: 2,
                          color: "#ffffff",
                          backdropColor: "transparent",
                          font: {
                            size: 11,
                          },
                        },
                        grid: {
                          color: "rgba(255, 255, 255, 0.2)",
                        },
                        angleLines: {
                          color: "rgba(255, 255, 255, 0.2)",
                        },
                        pointLabels: {
                          color: "#ffffff",
                          font: {
                            size: 12,
                            weight: 500,
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="text-tertiary opacity-80">
                Necesitas tener al menos 2 películas en favoritos para ver tu
                análisis de gustos.
              </div>
            )}
          </div>
        </GlassElement>
      </main>
    </div>
  );
};

export default Profile;
