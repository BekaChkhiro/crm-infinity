import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { ArrowLeft, Eye, EyeOff, Lock, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const { user } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'მიმდინარე პაროლი აუცილებელია';
    }

    if (!newPassword) {
      newErrors.newPassword = 'ახალი პაროლი აუცილებელია';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'პაროლი უნდა შეიცავდეს მთავრულ, პატარა ბღერას და რიცხვს';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'გთხოვთ დაადასტუროთ ახალი პაროლი';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'პაროლები არ ერთმანეთ';
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword = 'ახალი პაროლი უნდა განსხვავდებოდეს მიმდინარესაგან';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (verifyError) {
        setErrors({ currentPassword: 'მიმდინარე პაროლი არასწორია' });
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess(true);
      toast({
        title: "პაროლი შეცვალდა",
        description: "თქვენი პაროლი წარმატებით განაინრინდა.",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        variant: "destructive",
        title: "პაროლის შეცვლა ვერ მოხერხდა",
        description: error.message || "პაროლის შეცვლა ვერ მოხერხდა.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const passwordRequirements = [
    { text: 'მინიმუმ 8 სიმბოლო', met: newPassword.length >= 8 },
    { text: 'შეიცავს მთავრულ ბღერას', met: /[A-Z]/.test(newPassword) },
    { text: 'შეიცავს პატარა ბღერას', met: /[a-z]/.test(newPassword) },
    { text: 'შეიცავს რიცხვს', met: /[0-9]/.test(newPassword) },
    { text: 'შეიცავს სპეციალურ სიმბოლოს', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  დაბრუნება
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">პაროლი შეცვალდა</CardTitle>
                <CardDescription>
                  თქვენი პაროლი წარმატებით განაიხლა! ახლა უფრო უსაფრთხო ხართ!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-left space-y-2">
                  <h4 className="font-medium text-sm">უსაფრთხოების რჩევები:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• არ გაუზიაროთ თქვენი პაროლი არავის</li>
                    <li>• იყენეთ უნიკალური პაროლი თითოეული ანგარიშისთვის</li>
                    <li>• გაიაროთ პაროლების მენეჯერი</li>
                    <li>• რეგულარულად შეცვალეთ პაროლები</li>
                  </ul>
                </div>
                <Link to="/dashboard">
                  <Button className="w-full">
                    დაბრუნება
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                უკან
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">პაროლის შეცვლა</h1>
              <p className="text-sm text-muted-foreground">
                განაახლეთ თქვენი პაროლი ანგარიშის უსაფრთხოებისთვის
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Security Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">პაროლის უსაფრთხოება</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    აირჩიეთ ძლიერი პაროლი, რომელიც არ გამოგეიყენეთ სხვა ადგილას. კარგი პაროლი უნდა იყოს უნიკალური და ძნელად გამოსაცნობი.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader>
              <CardTitle>პაროლის განახლება</CardTitle>
              <CardDescription>
                შეიყვანეთ მიმდინარე პაროლი და აირჩიეთ ახალი უსაფრთხო პაროლი
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">მიმდინარე პაროლი</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (errors.currentPassword) {
                          setErrors(prev => ({ ...prev, currentPassword: undefined }));
                        }
                      }}
                      className={`pl-10 pr-10 ${errors.currentPassword ? 'border-destructive' : ''}`}
                      placeholder="შეიყვანეთ მიმდინარე პაროლი"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-sm text-destructive">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">ახალი პაროლი</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) {
                          setErrors(prev => ({ ...prev, newPassword: undefined }));
                        }
                      }}
                      className={`pl-10 pr-10 ${errors.newPassword ? 'border-destructive' : ''}`}
                      placeholder="შეიყვანეთ ახალი პაროლი"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">{errors.newPassword}</p>
                  )}
                  <PasswordStrengthIndicator password={newPassword} />
                </div>

                {/* Password Requirements */}
                {newPassword && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">პაროლის მოთხოვნები:</h4>
                    <div className="space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${req.met ? 'bg-green-500' : 'bg-muted'}`} />
                          <span className={req.met ? 'text-green-700' : 'text-muted-foreground'}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ახალი პაროლის დადასტურება</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                      placeholder="დაადასტურეთ ახალი პაროლი"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || getPasswordStrength(newPassword) < 3}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      პაროლი იცვლება...
                    </>
                  ) : (
                    'პაროლის განახლება'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}