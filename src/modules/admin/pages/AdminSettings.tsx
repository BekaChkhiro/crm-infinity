import React, { useState } from 'react';
import { AdminLayout } from '@/modules/admin/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Separator } from '@/shared/components/ui/separator';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { 
  Settings, 
  Database, 
  Mail, 
  Shield, 
  Users, 
  Bell,
  Save,
  AlertTriangle
} from 'lucide-react';

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'Admin Dashboard',
    siteDescription: 'Project management and user administration system',
    allowUserRegistration: true,
    requireEmailVerification: true,
    maxProjectsPerUser: 10,
    enableNotifications: true,
    maintenanceMode: false
  });

  // Email settings state
  const [emailSettings, setEmailSettings] = useState({
    fromEmail: 'admin@example.com',
    fromName: 'Admin Team',
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    enableEmailNotifications: true
  });

  const handleSaveSystemSettings = async () => {
    setLoading(true);
    try {
      // Here you would typically save to your database
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save system settings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    setLoading(true);
    try {
      // Here you would typically save to your database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Email Settings Saved",
        description: "Email configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save email settings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">
              Configure system-wide settings and preferences
            </p>
          </div>
          <Badge variant="outline" className="flex items-center">
            <Settings className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        </div>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              System Configuration
            </CardTitle>
            <CardDescription>
              General system settings and user registration controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={systemSettings.siteName}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    siteName: e.target.value
                  }))}
                  placeholder="Enter site name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxProjects">Max Projects Per User</Label>
                <Input
                  id="maxProjects"
                  type="number"
                  value={systemSettings.maxProjectsPerUser}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    maxProjectsPerUser: parseInt(e.target.value) || 0
                  }))}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={systemSettings.siteDescription}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  siteDescription: e.target.value
                }))}
                placeholder="Enter site description"
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowRegistration">Allow User Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable new users to register for accounts
                    </p>
                  </div>
                  <Switch
                    id="allowRegistration"
                    checked={systemSettings.allowUserRegistration}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      allowUserRegistration: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="requireVerification">Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before accessing the system
                    </p>
                  </div>
                  <Switch
                    id="requireVerification"
                    checked={systemSettings.requireEmailVerification}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      requireEmailVerification: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableNotifications">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send system notifications to users
                    </p>
                  </div>
                  <Switch
                    id="enableNotifications"
                    checked={systemSettings.enableNotifications}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      enableNotifications: checked
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center text-destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Maintenance
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable system access for maintenance
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={systemSettings.maintenanceMode}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({
                    ...prev,
                    maintenanceMode: checked
                  }))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSystemSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save System Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Configure email settings for system notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings(prev => ({
                    ...prev,
                    fromEmail: e.target.value
                  }))}
                  placeholder="admin@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings(prev => ({
                    ...prev,
                    fromName: e.target.value
                  }))}
                  placeholder="Admin Team"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings(prev => ({
                    ...prev,
                    smtpHost: e.target.value
                  }))}
                  placeholder="smtp.example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings(prev => ({
                    ...prev,
                    smtpPort: e.target.value
                  }))}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="smtpUsername">SMTP Username</Label>
                <Input
                  id="smtpUsername"
                  value={emailSettings.smtpUsername}
                  onChange={(e) => setEmailSettings(prev => ({
                    ...prev,
                    smtpUsername: e.target.value
                  }))}
                  placeholder="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">SMTP Password</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => setEmailSettings(prev => ({
                    ...prev,
                    smtpPassword: e.target.value
                  }))}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableEmailNotifications">Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for system events
                </p>
              </div>
              <Switch
                id="enableEmailNotifications"
                checked={emailSettings.enableEmailNotifications}
                onCheckedChange={(checked) => setEmailSettings(prev => ({
                  ...prev,
                  enableEmailNotifications: checked
                }))}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveEmailSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Email Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure security and access control settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Security settings coming soon</p>
              <p className="text-sm">Advanced security configuration will be available in future updates</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}