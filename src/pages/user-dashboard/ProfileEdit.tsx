import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ImageUpload } from '@/components/ImageUpload';
import { Save, X, User, Mail, Phone, FileText } from 'lucide-react';

interface FormData {
  display_name: string;
  full_name: string;
  bio: string;
  phone_number: string;
}

export default function ProfileEdit() {
  const { profile, loading: profileLoading, updateProfile, uploadAvatar, deleteAvatar } = useProfile();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    full_name: '',
    bio: '',
    phone_number: '',
  });
  
  const [originalData, setOriginalData] = useState<FormData>({
    display_name: '',
    full_name: '',
    bio: '',
    phone_number: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      const data = {
        display_name: profile.display_name || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        phone_number: profile.phone_number || '',
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [profile]);

  useEffect(() => {
    const dataChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(dataChanged);
  }, [formData, originalData]);

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};

    if (formData.display_name.trim().length < 2) {
      newErrors.display_name = 'Display name must be at least 2 characters';
    }

    if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }

    if (formData.phone_number && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number';
    }

    if (formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    const { error } = await updateProfile({
      display_name: formData.display_name.trim(),
      full_name: formData.full_name.trim(),
      bio: formData.bio.trim() || null,
      phone_number: formData.phone_number.trim() || null,
    });

    if (!error) {
      setOriginalData(formData);
      setHasChanges(false);
    }
    
    setLoading(false);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setErrors({});
    setHasChanges(false);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    const result = await uploadAvatar(file);
    setUploadingImage(false);
    return result;
  };

  const handleImageDelete = async () => {
    setUploadingImage(true);
    const result = await deleteAvatar();
    setUploadingImage(false);
    return result;
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your personal information
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Image */}
        <div className="lg:col-span-1">
          <ImageUpload
            currentImageUrl={profile?.avatar_url}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
            loading={uploadingImage}
            userName={formData.display_name || formData.full_name || 'User'}
          />
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Your name and display preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="How others see your name"
                    className={errors.display_name ? 'border-destructive' : ''}
                  />
                  {errors.display_name && (
                    <p className="text-sm text-destructive">{errors.display_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Your full legal name"
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How people can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  To change your email, visit{' '}
                  <Link to="/change-password" className="text-primary hover:underline">
                    security settings
                  </Link>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="+995 555 123 456"
                  className={errors.phone_number ? 'border-destructive' : ''}
                />
                {errors.phone_number && (
                  <p className="text-sm text-destructive">{errors.phone_number}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                About Me
              </CardTitle>
              <CardDescription>
                Tell others about yourself
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Write a short bio about yourself..."
                  rows={4}
                  className={errors.bio ? 'border-destructive' : ''}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.bio || ''}</span>
                  <span>{formData.bio.length}/500</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}