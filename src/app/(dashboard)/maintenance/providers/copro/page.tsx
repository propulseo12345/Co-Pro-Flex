'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MOCK_PRESTATAIRES_COPRO, MOCK_DOMAINES_ACTIVITE } from '@/data/mock';
import { Prestataire, DomaineActivite } from '@/types';
import { getInterventionsCountByPrestataire, getDerniereInterventionByPrestataire } from '@/lib/services/interventions.service';
import { Plus, Search, Phone, Mail, ArrowLeft, Eye, Edit2, Trash2, Users } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import styles from '../providers-list.module.css';
import clsx from 'clsx';

// Enrichir les prestataires avec les données calculées depuis le carnet d'entretien
function enrichirPrestatairesAvecInterventions(prestataires: Prestataire[]): Prestataire[] {
    const countMap = getInterventionsCountByPrestataire();
    const dateMap = getDerniereInterventionByPrestataire();

    return prestataires.map(p => ({
        ...p,
        nombreInterventions: countMap.get(p.id) || 0,
        derniereIntervention: dateMap.get(p.id)
    }));
}

export default function ProvidersCoproPage() {
    const router = useRouter();
    const { showToast } = useToast();
    // Enrichir les prestataires avec les données d'interventions du carnet d'entretien
    const [prestataires, setPrestataires] = useState<Prestataire[]>(() =>
        enrichirPrestatairesAvecInterventions(MOCK_PRESTATAIRES_COPRO)
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [domaineFilter, setDomaineFilter] = useState<DomaineActivite | 'TOUS'>('TOUS');
    const [sortBy, setSortBy] = useState<'nom' | 'interventions' | 'date'>('nom');

    const filteredAndSortedPrestataires = useMemo(() => {
        return prestataires
            .filter(p => {
                const matchesSearch = searchTerm === '' ||
                    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.telephone.includes(searchTerm);
                const matchesDomaine = domaineFilter === 'TOUS' || p.domaines.includes(domaineFilter);
                return matchesSearch && matchesDomaine;
            })
            .sort((a, b) => {
                if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
                if (sortBy === 'interventions') return b.nombreInterventions - a.nombreInterventions;
                if (sortBy === 'date' && a.derniereIntervention && b.derniereIntervention) {
                    return new Date(b.derniereIntervention).getTime() - new Date(a.derniereIntervention).getTime();
                }
                return 0;
            });
    }, [prestataires, searchTerm, domaineFilter, sortBy]);

    const handleDelete = (prestataire: Prestataire) => {
        if (confirm(`Supprimer le prestataire "${prestataire.nom}" ?`)) {
            setPrestataires(prev => prev.filter(p => p.id !== prestataire.id));
            showToast({ type: 'success', message: `Prestataire "${prestataire.nom}" supprimé` });
        }
    };

    return (
        <div className="container">
            {/* En-tête */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={() => router.push('/maintenance/providers')}>
                        <ArrowLeft size={20} aria-hidden="true" />
                    </button>
                    <div>
                        <h1 className={styles.title}>Prestataires de la copropriété</h1>
                        <p className={styles.subtitle}>
                            Prestataires ayant déjà intervenu ({filteredAndSortedPrestataires.length})
                        </p>
                    </div>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-primary" onClick={() => router.push('/maintenance/providers?add=copro')}>
                        <Plus size={18} aria-hidden="true" /> Ajouter
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={18} aria-hidden="true" />
                    <input type="text" placeholder="Rechercher par nom, email, téléphone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className={styles.filterSelect}
                    value={domaineFilter}
                    onChange={(e) => setDomaineFilter(e.target.value as DomaineActivite | 'TOUS')}
                >
                    <option value="TOUS">Tous les domaines</option>
                    {MOCK_DOMAINES_ACTIVITE.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                </select>
                <select
                    className={styles.filterSelect}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'nom' | 'interventions' | 'date')}
                >
                    <option value="nom">Alphabétique</option>
                    <option value="interventions">Nb interventions</option>
                    <option value="date">Dernière intervention</option>
                </select>
            </div>

            {/* Tableau */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Domaines</th>
                            <th>Contact</th>
                            <th>Ville</th>
                            <th>Interventions</th>
                            <th>Dernière intervention</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedPrestataires.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <Link href={`/maintenance/providers/${p.id}`} className={styles.providerName}>
                                        <div className={styles.avatar}>{p.nom.charAt(0)}</div>
                                        <span>{p.nom}</span>
                                    </Link>
                                </td>
                                <td>
                                    <div className={styles.domaines}>
                                        {p.domaines.slice(0, 2).map((d, i) => (
                                            <span key={i} className={styles.domaineBadge}>
                                                {MOCK_DOMAINES_ACTIVITE.find(da => da.value === d)?.label || d}
                                            </span>
                                        ))}
                                        {p.domaines.length > 2 && <span className={styles.more}>+{p.domaines.length - 2}</span>}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.contact}>
                                        <span><Phone size={14} aria-hidden="true" /> {p.telephone}</span>
                                        <span><Mail size={14} aria-hidden="true" /> {p.email}</span>
                                    </div>
                                </td>
                                <td>{p.ville || '-'}</td>
                                <td className={styles.center}>{p.nombreInterventions}</td>
                                <td className={styles.date}>
                                    {p.derniereIntervention ? new Date(p.derniereIntervention).toLocaleDateString('fr-FR') : '-'}
                                </td>
                                <td>
                                    <div className={styles.actionsCell}>
                                        <Link href={`/maintenance/providers/${p.id}`} className={styles.actionBtn}>
                                            <Eye size={14} aria-hidden="true" /> Voir
                                        </Link>
                                        <button className={styles.actionBtn} onClick={() => router.push(`/maintenance/providers/${p.id}?edit=true`)}>
                                            <Edit2 size={14} aria-hidden="true" />
                                        </button>
                                        <button className={clsx(styles.actionBtn, styles.actionBtnDanger)} onClick={() => handleDelete(p)}>
                                            <Trash2 size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredAndSortedPrestataires.length === 0 && (
                    <div className={styles.emptyState}>
                        <Users size={48} aria-hidden="true" />
                        <p>Aucun prestataire trouvé</p>
                        <span>Modifiez vos filtres ou ajoutez un nouveau prestataire</span>
                    </div>
                )}
            </div>
        </div>
    );
}
