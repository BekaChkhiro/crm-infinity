import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

export function useRoleRedirect() {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('useRoleRedirect - User:', user);
    console.log('useRoleRedirect - Profile:', profile);
    console.log('useRoleRedirect - Loading:', loading);
    
    if (!loading && user && profile) {
      console.log('Profile role:', profile.role);
      if (profile.role === 'admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/admin');
      } else {
        console.log('Redirecting to user dashboard');
        navigate('/dashboard');
      }
    }
  }, [user, profile, loading, navigate]);
}