'use client';

import Link from 'next/link';
import { Users, FileText, Plus, Calendar, ArrowRight } from 'lucide-react';
import {
  useConseilSyndicalPage,
  getRoleLabel,
  getStatutLabel,
  getStatutIcon,
} from '@/features/conseil-syndical';
import styles from './conseil-syndical.module.css';

export default function ConseilSyndicalPage() {
  const { activeTab, setActiveTab, membres, rapports, handleCreateRapport } = useConseilSyndicalPage();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <Users size={24} aria-hidden="true" />
            Conseil Syndical
          </h1>
          <p>Gestion des membres et des rapports d&apos;activité</p>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'rapports' ? styles.active : ''}`}
          onClick={() => setActiveTab('rapports')}
        >
          <FileText size={18} aria-hidden="true" />
          Rapports d&apos;activité
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'membres' ? styles.active : ''}`}
          onClick={() => setActiveTab('membres')}
        >
          <Users size={18} aria-hidden="true" />
          Membres
        </button>
      </div>

      <main className={styles.content}>
        {activeTab === 'rapports' && (
          <>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleCreateRapport}
              >
                <Plus size={18} aria-hidden="true" />
                Nouveau rapport
              </button>
            </div>

            <div className={styles.rapportsList}>
              {rapports.map(rapport => (
                <Link
                  key={rapport.id}
                  href={`/conseil-syndical/rapport/${rapport.id}`}
                  className={styles.rapportCard}
                >
                  <div className={styles.rapportHeader}>
                    <h3>{rapport.titre}</h3>
                    <span className={`${styles.badge} ${styles[rapport.statut]}`}>
                      {getStatutIcon(rapport.statut)}
                      {getStatutLabel(rapport.statut)}
                    </span>
                  </div>
                  <div className={styles.rapportMeta}>
                    <span>
                      <Calendar size={14} aria-hidden="true" />
                      {rapport.periodeDebut.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      {' - '}
                      {rapport.periodeFin.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </span>
                    {rapport.annexes.length > 0 && (
                      <span>
                        {rapport.annexes.length} annexe{rapport.annexes.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className={styles.rapportIntro}>
                    {rapport.introduction || 'Aucune introduction'}
                  </p>
                  <div className={styles.rapportFooter}>
                    <span className={styles.lastUpdate}>
                      Modifié le {rapport.updatedAt?.toLocaleDateString('fr-FR')}
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === 'membres' && (
          <div className={styles.membresGrid}>
            {membres.map(membre => (
              <div key={membre.id} className={styles.membreCard}>
                <div className={styles.membreAvatar}>
                  {membre.prenom[0]}{membre.nom[0]}
                </div>
                <div className={styles.membreInfo}>
                  <h3>{membre.prenom} {membre.nom}</h3>
                  <span className={styles.membreRole}>{getRoleLabel(membre.role)}</span>
                  <a href={`mailto:${membre.email}`} className={styles.membreEmail}>
                    {membre.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
