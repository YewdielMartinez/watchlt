import { Movie, TVShow } from './tmdbApi';

type MediaType = 'movie' | 'tv';
type MovieMinimal = Pick<Movie, 'id' | 'title' | 'poster_path' | 'vote_average' | 'release_date'>;
type TVMinimal = Pick<TVShow, 'id' | 'name' | 'poster_path' | 'vote_average' | 'first_air_date'>;

const KEY_MOVIES = 'compare_movies';
const KEY_TV = 'compare_tv';
const DEFAULT_LIMIT = 15;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const getStoredLimit = (key: string): number => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_LIMIT;
    const n = parseInt(raw);
    return Number.isFinite(n) ? clamp(n, 2, 30) : DEFAULT_LIMIT;
  } catch {
    return DEFAULT_LIMIT;
  }
};

export const getCompareLimit = (type: MediaType): number =>
  type === 'movie' ? getStoredLimit('compare_limit_movies') : getStoredLimit('compare_limit_tv');

const read = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const write = (key: string, list: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // noop
  }
};

export const getCompareList = (type: MediaType): (MovieMinimal | TVMinimal)[] =>
  type === 'movie' ? read<MovieMinimal>(KEY_MOVIES) : read<TVMinimal>(KEY_TV);

export const setCompareList = (type: MediaType, list: any[]) =>
  type === 'movie' ? write(KEY_MOVIES, list.slice(0, getCompareLimit('movie'))) : write(KEY_TV, list.slice(0, getCompareLimit('tv')));

export const addToCompare = (type: MediaType, item: MovieMinimal | TVMinimal): { ok: boolean; reason?: string } => {
  const key = type === 'movie' ? KEY_MOVIES : KEY_TV;
  const list = read<any>(key);
  if (list.find((i: any) => i.id === item.id)) {
    write(key, list);
    return { ok: true };
  }
  const limit = getCompareLimit(type);
  if (list.length >= limit) {
    return { ok: false, reason: `Solo se permiten ${limit} elementos` };
  }
  list.push(item);
  write(key, list);
  return { ok: true };
};

export const removeFromCompare = (type: MediaType, id: number) => {
  const key = type === 'movie' ? KEY_MOVIES : KEY_TV;
  const list = read<any>(key).filter((i: any) => i.id !== id);
  write(key, list);
};

export const clearCompare = () => {
  write(KEY_MOVIES, []);
  write(KEY_TV, []);
};