import axios from "axios";

const API_KEY = "1b1bfcb60202c69c228a2257a055fe0a"; // API Key de TMDB
const BASE_URL = "https://api.themoviedb.org/3";

// Sistema de caché con localStorage
const CACHE_PREFIX = "tmdb_cache_";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCacheKey(url: string): string {
  return CACHE_PREFIX + btoa(url).substring(0, 50);
}

function getFromCache<T>(url: string): T | null {
  try {
    const key = getCacheKey(url);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Verificar si el caché expiró
    if (now - entry.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (e) {
    return null;
  }
}

function saveToCache<T>(url: string, data: T): void {
  try {
    const key = getCacheKey(url);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // Si localStorage está lleno, limpiar caché viejo
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      clearOldCache();
    }
  }
}

function clearOldCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached);
            if (now - entry.timestamp > CACHE_DURATION) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (e) {
    console.error("Error limpiando caché:", e);
  }
}

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: "es-ES",
  },
});

export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  release_date: string;
  vote_average: number;
  popularity?: number;
  vote_count?: number;
  overview: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  budget?: number;
  revenue?: number;
  status?: string;
  original_language?: string;
  tagline?: string;
  director?: string;
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path?: string;
  }[];
  crew?: { id: number; name: string; job: string; profile_path?: string }[];
}

