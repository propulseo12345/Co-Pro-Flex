'use client';

import { useState, useMemo } from 'react';
import { Search, Phone, Mail, MapPin, Star, Plus } from 'lucide-react';
import { useProviders } from '@/hooks/modules/useMaintenanceData';
import { getDomaineLabel } from '@/lib/constants/domaines-activite';
import styles from './directory.module.css';

export default function DirectoryPage() {
    const { providers, isLoading } = useProviders({ autoFetch: true });
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = useMemo(() => {
        if (!searchTerm) return providers;
        const lower = searchTerm.toLowerCase();
        return providers.filter(p =>
            (p.name as string || '').toLowerCase().includes(lower) ||
            ((p.domains as string[]) || []).some(d => getDomaineLabel(d).toLowerCase().includes(lower)) ||
            (p.city as string || '').toLowerCase().includes(lower)
        );
    }, [providers, searchTerm]);

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Annuaire des professionnels</h1>
                    <p className={styles.subtitle}>
                        Retrouvez tous vos fournisseurs et prestataires habituels.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-primary">
                        <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Ajouter un professionnel
                    </button>
                </div>
            </div>

            <div className="card">
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Rechercher un nom, un métier..."
                        className={styles.searchInput}
                        aria-label="Rechercher un nom, un métier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        Chargement des prestataires...
                    </p>
                ) : filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        {searchTerm ? 'Aucun prestataire trouvé.' : 'Aucun prestataire enregistré.'}
                    </p>
                ) : (
                    <div className={styles.list}>
                        {filtered.map((provider) => {
                            const domains = (provider.domains as string[]) || [];
                            const primaryDomain = domains.length > 0 ? getDomaineLabel(domains[0]) : 'Prestataire';

                            return (
                                <div key={provider.id as string} className={styles.item}>
                                    <div className={styles.mainInfo}>
                                        <div className={styles.avatar}>
                                            {(provider.name as string || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className={styles.name}>{provider.name as string}</h3>
                                            <p className={styles.job}>{primaryDomain}</p>
                                        </div>
                                    </div>

                                    <div className={styles.contactInfo}>
                                        {provider.phone && (
                                            <div className={styles.contactItem}>
                                                <Phone size={14} aria-hidden="true" />
                                                <span>{provider.phone as string}</span>
                                            </div>
                                        )}
                                        {provider.email && (
                                            <div className={styles.contactItem}>
                                                <Mail size={14} aria-hidden="true" />
                                                <a href={`mailto:${provider.email}`} className={styles.link}>
                                                    {provider.email as string}
                                                </a>
                                            </div>
                                        )}
                                        {(provider.address || provider.city) && (
                                            <div className={styles.contactItem}>
                                                <MapPin size={14} aria-hidden="true" />
                                                <span>
                                                    {[provider.address, provider.city].filter(Boolean).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {(provider.rating_avg as number) > 0 && (
                                        <div className={styles.rating}>
                                            <Star size={16} className={styles.starIcon} fill="#FBBF24" aria-hidden="true" />
                                            <span className={styles.ratingValue}>
                                                {(provider.rating_avg as number)?.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
