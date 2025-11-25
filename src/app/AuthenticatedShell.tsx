'use client';

import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useSessionActivity } from "@/hooks/useSessionActivity";

interface AuthenticatedShellProps {
  children: ReactNode;
}

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const { user, loading } = useAuth();

  // Auto-logout por inactividad (30 minutos)
  useIdleTimeout({
    timeout: 30 * 60 * 1000, // 30 minutos
    warningTime: 2 * 60 * 1000, // Advertencia 2 minutos antes
  });

  // Actualizar lastActive cada 5 minutos
  useSessionActivity(5 * 60 * 1000);

  // Evita flicker durante la validación inicial de Firebase
  if (loading) {
    return null;
  }

  return (
    <>
      {user && <Navbar />}
      {children}
    </>
  );
}
