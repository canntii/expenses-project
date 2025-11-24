'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileContent from "@/components/profile/ProfileContent";
import { UpdateUserData } from "@/lib/types/user";
import { updateUserDocument } from "@/lib/firebase/firestore/users";
import { useAuth } from "@/contexts/AuthContext";

export default function UserPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const handleSave = async (data: UpdateUserData) => {
    if (user) {
      await updateUserDocument(user.uid, data);
      await refreshUser();
    }
  };

  const handleEditClick = () => {
    // Scroll to the content section
    const content = document.getElementById('profile-content');
    if (content) {
      content.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <ProfileHeader user={user} onEditClick={handleEditClick} />
      <div id="profile-content">
        <ProfileContent user={user} onSave={handleSave} />
      </div>
    </div>
  );
}