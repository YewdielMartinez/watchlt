/**
 * Configuración de optimizaciones de rendimiento para React
 */

// Configuración de límites para carga de datos
export const PERFORMANCE_CONFIG = {
  // Número máximo de items a cargar inicialmente
  INITIAL_LOAD_LIMIT: 20,

  // Número de items a cargar en scroll infinito
  PAGINATION_SIZE: 20,

  // Tiempo de debounce para búsquedas (ms)
  SEARCH_DEBOUNCE: 600,

  // Tiempo de throttle para scroll (ms)
  SCROLL_THROTTLE: 100,

  // Tiempo de throttle para resize (ms)
  RESIZE_THROTTLE: 200,

  // Duración del cache en memoria (ms)
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos

  // Duración del cache en localStorage (ms)
  STORAGE_CACHE_DURATION: 30 * 60 * 1000, // 30 minutos

  // Máximo de items en cache
  MAX_CACHE_SIZE: 150,

  // Número máximo de imágenes a precargar
  IMAGE_PRELOAD_COUNT: 6,

  // Umbral de intersection observer (%)
  INTERSECTION_THRESHOLD: 0.1,

  // Margen de intersection observer (px)
  INTERSECTION_MARGIN: "50px",
};

// Configuración de lazy loading para imágenes
export const IMAGE_CONFIG = {
  // Calidad de imágenes de TMDB
  POSTER_SIZE: "w500",
  BACKDROP_SIZE: "w1280",
  PROFILE_SIZE: "w185",
  LOGO_SIZE: "w300",

  // Placeholder mientras carga
  PLACEHOLDER_COLOR: "#1a1a1a",

  // Tamaños para srcset
  RESPONSIVE_SIZES: {
    mobile: "w342",
    tablet: "w500",
    desktop: "w780",
  },
};

// Configuración de animaciones
export const ANIMATION_CONFIG = {
  // Desactivar animaciones complejas en dispositivos de bajo rendimiento
  REDUCE_MOTION: window.matchMedia("(prefers-reduced-motion: reduce)").matches,

  // Duración de transiciones (ms)
  TRANSITION_DURATION: 300,

  // Duración de animaciones de entrada (ms)
  ENTER_DURATION: 200,

  // Duración de animaciones de salida (ms)
  EXIT_DURATION: 150,
};

// Configuración de prefetch/preload
export const PREFETCH_CONFIG = {
  // Prefetch de rutas al hacer hover
  ENABLE_ROUTE_PREFETCH: true,

  // Tiempo de hover antes de prefetch (ms)
  HOVER_DELAY: 300,

  // Precargar datos de detalle al hacer hover en card
  ENABLE_DETAIL_PREFETCH: true,
};

// Detectar si es un dispositivo de bajo rendimiento
export const isLowEndDevice = (): boolean => {
  // Verificar número de cores
  const cores = navigator.hardwareConcurrency || 1;
  if (cores <= 2) return true;

  // Verificar memoria disponible (si está disponible)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory <= 2) return true;

  // Verificar tipo de conexión
  const connection = (navigator as any).connection;
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === "slow-2g" || effectiveType === "2g") return true;
  }

  return false;
};

// Ajustar configuración según el dispositivo
export const getOptimizedConfig = () => {
  const isLowEnd = isLowEndDevice();

  return {
    ...PERFORMANCE_CONFIG,
    // Reducir límites en dispositivos de bajo rendimiento
    INITIAL_LOAD_LIMIT: isLowEnd ? 10 : 20,
    PAGINATION_SIZE: isLowEnd ? 10 : 20,
    IMAGE_PRELOAD_COUNT: isLowEnd ? 3 : 6,
    // Aumentar debounce/throttle
    SEARCH_DEBOUNCE: isLowEnd ? 800 : 600,
    SCROLL_THROTTLE: isLowEnd ? 150 : 100,
  };
};

// Log de métricas de rendimiento (solo en desarrollo)
export const logPerformance = (metric: string, value: number) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${metric}: ${value.toFixed(2)}ms`);
  }
};

// Medir tiempo de ejecución
export const measureTime = async <T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  logPerformance(label, end - start);
  return result;
};
