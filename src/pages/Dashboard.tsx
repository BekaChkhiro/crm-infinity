import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  LogOut, 
  Settings,
  Bell,
  Activity,
  Edit3,
  Key
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  const userName = profile?.display_name || profile?.full_name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile?.avatar_url || undefined} alt="პროფილის სურათი" />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">ბარო ბარო, {profile?.display_name || 'მომხმარებელ'}!</h1>
                <p className="text-sm text-muted-foreground">მართეთ თქვენი ანგარიში და პარამეტრები</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link to="/profile/edit">
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  პროფილის რედაქტირება
                </Button>
              </Link>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                გასვლა
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* User Profile Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                პროფილის ინფორმაცია
              </CardTitle>
              <CardDescription>
                თქვენი ანგარიშის დეტალები და პარამეტრები
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="პროფილის სურათი" />
                    <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.display_name || 'საჩვენებელი სახელი არ არის'}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.full_name || 'სრული სახელი არ არის'}
                    </p>
                    {profile?.bio && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary">აქტიური</Badge>
                  <div className="flex gap-1">
                    <Link to="/profile/edit">
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-3 w-3 mr-1" />
                        რედაქტირება
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">ელ-ფოსტა</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {profile?.phone_number && (
                  <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">ტელეფონი</p>
                      <p className="text-sm text-muted-foreground">{profile.phone_number}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">წევრია დღიდან</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'უცნობი'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions and Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">სწრაფი მოქმედებები</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/profile/edit">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Edit3 className="mr-2 h-4 w-4" />
                    პროფილის რედაქტირება
                  </Button>
                </Link>
                <Link to="/change-password">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Key className="mr-2 h-4 w-4" />
                    პაროლის შეცვლა
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ანგარიშის სტატუსი</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">ონლაინში</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">უსაფრთხოება</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>ელ-ფოსტა დაადასტურებულია</span>
                    <Badge variant={user?.email_confirmed_at ? "secondary" : "outline"}>
                      {user?.email_confirmed_at ? "დაადასტურებული" : "მოსალოდნელი"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>პროფილი სრულია</span>
                    <Badge variant="secondary">
                      {profile?.display_name && profile?.full_name ? "სრული" : "არასრული"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  აქტივობა
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ბოლო განახლება: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'არასოდეს'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>ბოლო აქტივობა</CardTitle>
            <CardDescription>
              თქვენი ანგარიშის ბოლო აქტივობა და განახლებები
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">წარმატებით შესვლა</p>
                  <p className="text-xs text-muted-foreground">ახლა</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">პროფილი განახლდა</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'არასოდეს'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">ანგარიში შეიქმნა</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'ახლახანს'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}