export interface TVShow {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path?: string;
  first_air_date: string;
  vote_average: number;
  popularity?: number;
  vote_count?: number;
  overview: string;
  genres?: { id: number; name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  created_by?: { id: number; name: string }[];
  status?: string;
  original_language?: string;
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path?: string;
  }[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface PersonSearch {
  id: number;
  name: string;
  profile_path?: string;
  known_for_department?: string;
}

export interface Person {
  id: number;
  name: string;
  biography?: string;
  profile_path?: string;
  birthday?: string;
  deathday?: string | null;
  place_of_birth?: string;
  gender?: number;
  known_for_department?: string;
  also_known_as?: string[];
  homepage?: string | null;
  popularity?: number;
}

export type CombinedCredit = {
  id: number;
  media_type: "movie" | "tv";
  title?: string; // movie
  name?: string; // tv
  character?: string; // cast
  job?: string; // crew
  release_date?: string; // movie
  first_air_date?: string; // tv
  poster_path?: string;
  vote_count?: number;
  popularity?: number;
};

export type CombinedCreditsResponse = {
  cast: CombinedCredit[];
  crew: CombinedCredit[];
};

export const getPopularMovies = async (page: number = 1): Promise<Movie[]> => {
  const cacheKey = `/movie/popular?page=${page}`;
  const cached = getFromCache<Movie[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/movie/popular", { params: { page } });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

export const getTopRatedMovies = async (page: number = 1): Promise<Movie[]> => {
  const cacheKey = `/movie/top_rated?page=${page}`;
  const cached = getFromCache<Movie[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/movie/top_rated", { params: { page } });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

export const getUpcomingMovies = async (page: number = 1): Promise<Movie[]> => {
  const cacheKey = `/movie/upcoming?page=${page}`;
  const cached = getFromCache<Movie[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/movie/upcoming", { params: { page } });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

export const getNowPlayingMovies = async (
  page: number = 1
): Promise<Movie[]> => {
  const cacheKey = `/movie/now_playing?page=${page}`;
  const cached = getFromCache<Movie[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/movie/now_playing", {
    params: { page },
  });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  const response = await tmdbApi.get("/search/movie", {
    params: { query },
  });
  return response.data.results;
};

export type MultiResult = (Movie | TVShow | PersonSearch) & {
  media_type: "movie" | "tv" | "person";
};

export const multiSearch = async (query: string): Promise<MultiResult[]> => {
  const response = await tmdbApi.get("/search/multi", {
    params: { query },
  });
  // Filtrar a tipos soportados: movie, tv y person
  return (response.data.results || [])
    .filter(
      (r: any) =>
        r.media_type === "movie" ||
        r.media_type === "tv" ||
        r.media_type === "person"
    )
    .map((r: any) => r as MultiResult);
};

// PERSON endpoints
export const getPersonDetails = async (personId: number): Promise<Person> => {
  const response = await tmdbApi.get(`/person/${personId}`);
  return response.data as Person;
};

export const getPersonCombinedCredits = async (
  personId: number
): Promise<CombinedCreditsResponse> => {
  const response = await tmdbApi.get(`/person/${personId}/combined_credits`);
  return response.data as CombinedCreditsResponse;
};

export const getMovieDetails = async (movieId: number): Promise<Movie> => {
  const cacheKey = `/movie/${movieId}/details`;
  const cached = getFromCache<Movie>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get(`/movie/${movieId}`);

  // Get credits to extract director and cast
  const creditsResponse = await tmdbApi.get(`/movie/${movieId}/credits`);

  const director = creditsResponse.data.crew.find(
    (person: any) => person.job === "Director"
  );

  const cast = (creditsResponse.data.cast || []).slice(0, 12);
  const crew = (creditsResponse.data.crew || [])
    .filter((p: any) => p.job && p.name)
    .slice(0, 12)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      job: p.job,
      profile_path: p.profile_path,
    }));

  const movieWithCredits = {
    ...response.data,
    director: director ? director.name : "Desconocido",
    cast,
    crew,
  };

  saveToCache(cacheKey, movieWithCredits);
  return movieWithCredits;
};

export type MovieVideo = {
  id: string;
  key: string;
  site: string; // e.g., 'YouTube'
  type: string; // e.g., 'Trailer'
  name: string;
};

export const getMovieVideos = async (
  movieId: number
): Promise<MovieVideo[]> => {
  const response = await tmdbApi.get(`/movie/${movieId}/videos`);
  return response.data.results as MovieVideo[];
};

export const getMovieRecommendations = async (
  movieId: number
): Promise<Movie[]> => {
  const response = await tmdbApi.get(`/movie/${movieId}/recommendations`);
  return response.data.results as Movie[];
};

// MOVIES - Trending
export const getTrendingMovies = async (
  window: "day" | "week" = "week",
  page: number = 1
): Promise<Movie[]> => {
  const cacheKey = `/trending/movie/${window}?page=${page}`;
  const cached = getFromCache<Movie[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get(`/trending/movie/${window}`, {
    params: { page },
  });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

// TV SHOWS endpoints
export const getPopularTV = async (page: number = 1): Promise<TVShow[]> => {
  const cacheKey = `/tv/popular?page=${page}`;
  const cached = getFromCache<TVShow[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/tv/popular", { params: { page } });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

export const getTopRatedTV = async (page: number = 1): Promise<TVShow[]> => {
  const cacheKey = `/tv/top_rated?page=${page}`;
  const cached = getFromCache<TVShow[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/tv/top_rated", { params: { page } });
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

export const getAiringTodayTV = async (page: number = 1): Promise<TVShow[]> => {
  const response = await tmdbApi.get("/tv/airing_today", { params: { page } });
  return response.data.results;
};

export const getOnTheAirTV = async (page: number = 1): Promise<TVShow[]> => {
  const response = await tmdbApi.get("/tv/on_the_air", { params: { page } });
  return response.data.results;
};

export const searchTV = async (query: string): Promise<TVShow[]> => {
  const response = await tmdbApi.get("/search/tv", { params: { query } });
  return response.data.results;
};

export const getTVDetails = async (tvId: number): Promise<TVShow> => {
  const cacheKey = `/tv/${tvId}/details`;
  const cached = getFromCache<TVShow>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get(`/tv/${tvId}`);
  const creditsResponse = await tmdbApi.get(`/tv/${tvId}/credits`);
  const cast = creditsResponse.data.cast?.slice(0, 10) || [];
  const tvDetails = {
    ...response.data,
    cast,
  } as TVShow;

  saveToCache(cacheKey, tvDetails);
  return tvDetails;
};

export const getTVVideos = async (tvId: number): Promise<MovieVideo[]> => {
  const response = await tmdbApi.get(`/tv/${tvId}/videos`);
  return response.data.results as MovieVideo[];
};

export const getTVRecommendations = async (tvId: number): Promise<TVShow[]> => {
  const response = await tmdbApi.get(`/tv/${tvId}/recommendations`);
  return response.data.results as TVShow[];
};

// TV - Trending
export const getTrendingTV = async (
  window: "day" | "week" = "week"
): Promise<TVShow[]> => {
  const cacheKey = `/trending/tv/${window}`;
  const cached = getFromCache<TVShow[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get(`/trending/tv/${window}`);
  const data = response.data.results;
  saveToCache(cacheKey, data);
  return data;
};

// GENRES
export const getMovieGenres = async (): Promise<Genre[]> => {
  const cacheKey = "/genre/movie/list";
  const cached = getFromCache<Genre[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/genre/movie/list");
  const data = response.data.genres as Genre[];
  saveToCache(cacheKey, data);
  return data;
};

export const getTVGenres = async (): Promise<Genre[]> => {
  const cacheKey = "/genre/tv/list";
  const cached = getFromCache<Genre[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/genre/tv/list");
  const data = response.data.genres as Genre[];
  saveToCache(cacheKey, data);
  return data;
};

// DISCOVER by genres
export const discoverMoviesByGenres = async (
  genreIds: number[],
  page: number = 1
): Promise<Movie[]> => {
  if (!genreIds || !genreIds.length) return [];

  const genreIdsStr = genreIds.join(",");
  const cacheKey = `/discover/movie?genres=${genreIdsStr}&page=${page}`;
  const cached = getFromCache<Movie[]>(cacheKey);
  if (cached) return cached;

  const response = await tmdbApi.get("/discover/movie", {
    params: {
      with_genres: genreIdsStr,
      sort_by: "popularity.desc",
      include_adult: false,
      page,
    },
  });
  const data = response.data.results as Movie[];
  saveToCache(cacheKey, data);
  return data;
};

export const getMovieCertification = async (
  movieId: number,
  countries: string[] = ["ES", "US", "MX"]
): Promise<string | null> => {
  try {
    const response = await tmdbApi.get(`/movie/${movieId}/release_dates`);
    const results = response.data?.results || [];
    for (const c of countries) {
      const entry = results.find((r: any) => r.iso_3166_1 === c);
      const cert = entry?.release_dates
        ?.map((rd: any) => rd.certification)
        .find((x: string) => x && x.trim().length > 0);
      if (cert) return cert;
    }
    return null;
  } catch {
    return null;
  }
};

export const getMovieLogoPath = async (
  movieId: number
): Promise<string | null> => {
  try {
    const response = await tmdbApi.get(`/movie/${movieId}/images`, {
      params: { include_image_language: "es,en,null" },
    });
    const logos = response.data?.logos || [];
    const pick =
      logos
        .sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
        .find((l: any) => l.iso_639_1 === "es") ||
      logos.find((l: any) => l.iso_639_1 === "en") ||
      logos[0];
    return pick?.file_path ? pick.file_path : null;
  } catch {
    return null;
  }
};

// WATCH PROVIDERS (Streaming platforms)
export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProviders {
  link?: string;
  flatrate?: WatchProvider[]; // Streaming (subscription)
  rent?: WatchProvider[]; // Alquiler
  buy?: WatchProvider[]; // Compra
}

export const getMovieWatchProviders = async (
  movieId: number,
  region: string = "MX"
): Promise<WatchProviders | null> => {
  try {
    const response = await tmdbApi.get(`/movie/${movieId}/watch/providers`);
    const results = response.data?.results || {};
    return results[region] || null;
  } catch {
    return null;
  }
};

export const getTVWatchProviders = async (
  tvId: number,
  region: string = "MX"
): Promise<WatchProviders | null> => {
  try {
    const response = await tmdbApi.get(`/tv/${tvId}/watch/providers`);
    const results = response.data?.results || {};
    return results[region] || null;
  } catch {
    return null;
  }
};

export default tmdbApi;
