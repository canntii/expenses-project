'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Mail, LogOut, Shield, Save, X, Languages, Palette } from "lucide-react";
import { User, UpdateUserData } from "@/lib/types/user";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";

interface ProfileContentProps {
  user: User;
  onSave: (data: UpdateUserData) => Promise<void>;
}

export default function ProfileContent({ user, onSave }: ProfileContentProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { language, setLanguage, availableLanguages, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      setIsEditing(false);
      toast.success(t.profile.updateSuccess);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t.profile.updateError);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
    });
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t.auth.logoutSuccess);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(language === 'es' ? 'Error al cerrar sesión' : 'Error signing out');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content - 2 columns on large screens */}
      <div className="lg:col-span-2 space-y-6">
        {/* Personal Information */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  {t.profile.personalInfo}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t.profile.personalInfoDesc}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto"
                >
                  {t.common.edit}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t.profile.fullName}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50 dark:bg-gray-900" : "bg-white dark:bg-gray-900"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50 dark:bg-gray-900" : "bg-white dark:bg-gray-900"}
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-full sm:flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg w-full sm:flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? t.common.saving : t.profile.saveChanges}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - 1 column on large screens */}
      <div className="space-y-6">
        {/* Language Preferences */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Languages className="w-5 h-5 text-blue-600" />
              {t.profile.language}
            </CardTitle>
            <CardDescription className="mt-1">
              {t.profile.selectLanguage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={language}
              onValueChange={async (value) => {
                await setLanguage(value);
                toast.success(
                  value === 'es'
                    ? 'Idioma actualizado exitosamente'
                    : 'Language updated successfully'
                );
              }}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Theme Preferences */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="w-5 h-5 text-purple-600" />
              {t.profile.theme}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ThemeSwitch />
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-purple-600" />
              {t.profile.account}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">{t.profile.status}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.profile.verified}</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t.nav.logout}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
