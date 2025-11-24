'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Calendar, Mail } from "lucide-react";
import { User } from "@/lib/types/user";
import { Timestamp } from "firebase/firestore";

interface ProfileHeaderProps {
  user: User;
  onEditClick: () => void;
}

export default function ProfileHeader({ user, onEditClick }: ProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {user.photoURL && <AvatarImage src={user.photoURL} alt={user.name} />}
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="outline"
              className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full"
              onClick={onEditClick}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{user.name}</h1>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Mail className="size-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                Miembro desde {formatDate(user.createdAt)}
              </div>
            </div>
          </div>
          <Button variant="default" onClick={onEditClick}>Editar Perfil</Button>
        </div>
      </CardContent>
    </Card>
  );
}
