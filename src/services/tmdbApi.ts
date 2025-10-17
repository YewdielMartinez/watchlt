import axios from 'axios';

const API_KEY = '1b1bfcb60202c69c228a2257a055fe0a'; // API Key de TMDB
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'es-ES'
  }
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
  genres?: {id: number, name: string}[];
  budget?: number;
  revenue?: number;
  status?: string;
  original_language?: string;
  tagline?: string;
  director?: string;
  cast?: {id: number, name: string, character: string, profile_path?: string}[];
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
  cast?: { id: number; name: string; character: string; profile_path?: string }[];
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
  media_type: 'movie' | 'tv';
  title?: string; // movie
  name?: string;  // tv
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
  const response = await tmdbApi.get('/movie/popular', { params: { page } });
  return response.data.results;
};

export const getTopRatedMovies = async (page: number = 1): Promise<Movie[]> => {
  const response = await tmdbApi.get('/movie/top_rated', { params: { page } });
  return response.data.results;
};

export const getUpcomingMovies = async (page: number = 1): Promise<Movie[]> => {
  const response = await tmdbApi.get('/movie/upcoming', { params: { page } });
  return response.data.results;
};

export const getNowPlayingMovies = async (page: number = 1): Promise<Movie[]> => {
  const response = await tmdbApi.get('/movie/now_playing', { params: { page } });
  return response.data.results;
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  const response = await tmdbApi.get('/search/movie', {
    params: { query }
  });
  return response.data.results;
};

export type MultiResult = (Movie | TVShow | PersonSearch) & { media_type: 'movie' | 'tv' | 'person' };

export const multiSearch = async (query: string): Promise<MultiResult[]> => {
  const response = await tmdbApi.get('/search/multi', {
    params: { query }
  });
  // Filtrar a tipos soportados: movie, tv y person
  return (response.data.results || [])
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'person')
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
  const response = await tmdbApi.get(`/movie/${movieId}`);
  
  // Get credits to extract director and cast
  const creditsResponse = await tmdbApi.get(`/movie/${movieId}/credits`);
  
  const director = creditsResponse.data.crew.find(
    (person: any) => person.job === 'Director'
  );
  
  const cast = (creditsResponse.data.cast || []).slice(0, 12);
  const crew = (creditsResponse.data.crew || [])
    .filter((p: any) => p.job && p.name)
    .slice(0, 12)
    .map((p: any) => ({ id: p.id, name: p.name, job: p.job, profile_path: p.profile_path }));
  
  return {
    ...response.data,
    director: director ? director.name : 'Desconocido',
    cast,
    crew
  };
};

export type MovieVideo = {
  id: string;
  key: string;
  site: string; // e.g., 'YouTube'
  type: string; // e.g., 'Trailer'
  name: string;
};

export const getMovieVideos = async (movieId: number): Promise<MovieVideo[]> => {
  const response = await tmdbApi.get(`/movie/${movieId}/videos`);
  return response.data.results as MovieVideo[];
};

export const getMovieRecommendations = async (movieId: number): Promise<Movie[]> => {
  const response = await tmdbApi.get(`/movie/${movieId}/recommendations`);
  return response.data.results as Movie[];
};

// MOVIES - Trending
export const getTrendingMovies = async (window: 'day' | 'week' = 'week', page: number = 1): Promise<Movie[]> => {
  const response = await tmdbApi.get(`/trending/movie/${window}`, { params: { page } });
  return response.data.results;
};

// TV SHOWS endpoints
export const getPopularTV = async (page: number = 1): Promise<TVShow[]> => {
  const response = await tmdbApi.get('/tv/popular', { params: { page } });
  return response.data.results;
};

export const getTopRatedTV = async (page: number = 1): Promise<TVShow[]> => {
  const response = await tmdbApi.get('/tv/top_rated', { params: { page } });
  return response.data.results;
};

export const getAiringTodayTV = async (page: number = 1): Promise<TVShow[]> => {
  const response = await tmdbApi.get('/tv/airing_today', { params: { page } });
  return response.data.results;
};

export const getOnTheAirTV = async (page: number = 1): Promise<TVShow[]> => {
  const response = await tmdbApi.get('/tv/on_the_air', { params: { page } });
  return response.data.results;
};

export const searchTV = async (query: string): Promise<TVShow[]> => {
  const response = await tmdbApi.get('/search/tv', { params: { query } });
  return response.data.results;
};

export const getTVDetails = async (tvId: number): Promise<TVShow> => {
  const response = await tmdbApi.get(`/tv/${tvId}`);
  const creditsResponse = await tmdbApi.get(`/tv/${tvId}/credits`);
  const cast = creditsResponse.data.cast?.slice(0, 10) || [];
  return {
    ...response.data,
    cast,
  } as TVShow;
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
export const getTrendingTV = async (window: 'day' | 'week' = 'week'): Promise<TVShow[]> => {
  const response = await tmdbApi.get(`/trending/tv/${window}`);
  return response.data.results;
};

// GENRES
export const getMovieGenres = async (): Promise<Genre[]> => {
  const response = await tmdbApi.get('/genre/movie/list');
  return response.data.genres as Genre[];
};

export const getTVGenres = async (): Promise<Genre[]> => {
  const response = await tmdbApi.get('/genre/tv/list');
  return response.data.genres as Genre[];
};

// DISCOVER by genres
export const discoverMoviesByGenres = async (genreIds: number[], page: number = 1): Promise<Movie[]> => {
  if (!genreIds || !genreIds.length) return [];
  const response = await tmdbApi.get('/discover/movie', {
    params: {
      with_genres: genreIds.join(','),
      sort_by: 'popularity.desc',
      include_adult: false,
      page,
    }
  });
  return response.data.results as Movie[];
};

export const getMovieCertification = async (movieId: number, countries: string[] = ['ES','US','MX']): Promise<string | null> => {
  try {
    const response = await tmdbApi.get(`/movie/${movieId}/release_dates`);
    const results = response.data?.results || [];
    for (const c of countries) {
      const entry = results.find((r: any) => r.iso_3166_1 === c);
      const cert = entry?.release_dates?.map((rd: any) => rd.certification).find((x: string) => x && x.trim().length > 0);
      if (cert) return cert;
    }
    return null;
  } catch {
    return null;
  }
};

export const getMovieLogoPath = async (movieId: number): Promise<string | null> => {
  try {
    const response = await tmdbApi.get(`/movie/${movieId}/images`, { params: { include_image_language: 'es,en,null' } });
    const logos = response.data?.logos || [];
    const pick = logos
      .sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      .find((l: any) => l.iso_639_1 === 'es') || logos.find((l: any) => l.iso_639_1 === 'en') || logos[0];
    return pick?.file_path ? pick.file_path : null;
  } catch {
    return null;
  }
};

export default tmdbApi;