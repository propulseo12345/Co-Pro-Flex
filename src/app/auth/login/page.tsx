'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

// Compte de démo UNIQUE réellement provisionné sur le projet live.
const DEMO_EMAIL = 'lyes.triki@coproflex.fr';
const DEMO_PASSWORD = 'password123';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (signInEmail: string, signInPassword: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.user) {
        router.push('/portefeuille');
        router.refresh();
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(email, password);
  };

  // Connexion démo en 1 clic (renseigne les champs + connecte directement).
  const handleDemoLogin = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    signIn(DEMO_EMAIL, DEMO_PASSWORD);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Image src="/CoProFlex_transparent.png" alt="CoProFlex" width={300} height={200} priority className={styles.logoImg} />
          <p className={styles.subtitle}>Connexion à votre espace</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="votre@email.fr"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>Démo</span>
          <span className={styles.dividerLine} />
        </div>

        <div className={styles.demo}>
          <button
            type="button"
            onClick={handleDemoLogin}
            className={styles.demoButton}
            disabled={loading}
          >
            <span className={styles.demoEmail}>Connexion démo — Gestionnaire</span>
            <span className={styles.demoRole}>{DEMO_EMAIL}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
