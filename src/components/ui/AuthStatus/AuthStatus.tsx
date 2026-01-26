'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import styles from './AuthStatus.module.css';

export function AuthStatus() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  if (loading) {
    return <div className={styles.skeleton} />;
  }

  if (!user) {
    return (
      <button onClick={handleLogin} className={styles.loginButton} title="Se connecter">
        <LogIn size={18} />
        <span>Connexion</span>
      </button>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur';

  return (
    <div className={styles.container}>
      <div className={styles.userInfo}>
        <span className={styles.userName}>{displayName}</span>
        <span className={styles.userEmail}>{user.email}</span>
      </div>
      <button onClick={handleLogout} className={styles.logoutButton} title="Se déconnecter">
        <LogOut size={18} />
      </button>
    </div>
  );
}
