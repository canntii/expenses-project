'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInWithEmail } from '@/lib/firebase/auth';
import { createUserDocument } from '@/lib/firebase/firestore/users';
import { loginRateLimiter } from '@/lib/utils/rateLimiter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GuestRoute from '@/components/auth/GuestRoute';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Cuando el usuario se autentica correctamente, GuestRoute redirige automáticamente
  useEffect(() => {
    if (user && loading) {
      // El usuario se autenticó exitosamente, GuestRoute se encargará de redirigir
      setLoading(false);
    }
  }, [user, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verificar rate limit ANTES de intentar login
    const rateCheck = loginRateLimiter.checkLimit(formData.email);

    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.retryAfter! / 60);
      setError(`Demasiados intentos fallidos. Por favor, intenta de nuevo en ${minutes} minuto${minutes > 1 ? 's' : ''}.`);
      return;
    }

    setLoading(true);

    try {
      const user = await signInWithEmail(formData.email, formData.password);

      // Login exitoso - limpiar contador
      loginRateLimiter.recordSuccess(formData.email);

      await createUserDocument(user);
      // No redirigir manualmente - dejar que GuestRoute lo haga
      // cuando el AuthContext detecte al usuario autenticado
    } catch (err: any) {
      // Mostrar intentos restantes
      const attemptInfo = loginRateLimiter.getAttemptInfo(formData.email);
      const remainingAttempts = attemptInfo ? attemptInfo.remainingAttempts : 5;

      if (err.code === 'auth/invalid-credential') {
        setError(`Correo o contraseña incorrectos. ${remainingAttempts > 0 ? `Te quedan ${remainingAttempts} intento${remainingAttempts > 1 ? 's' : ''}.` : ''}`);
      } else if (err.code === 'auth/user-not-found') {
        setError(`No existe una cuenta con este correo. ${remainingAttempts > 0 ? `Te quedan ${remainingAttempts} intento${remainingAttempts > 1 ? 's' : ''}.` : ''}`);
      } else if (err.code === 'auth/wrong-password') {
        setError(`Contraseña incorrecta. ${remainingAttempts > 0 ? `Te quedan ${remainingAttempts} intento${remainingAttempts > 1 ? 's' : ''}.` : ''}`);
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Firebase ha bloqueado temporalmente esta cuenta. Intenta más tarde o restablece tu contraseña.');
      } else {
        setError('Error al iniciar sesión. Por favor, intenta de nuevo.');
      }
      console.error(err);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      await createUserDocument(user);
      // No redirigir manualmente - dejar que GuestRoute lo haga
      // cuando el AuthContext detecte al usuario autenticado
    } catch (err) {
      setError('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <GuestRoute>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Expenses Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona tus finanzas de manera inteligente
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Iniciar Sesión Test Deploy v2
            </CardTitle>
            <CardDescription className="text-center">
              Accede a tu cuenta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="bg-white dark:bg-gray-900"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href="#"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-white dark:bg-gray-900"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  O continúa con
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
            >
              <svg
                className="mr-2 h-5 w-5"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              {loading ? 'Conectando...' : 'Continuar con Google'}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-600 dark:text-gray-400">
              ¿No tienes una cuenta?{' '}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                Regístrate aquí
              </a>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-500">
          <p>Al continuar, aceptas nuestros</p>
          <div className="space-x-2">
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Términos de Servicio
            </a>
            <span>y</span>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Política de Privacidad
            </a>
          </div>
        </div>
      </div>
    </div>
    </GuestRoute>
  );
}
