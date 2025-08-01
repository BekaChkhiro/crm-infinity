import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  KeyRound, 
  Trash2, 
  AlertTriangle,
  Settings,
  User,
  Lock,
  Download,
  Upload
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';

export function UserSettings() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    pushNotifications: true,
    taskReminders: true,
    weeklyDigest: false,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    activityTracking: true,
    analyticsOptIn: false,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings
          </p>
        </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Settings */}
        <div className="space-y-6">
          {/* Profile Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{profile?.display_name || profile?.full_name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Badge variant="secondary">
                  <User className="w-3 h-3 mr-1" />
                  {profile?.role || 'User'}
                </Badge>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Link to="/profile/edit" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <User className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Choose your preferred theme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="language">Language</Label>
                <Badge variant="outline">English</Badge>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="timezone">Timezone</Label>
                <Badge variant="outline">GMT+4 (Tbilisi)</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Privacy & Security */}
        <div className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-updates">Email Updates</Label>
                <Switch
                  id="email-updates"
                  checked={notifications.emailUpdates}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, emailUpdates: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <Switch
                  id="push-notifications"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="task-reminders">Task Reminders</Label>
                <Switch
                  id="task-reminders"
                  checked={notifications.taskReminders}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, taskReminders: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <Switch
                  id="weekly-digest"
                  checked={notifications.weeklyDigest}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, weeklyDigest: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
              </CardTitle>
              <CardDescription>
                Control your data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-visible">Profile Visibility</Label>
                <Switch
                  id="profile-visible"
                  checked={privacy.profileVisible}
                  onCheckedChange={(checked) => 
                    setPrivacy(prev => ({ ...prev, profileVisible: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activity-tracking">Activity Tracking</Label>
                <Switch
                  id="activity-tracking"
                  checked={privacy.activityTracking}
                  onCheckedChange={(checked) => 
                    setPrivacy(prev => ({ ...prev, activityTracking: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics-opt-in">Analytics Opt-in</Label>
                <Switch
                  id="analytics-opt-in"
                  checked={privacy.analyticsOptIn}
                  onCheckedChange={(checked) => 
                    setPrivacy(prev => ({ ...prev, analyticsOptIn: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export, import, and deletion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={handleSignOut}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
                <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are irreversible and have serious consequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    This action will delete all your data and cannot be undone
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen} 
      />
    </div>
  );
}