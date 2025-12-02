/**
 * Sistema de cache en memoria para optimizar llamadas a API
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    // Si el cache está lleno, eliminar las entradas más antiguas
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
      }
    });
  }
}

// Instancia global del cache
export const apiCache = new Cache(150);

// Limpiar cache cada 10 minutos
setInterval(() => {
  apiCache.cleanup();
}, 10 * 60 * 1000);

// Helper para crear keys de cache
export const createCacheKey = (...parts: (string | number)[]): string => {
  return parts.join(":");
};

// Hook personalizado para usar el cache
export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  expiresIn: number = 5 * 60 * 1000
): (() => Promise<T>) => {
  return async (): Promise<T> => {
    // Intentar obtener del cache
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Si no está en cache, hacer la petición
    const data = await fetcher();
    apiCache.set(key, data, expiresIn);
    return data;
  };
};
