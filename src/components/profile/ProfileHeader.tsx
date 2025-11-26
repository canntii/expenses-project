'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Mail, Edit } from "lucide-react";
import { User } from "@/lib/types/user";
import { Timestamp } from "firebase/firestore";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileHeaderProps {
  user: User;
  onEditClick: () => void;
}

export default function ProfileHeader({ user, onEditClick }: ProfileHeaderProps) {
  const { language, t } = useLanguage();

  const getInitials = (name: string) => {
    if (!name || name.trim() === '') return '??';
    const initials = name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return initials || '??';
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) {
      return language === 'es' ? 'Fecha desconocida' : 'Unknown date';
    }
    try {
      const date = timestamp.toDate();
      const locale = language === 'es' ? 'es-ES' : 'en-US';
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return language === 'es' ? 'Fecha desconocida' : 'Unknown date';
    }
  };

  // Generate gradient colors based on user name (same logic as avatar)
  const getGradientColors = (name: string) => {
    // Default colors if name is empty or invalid
    if (!name || name.trim() === '') {
      return {
        from: 'hsl(220, 70%, 55%)', // Default blue
        to: 'hsl(280, 70%, 55%)',   // Default purple
      };
    }

    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 60) % 360; // 60 degrees apart for harmonious colors

    return {
      from: `hsl(${hue1}, 70%, 55%)`,
      to: `hsl(${hue2}, 70%, 55%)`,
    };
  };

  const gradientColors = getGradientColors(user.name);

  return (
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
      {/* Header gradient banner - dynamic colors based on user */}
      <div
        className="h-32"
        style={{
          background: `linear-gradient(to right, ${gradientColors.from}, ${gradientColors.to})`
        }}
      ></div>

      <CardContent className="p-6 sm:p-8 -mt-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-32 h-32 rounded-full object-cover ring-4 ring-white dark:ring-gray-800 shadow-xl"
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 shadow-xl"
                style={{
                  background: `linear-gradient(to right, ${gradientColors.from}, ${gradientColors.to})`
                }}
              >
                <span className="text-white font-bold text-4xl">
                  {getInitials(user.name)}
                </span>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {user.name}
            </h1>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{user.email}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span>{t.profile.memberSince} {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Edit button */}
          <Button
            onClick={onEditClick}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50 w-full sm:w-auto"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t.profile.editProfile}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
