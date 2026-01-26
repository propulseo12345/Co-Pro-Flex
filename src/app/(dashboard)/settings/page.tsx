'use client';

import { MOCK_PARAMETRES } from '@/data/mock';
import { CreditCard, Shield, FileText, ChevronRight } from 'lucide-react';
import styles from './settings.module.css';
import Link from 'next/link';

export default function SettingsPage() {
    const { informationsCopro } = MOCK_PARAMETRES;

    return (
        <div className="container">
            <h1 className={styles.title}>Paramètres</h1>

            <div className={styles.grid}>
                <div className={styles.mainContent}>
                    {/* Section Copropriétaires */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Copropriétaires</h2>
                        <div className={styles.cardGrid}>
                            <Link href="/settings/visibility" className={styles.card}>
                                <div className={styles.cardIcon}><Shield size={24} aria-hidden="true" /></div>
                                <div className={styles.cardContent}>
                                    <h3>Visibilité des informations</h3>
                                    <p>Qui peut voir quoi ?</p>
                                </div>
                                <ChevronRight className={styles.chevron} aria-hidden="true" />
                            </Link>

                            <Link href="/settings/info" className={styles.card}>
                                <div className={styles.cardIcon}><FileText size={24} aria-hidden="true" /></div>
                                <div className={styles.cardContent}>
                                    <h3>Informations de la copropriété</h3>
                                    <p>Adresse, lots, etc.</p>
                                </div>
                                <ChevronRight className={styles.chevron} aria-hidden="true" />
                            </Link>
                        </div>
                    </section>

                    {/* Section Finance */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Finance et comptabilité</h2>
                        <div className={styles.cardGrid}>
                            <Link href="/finance/tantiemes" className={styles.card}>
                                <div className={styles.cardIcon}><CreditCard size={24} aria-hidden="true" /></div>
                                <div className={styles.cardContent}>
                                    <h3>Tantièmes et clés de répartitions</h3>
                                    <p>Gérez la répartition des charges</p>
                                </div>
                                <ChevronRight className={styles.chevron} aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
                </div>

                <div className={styles.sidebar}>
                    {/* Carte Information */}
                    <div className="card">
                        <h3 className={styles.sidebarTitle}>Copropriété</h3>
                        <p className={styles.coproName}>{informationsCopro.nom}</p>
                        <p className={styles.coproAddress}>{informationsCopro.adresse}</p>
                        <div className={styles.divider} />
                        <Link href="/invoices" className={styles.link}>Mes factures CoProFlex</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
