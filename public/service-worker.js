const CACHE_NAME = "watchlt-cache-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/static/css/main.css",
    "/static/js/main.js",
    "/manifest.json",
];

// Caché de imágenes de TMDB
const TMDB_IMAGE_CACHE = "tmdb-images-v1";
const MAX_IMAGE_CACHE_SIZE = 100;

// Instalación del service worker
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
        .open(CACHE_NAME)
        .then((cache) => {
            console.log("Service Worker: Caché abierto");
            return cache.addAll(urlsToCache);
        })
        .catch((err) => console.error("Error cacheando archivos:", err))
    );
    self.skipWaiting();
});

// Activación y limpieza de cachés antiguos
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== TMDB_IMAGE_CACHE) {
                        console.log("Service Worker: Eliminando caché viejo:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Estrategia de caché: Network First para API, Cache First para imágenes
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Caché agresivo para imágenes de TMDB
    if (url.hostname === "image.tmdb.org") {
        event.respondWith(
            caches.open(TMDB_IMAGE_CACHE).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(request)
                        .then((response) => {
                            // Solo cachear respuestas exitosas
                            if (response.status === 200) {
                                // Clonar la respuesta antes de cachearla
                                const responseToCache = response.clone();

                                // Limitar el tamaño del caché de imágenes
                                cache.keys().then((keys) => {
                                    if (keys.length >= MAX_IMAGE_CACHE_SIZE) {
                                        // Eliminar la imagen más antigua
                                        cache.delete(keys[0]);
                                    }
                                    cache.put(request, responseToCache);
                                });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Si falla la red, intentar devolver una imagen placeholder
                            return new Response(
                                '<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1f2937"/><text x="50%" y="50%" fill="#9ca3af" text-anchor="middle" font-size="16">No disponible</text></svg>', { headers: { "Content-Type": "image/svg+xml" } }
                            );
                        });
                });
            })
        );
        return;
    }

    // API de TMDB: Network First (datos frescos siempre que sea posible)
    if (url.hostname === "api.themoviedb.org") {
        event.respondWith(
            fetch(request)
            .then((response) => {
                // Cachear respuesta exitosa
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, intentar devolver del caché
                return caches.match(request);
            })
        );
        return;
    }

    // Recursos estáticos: Cache First
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                // No cachear si no es una respuesta válida
                if (!response || response.status !== 200 || response.type === "error") {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });

                return response;
            });
        })
    );
});