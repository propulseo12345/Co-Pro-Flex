'use client';

import { MOCK_FOURNISSEURS } from '@/data/mock';
import { Search, Phone, Mail, MapPin, Star, Plus } from 'lucide-react';
import styles from './directory.module.css';

export default function DirectoryPage() {
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
                    <button className="btn btn-primary"><Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Ajouter un professionnel</button>
                </div>
            </div>

            <div className="card">
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                    <input type="text" placeholder="Rechercher un nom, un métier..." className={styles.searchInput} aria-label="Rechercher un nom, un métier..."/>
                </div>

                <div className={styles.list}>
                    {MOCK_FOURNISSEURS.map((fournisseur) => (
                        <div key={fournisseur.id} className={styles.item}>
                            <div className={styles.mainInfo}>
                                <div className={styles.avatar}>
                                    {fournisseur.nom.charAt(0)}
                                </div>
                                <div>
                                    <h3 className={styles.name}>{fournisseur.nom}</h3>
                                    <p className={styles.job}>{fournisseur.metier}</p>
                                </div>
                            </div>

                            <div className={styles.contactInfo}>
                                <div className={styles.contactItem}>
                                    <Phone size={14} aria-hidden="true" />
                                    <span>{fournisseur.telephone}</span>
                                </div>
                                <div className={styles.contactItem}>
                                    <Mail size={14} aria-hidden="true" />
                                    <a href={`mailto:${fournisseur.email}`} className={styles.link}>{fournisseur.email}</a>
                                </div>
                                <div className={styles.contactItem}>
                                    <MapPin size={14} aria-hidden="true" />
                                    <span>{fournisseur.adresse}</span>
                                </div>
                            </div>

                            <div className={styles.rating}>
                                <Star size={16} className={styles.starIcon} fill="#FBBF24" aria-hidden="true" />
                                <span className={styles.ratingValue}>{fournisseur.note}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
