import { db } from '../firebase/config';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, arrayUnion } from 'firebase/firestore';

export type MediaType = 'movie' | 'tv';

export type MediaSummary = {
  id: number;
  type: MediaType;
  title: string; // title or name
  poster_path?: string;
};

const subcol = (uid: string, name: 'likes' | 'watchlist' | 'ratings') => collection(db, 'users', uid, name);
const itemDoc = (uid: string, name: 'likes' | 'watchlist' | 'ratings', type: MediaType, id: number) =>
  doc(db, 'users', uid, name, `${type}_${id}`);

export const getItemStates = async (
  uid: string,
  type: MediaType,
  id: number
): Promise<{ liked: boolean; inWatchlist: boolean; rating: number | null; likeReason?: string | null; ratingReason?: string | null }> => {
  const [likeSnap, wlSnap, rateSnap] = await Promise.all([
    getDoc(itemDoc(uid, 'likes', type, id)),
    getDoc(itemDoc(uid, 'watchlist', type, id)),
    getDoc(itemDoc(uid, 'ratings', type, id)),
  ]);
  return {
    liked: likeSnap.exists(),
    inWatchlist: wlSnap.exists(),
    rating: rateSnap.exists() ? (rateSnap.data()?.rating as number) ?? null : null,
    likeReason: likeSnap.exists() ? ((likeSnap.data() as any)?.reason ?? null) : null,
    ratingReason: rateSnap.exists() ? ((rateSnap.data() as any)?.reason ?? null) : null,
  };
};

export const toggleLike = async (uid: string, summary: MediaSummary): Promise<boolean> => {
  const ref = itemDoc(uid, 'likes', summary.type, summary.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { ...summary, createdAt: new Date().toISOString() });
  return true;
};

export const toggleWatchLater = async (uid: string, summary: MediaSummary): Promise<boolean> => {
  const ref = itemDoc(uid, 'watchlist', summary.type, summary.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { ...summary, createdAt: new Date().toISOString() });
  return true;
};

export const setUserRating = async (
  uid: string,
  summary: MediaSummary,
  rating: number
): Promise<number> => {
  const ref = itemDoc(uid, 'ratings', summary.type, summary.id);
  await setDoc(ref, { ...summary, rating, updatedAt: new Date().toISOString() });
  return rating;
};

// Optional note explaining why the user liked the item
export const setLikeReason = async (
  uid: string,
  summary: MediaSummary,
  reason: string
): Promise<void> => {
  const ref = itemDoc(uid, 'likes', summary.type, summary.id);
  await setDoc(ref, { ...summary, reason, updatedAt: new Date().toISOString() }, { merge: true });
};

// Optional note attached to a rating explaining the reason
export const setRatingReason = async (
  uid: string,
  summary: MediaSummary,
  reason: string
): Promise<void> => {
  const ref = itemDoc(uid, 'ratings', summary.type, summary.id);
  await setDoc(ref, { ...summary, reason, updatedAt: new Date().toISOString() }, { merge: true });
};

export const fetchUserCollection = async (
  uid: string,
  name: 'likes' | 'watchlist' | 'ratings'
): Promise<any[]> => {
  const colRef = subcol(uid, name);
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Favorite genres stored in root user doc: users/{uid}
export const getFavoriteGenres = async (uid: string): Promise<number[]> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as any) : null;
  return Array.isArray(data?.favoriteGenres) ? (data.favoriteGenres as number[]) : [];
};

export const setFavoriteGenres = async (uid: string, genreIds: number[]): Promise<void> => {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { favoriteGenres: genreIds, updatedAt: new Date().toISOString() }, { merge: true });
};

// Comparisons history: append a new comparison entry to users/{uid}.history array
export type ComparisonEntry = {
  type: MediaType; // 'movie' or 'tv'
  movies?: string[]; // for movies, store titles
  shows?: string[]; // for tv, store names
  ids?: number[]; // optional ids for reference
  timestamp: string; // ISO timestamp
};

export const addComparisonHistory = async (uid: string, entry: ComparisonEntry): Promise<void> => {
  const ref = doc(db, 'users', uid);
  // Merge ensures document exists; arrayUnion appends without duplicates (by deep equality)
  await setDoc(
    ref,
    { history: arrayUnion(entry), updatedAt: new Date().toISOString() },
    { merge: true }
  );
};