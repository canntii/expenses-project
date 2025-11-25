'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileContent from "@/components/profile/ProfileContent";
import { UpdateUserData } from "@/lib/types/user";
import { updateUserDocument } from "@/lib/firebase/firestore/users";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function UserPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const { t } = useLanguage();

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
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
          <div className="max-w-5xl mx-auto mt-4">
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-gray-600 dark:text-gray-400">{t.profile.loadingProfile}</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-5xl mx-auto mt-4">
          <div className="mb-8">
            <h1 className="pb-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {t.profile.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.profile.subtitle}
            </p>
          </div>

          <div className="space-y-6">
            <ProfileHeader user={user} onEditClick={handleEditClick} />
            <div id="profile-content">
              <ProfileContent user={user} onSave={handleSave} />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}