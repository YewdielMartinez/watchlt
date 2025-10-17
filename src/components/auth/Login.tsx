import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { getPopularMovies } from '../../services/tmdbApi';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, continueAsGuest, loginWithGoogle } = useAuth();
  const { setBackgroundFromMovie } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    // Mostrar un fondo atractivo en el login basado en populares
    (async () => {
      try {
        const popular = await getPopularMovies();
        if (popular && popular[0]) setBackgroundFromMovie(popular[0]);
      } catch (e) {
        // Ignoramos errores: el fondo estático por defecto seguirá visible
      }
    })();
  }, [setBackgroundFromMovie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo electrónico o contraseña incorrectos');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde');
      } else {
        setError('Error al iniciar sesión: ' + (err.message || ''));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-10 glass-panel">
        <div className="flex flex-col items-center gap-3">
          <img src="/Black Minimalist Tie Film Logo.svg" alt="Watchlt" className="h-14 w-auto" />
          <h2 className="mt-2 text-center text-3xl font-extrabold text-tertiary section-title">
            Iniciar Sesión
          </h2>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="glass-input block w-full px-3 py-2 placeholder:text-tertiary/70 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="glass-input block w-full px-3 py-2 placeholder:text-tertiary/70 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
          
          <div className="mt-4">
            <button
              type="button"
              aria-label="Continuar con Google"
              onClick={async () => {
                try {
                  setError('');
                  setLoading(true);
                  await loginWithGoogle();
                  navigate('/dashboard');
                } catch (err: any) {
                  setError('No se pudo iniciar sesión con Google');
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full mb-3 inline-flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-2.5 rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.531,6.053,28.977,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.531,6.053,28.977,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c4.918,0,9.4-1.879,12.793-4.951l-5.901-4.986C29.861,35.996,27.106,37,24,37 c-5.202,0-9.616-3.317-11.277-7.946l-6.536,5.036C9.495,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-3.997,5.63 c0.001-0.001,0.002-0.001,0.003-0.002l5.901,4.986C36.803,39.221,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Continuar con Google
            </button>
            <button
              type="button"
              onClick={() => {
                continueAsGuest();
                navigate('/dashboard');
              }}
              className="btn-primary w-full"
            >
              Continuar como invitado
            </button>
          </div>
          
          <div className="text-sm text-center mt-4 text-tertiary">
            <p>
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-medium text-tertiary hover:opacity-80">
                Regístrate
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;