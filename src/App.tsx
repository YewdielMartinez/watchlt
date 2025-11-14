import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UIProvider } from "./contexts/UIContext";
import AppBackground from "./components/layout/AppBackground";
import PageTransition from "./components/layout/PageTransition";

// Lazy load de componentes para mejorar el rendimiento inicial
const Login = lazy(() => import("./components/auth/Login"));
const Register = lazy(() => import("./components/auth/Register"));
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Profile = lazy(() => import("./components/profile/Profile"));
const Compare = lazy(() => import("./components/compare/Compare"));
const MovieDetails = lazy(() => import("./components/movies/MovieDetails"));
const MoviesPage = lazy(() => import("./components/movies/MoviesPage"));
const MoviesSectionPage = lazy(
  () => import("./components/movies/MoviesSectionPage")
);
const MoviesGenrePage = lazy(
  () => import("./components/movies/MoviesGenrePage")
);
const TVPage = lazy(() => import("./components/tv/TVPage"));
const TVSectionPage = lazy(() => import("./components/tv/TVSectionPage"));
const TVDetails = lazy(() => import("./components/tv/TVDetails"));
const PersonDetails = lazy(() => import("./components/person/PersonDetails"));
const Settings = lazy(() => import("./components/settings/Settings"));

// Loading component mejorado
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-accent/30 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
);

// Componente para rutas protegidas
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Cargando...
      </div>
    );
  }

  return currentUser || isGuest ? <>{children}</> : <Navigate to="/login" />;
};

// Componente wrapper para aplicar transiciones
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Register />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <Compare />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/movies"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <MoviesPage />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/movies/section/:section"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <MoviesSectionPage />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/movies/genre/:id"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <MoviesGenrePage />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/tv"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <TVPage />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/tv/section/:section"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <TVSectionPage />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/movie/:id"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <MovieDetails />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/tv/:id"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <TVDetails />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/person/:id"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <PersonDetails />
              </Suspense>
            </PrivateRoute>
          }
        />
        {/* Configuración: requiere usuario autenticado */}
        <Route
          path="/settings"
          element={
            <AuthOnlyRoute>
              <Suspense fallback={<LoadingFallback />}>
                <Settings />
              </Suspense>
            </AuthOnlyRoute>
          }
        />
        {/* Ruta solo para usuarios autenticados (no invitados) */}
        <Route
          path="/profile"
          element={
            <AuthOnlyRoute>
              <Suspense fallback={<LoadingFallback />}>
                <Profile />
              </Suspense>
            </AuthOnlyRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </PageTransition>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <UIProvider>
          <AppBackground />
          <AnimatedRoutes />
        </UIProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

// Componente inline para requerir usuario autenticado (excluye invitados)
const AuthOnlyRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, loading } = useAuth();
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Cargando...
      </div>
    );
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};
