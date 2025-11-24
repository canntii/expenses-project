'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface GuestRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function GuestRoute({
  children,
  redirectTo = '/'
}: GuestRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si hay usuario, no mostrar nada (se está redirigiendo)
  if (user) {
    return null;
  }

  // Usuario NO autenticado, mostrar el formulario de login/register
  return <>{children}</>;
}
