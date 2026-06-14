'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doLogin = async (emailValue: string, passwordValue: string) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  // Compte de démo — connexion en un clic
  const demoAccounts = [
    { email: 'lyes.triki@coproflex.fr', name: 'Lyes Triki', role: 'Syndic / Gestionnaire' },
  ];

  const loginAsDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    void doLogin(demoEmail, 'password123');
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
          <p className={styles.demoTitle}>Comptes de démonstration</p>
          <p className={styles.demoPassword}>Mot de passe : <code>password123</code></p>
          <div className={styles.demoAccounts}>
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => loginAsDemo(account.email)}
                disabled={loading}
                className={styles.demoButton}
              >
                <span className={styles.demoEmail}>{account.name}</span>
                <span className={styles.demoRole}>{account.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
