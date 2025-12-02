import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useUI } from "../../contexts/UIContext";
import { getPopularMovies } from "../../services/tmdbApi";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Correo electrónico o contraseña incorrectos");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Intenta más tarde");
      } else {
        setError("Error al iniciar sesión: " + (err.message || ""));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <GlassElement
        width={450}
        height={650}
        radius={20}
        depth={10}
        strength={100}
        chromaticAberration={5}
        blur={4}
        debug={false}
      >
        <div className="p-10 space-y-8">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/Black Minimalist Tie Film Logo.svg"
              alt="Watchlt"
              className="h-14 w-auto"
            />
            <h2 className="mt-2 text-center text-3xl font-extrabold text-tertiary section-title">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-center text-tertiary/80 max-w-sm px-4">
              Compara películas y series con datos reales. Descubre, analiza y
              encuentra tu próximo contenido favorito.
            </p>
          </div>
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Correo electrónico
                </label>
                <GlassElement
                  width={390}
                  height={40}
                  radius={8}
                  depth={5}
                  strength={60}
                  chromaticAberration={2}
                  blur={2}
                >
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full h-full bg-transparent px-3 py-2 text-tertiary placeholder:text-tertiary/70 focus:outline-none sm:text-sm"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </GlassElement>
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Contraseña
                </label>
                <GlassElement
                  width={390}
                  height={40}
                  radius={8}
                  depth={5}
                  strength={60}
                  chromaticAberration={2}
                  blur={2}
                >
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full h-full bg-transparent px-3 py-2 text-tertiary placeholder:text-tertiary/70 focus:outline-none sm:text-sm"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </GlassElement>
              </div>
            </div>
            <div>
              <GlassElement
                width={390}
                height={44}
                radius={8}
                depth={8}
                strength={80}
                chromaticAberration={3}
                blur={3}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-full bg-transparent text-tertiary font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>
              </GlassElement>
            </div>
            <div className="mt-4 space-y-3">
              <GlassElement
                width={390}
                height={44}
                radius={8}
                depth={8}
                strength={80}
                chromaticAberration={3}
                blur={3}
              >
                <button
                  type="button"
                  aria-label="Continuar con Google"
                  onClick={async () => {
                    try {
                      setError("");
                      setLoading(true);
                      await loginWithGoogle();
                      navigate("/dashboard");
                    } catch (err: any) {
                      setError("No se pudo iniciar sesión con Google");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full h-full bg-transparent inline-flex items-center justify-center gap-3 text-tertiary font-semibold hover:opacity-90 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    width="20"
                    height="20"
                    aria-hidden="true"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.531,6.053,28.977,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.531,6.053,28.977,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,44c4.918,0,9.4-1.879,12.793-4.951l-5.901-4.986C29.861,35.996,27.106,37,24,37 c-5.202,0-9.616-3.317-11.277-7.946l-6.536,5.036C9.495,39.556,16.227,44,24,44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-3.997,5.63 c0.001-0.001,0.002-0.001,0.003-0.002l5.901,4.986C36.803,39.221,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                  </svg>
                  Continuar con Google
                </button>
              </GlassElement>
              <GlassElement
                width={390}
                height={44}
                radius={8}
                depth={8}
                strength={80}
                chromaticAberration={3}
                blur={3}
              >
                <button
                  type="button"
                  onClick={() => {
                    continueAsGuest();
                    navigate("/dashboard");
                  }}
                  className="w-full h-full bg-transparent text-tertiary font-semibold hover:opacity-90 transition"
                >
                  Continuar como invitado
                </button>
              </GlassElement>
            </div>
            <div className="text-sm text-center mt-4 text-tertiary">
              <p>
                ¿No tienes una cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-tertiary hover:opacity-80"
                >
                  Regístrate
                </Link>
              </p>
            </div>
          </form>
        </div>
      </GlassElement>
    </div>
  );
};

export default Login;
