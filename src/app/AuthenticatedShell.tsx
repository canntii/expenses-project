'use client';

import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";

interface AuthenticatedShellProps {
  children: ReactNode;
}

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const { user, loading } = useAuth();

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
