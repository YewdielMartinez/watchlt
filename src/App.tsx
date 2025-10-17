import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import AppBackground from './components/layout/AppBackground';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import Profile from './components/profile/Profile';
import Compare from './components/compare/Compare';
import MovieDetails from './components/movies/MovieDetails';
import MoviesPage from './components/movies/MoviesPage';
import TVPage from './components/tv/TVPage';
import TVDetails from './components/tv/TVDetails';
import PersonDetails from './components/person/PersonDetails';
import Settings from './components/settings/Settings';

// Componente para rutas protegidas
const PrivateRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { currentUser, loading, isGuest } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }
  
  return currentUser || isGuest ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <UIProvider>
          <AppBackground />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/compare" 
            element={
              <PrivateRoute>
                <Compare />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/movies" 
            element={
              <PrivateRoute>
                <MoviesPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/tv" 
            element={
              <PrivateRoute>
                <TVPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/movie/:id" 
            element={
              <PrivateRoute>
                <MovieDetails />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/tv/:id" 
            element={
              <PrivateRoute>
                <TVDetails />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/person/:id" 
            element={
              <PrivateRoute>
                <PersonDetails />
              </PrivateRoute>
            } 
          />
          {/* Configuración: requiere usuario autenticado */}
          <Route 
            path="/settings" 
            element={
              <AuthOnlyRoute>
                <Settings />
              </AuthOnlyRoute>
            } 
          />
          {/* Ruta solo para usuarios autenticados (no invitados) */}
          <Route 
            path="/profile" 
            element={
              <AuthOnlyRoute>
                <Profile />
              </AuthOnlyRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </UIProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

// Componente inline para requerir usuario autenticado (excluye invitados)
const AuthOnlyRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};
