'use client';

import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import styles from './UserSwitcher.module.css';

export function UserSwitcher() {
  const { userRole, isLoading } = useCopro();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fetch user info from Supabase auth
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || null);
        // Try to get name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        setUserName(profile?.full_name || user.email?.split('@')[0] || 'Utilisateur');
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  if (!mounted || isLoading) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonText} />
      </div>
    );
  }

  const roleLabel = userRole === 'admin' ? 'Admin'
    : userRole === 'gestionnaire' ? 'Gestionnaire'
    : userRole || 'Utilisateur';

  const roleColor = userRole === 'admin' ? '#EF4444' : '#2563EB';

  return (
    <div className={styles.container}>
      <div className={styles.trigger}>
        <div className={styles.userAvatar} style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
          <User size={14} />
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            {userName || 'Chargement...'}
          </span>
          <span className={styles.userRole} style={{ color: roleColor }}>
            {roleLabel}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className={styles.logoutBtn}
          title="Se déconnecter"
          aria-label="Se déconnecter"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
