'use client';

import { useState } from 'react';
import { 
    Trash2, 
    UserPlus, 
    Link as LinkIcon, 
    Plus, 
    X, 
    Save,
    ArrowLeft,
    Check
} from 'lucide-react';
import Link from 'next/link';
import styles from './info.module.css';

// Types locaux (devraient être dans types.ts mais on les définit ici pour l'instant)
type TypeLot = 'APPARTEMENT' | 'STUDIO' | 'LOCAL_COMMERCIAL' | 'CAVE' | 'PARKING' | 'GARAGE' | 'MAISON' | 'LOGE';

interface Coproprietaire {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
}

interface Lot {
    id: string;
    numero: string;
    type: TypeLot;
    estPrincipal: boolean;
    coproprietaireId: string;
    tantiemesGeneraux: number;
    autresCles: Record<string, number>;
}

interface CleRepartition {
    id: string;
    nom: string;
}

// Données mockées
const MOCK_COPROPRIETAIRES: Coproprietaire[] = [
    { id: '1', nom: 'Leblanc', prenom: 'Marie', email: 'marie.leblanc@example.fr', telephone: '04 72 11 22 33' },
    { id: '2', nom: 'Moreau', prenom: 'Pierre', email: 'pierre.moreau@example.fr', telephone: '04 72 44 55 66' },
    { id: '3', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@example.fr' },
    { id: '4', nom: 'Bernard', prenom: 'Thomas', email: 'thomas.bernard@example.fr' },
];

const TYPES_LOT: { value: TypeLot; label: string }[] = [
    { value: 'APPARTEMENT', label: 'Appartement' },
    { value: 'STUDIO', label: 'Studio' },
    { value: 'LOCAL_COMMERCIAL', label: 'Local commercial' },
    { value: 'CAVE', label: 'Cave' },
    { value: 'PARKING', label: 'Parking' },
    { value: 'GARAGE', label: 'Garage' },
    { value: 'MAISON', label: 'Maison' },
    { value: 'LOGE', label: 'Loge' },
];

export default function InfoCoproPage() {
    const [lots, setLots] = useState<Lot[]>([
        {
            id: '1',
            numero: 'A1',
            type: 'APPARTEMENT',
            estPrincipal: true,
            coproprietaireId: '1',
            tantiemesGeneraux: 125,
            autresCles: {}
        },
        {
            id: '2',
            numero: 'Cave 1',
            type: 'CAVE',
            estPrincipal: false,
            coproprietaireId: '1',
            tantiemesGeneraux: 5,
            autresCles: {}
        }
    ]);

    const [clesRepartition, setClesRepartition] = useState<CleRepartition[]>([
        { id: '1', nom: 'Charges générales' },
        { id: '2', nom: 'Ascenseur' }
    ]);

    const [nouvelleCle, setNouvelleCle] = useState({ nom: '', visible: false });
    const [coproprietaires] = useState<Coproprietaire[]>(MOCK_COPROPRIETAIRES);
    const [showAddLot, setShowAddLot] = useState(false);
    const [lotEnEdition, setLotEnEdition] = useState<Lot | null>(null);

    const ajouterLot = () => {
        const nouveauLot: Lot = {
            id: Date.now().toString(),
            numero: '',
            type: 'APPARTEMENT',
            estPrincipal: false,
            coproprietaireId: coproprietaires[0]?.id || '',
            tantiemesGeneraux: 0,
            autresCles: {}
        };
        setLots([...lots, nouveauLot]);
        setLotEnEdition(nouveauLot);
        setShowAddLot(true);
    };

    const supprimerLot = (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce lot ?')) {
            setLots(lots.filter(l => l.id !== id));
        }
    };

    const modifierLot = (lot: Lot) => {
        setLotEnEdition(lot);
        setShowAddLot(true);
    };

    const sauvegarderLot = (lotModifie: Lot) => {
        setLots(lots.map(l => l.id === lotModifie.id ? lotModifie : l));
        setShowAddLot(false);
        setLotEnEdition(null);
    };

    const ajouterCleRepartition = () => {
        if (nouvelleCle.nom.trim()) {
            const nouvelleCleObj: CleRepartition = {
                id: Date.now().toString(),
                nom: nouvelleCle.nom
            };
            setClesRepartition([...clesRepartition, nouvelleCleObj]);
            setNouvelleCle({ nom: '', visible: false });
        }
    };

    const getCoproprietaireNom = (id: string) => {
        const copro = coproprietaires.find(c => c.id === id);
        return copro ? `${copro.prenom} ${copro.nom}` : 'Non assigné';
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <Link href="/settings" className={styles.backLink}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    <span>Retour aux paramètres</span>
                </Link>
                <div>
                    <h1 className={styles.title}>Paramétrage des lots</h1>
                    <p className={styles.subtitle}>
                        Renseignez la liste complète des lots de la copropriété avec toutes les informations nécessaires
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                {/* Section Clés de répartition */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Clés de répartition</h2>
                        <button
                            onClick={() => setNouvelleCle({ nom: '', visible: true })}
                            className="btn btn-secondary"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Ajouter une clé de répartition
                        </button>
                    </div>

                    {nouvelleCle.visible && (
                        <div className={styles.addCleForm}>
                            <input type="text" placeholder="Nom de la clé (ex: Chauffage, Bâtiment A...)" value={nouvelleCle.nom} onChange={(e) => setNouvelleCle({ ...nouvelleCle, nom: e.target.value})}
                                className={styles.input}
                                autoFocus
                            />
                            <div className={styles.addCleActions}>
                                <button onClick={ajouterCleRepartition} className="btn btn-primary">
                                    <Check size={16} aria-hidden="true" />
                                    Ajouter
                                </button>
                                <button
                                    onClick={() => setNouvelleCle({ nom: '', visible: false })}
                                    className="btn btn-secondary"
                                >
                                    <X size={16} aria-hidden="true" />
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={styles.clesList}>
                        {clesRepartition.map(cle => (
                            <div key={cle.id} className={styles.cleBadge}>
                                {cle.nom}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tableau des lots */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Liste des lots</h2>
                        <button onClick={ajouterLot} className="btn btn-primary">
                            <Plus size={16} aria-hidden="true" />
                            Ajouter un lot
                        </button>
                    </div>

                    {showAddLot && lotEnEdition && (
                        <div className={styles.editLotForm}>
                            <h3>{lotEnEdition.numero ? 'Modifier le lot' : 'Nouveau lot'}</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Numéro de lot *</label>
                                    <input
                                        type="text"
                                        value={lotEnEdition.numero}
                                        onChange={(e) => setLotEnEdition({ ...lotEnEdition, numero: e.target.value })}
                                        placeholder="Ex: A1, 12, Cave 3..."
                                        className={styles.input}
                                    />
                                    <small>Numéro exact de l'EDD ou de l'acte de vente</small>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Type de lot *</label>
                                    <select
                                        value={lotEnEdition.type}
                                        onChange={(e) => setLotEnEdition({ ...lotEnEdition, type: e.target.value as TypeLot})}
                                        className={styles.select}
                                    >
                                        {TYPES_LOT.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={lotEnEdition.estPrincipal}
                                            onChange={(e) => setLotEnEdition({ ...lotEnEdition, estPrincipal: e.target.checked })}
                                            className={styles.checkbox}
                                        />
                                        <span>Lot principal</span>
                                    </label>
                                    <small>Pour les lots d'habitation uniquement</small>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Copropriétaire *</label>
                                    <select
                                        value={lotEnEdition.coproprietaireId}
                                        onChange={(e) => setLotEnEdition({ ...lotEnEdition, coproprietaireId: e.target.value})}
                                        className={styles.select}
                                    >
                                        {coproprietaires.map(copro => (
                                            <option key={copro.id} value={copro.id}>
                                                {copro.prenom} {copro.nom}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Charges générales (tantièmes) *</label>
                                    <input type="number" value={lotEnEdition.tantiemesGeneraux} onChange={(e) => setLotEnEdition({ ...lotEnEdition, tantiemesGeneraux: parseFloat(e.target.value) || 0})}
                                        className={styles.input}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {clesRepartition.filter(c => c.nom !== 'Charges générales').map(cle => (
                                    <div key={cle.id} className={styles.formGroup}>
                                        <label>{cle.nom} (tantièmes)</label>
                                        <input type="number" value={lotEnEdition.autresCles[cle.nom] || 0} onChange={(e) => setLotEnEdition({
                                                ...lotEnEdition,
                                                autresCles: {
                                                    ...lotEnEdition.autresCles,
                                                    [cle.nom]: parseFloat(e.target.value) || 0}
                                            })}
                                            className={styles.input}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    onClick={() => sauvegarderLot(lotEnEdition)}
                                    className="btn btn-primary"
                                    disabled={!lotEnEdition.numero || !lotEnEdition.coproprietaireId}
                                >
                                    <Save size={16} aria-hidden="true" />
                                    {lotEnEdition.numero ? 'Enregistrer' : 'Ajouter'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddLot(false);
                                        setLotEnEdition(null);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    <X size={16} aria-hidden="true" />
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Numéro</th>
                                    <th>Type</th>
                                    <th>Principal</th>
                                    <th>Copropriétaire</th>
                                    <th>Charges générales</th>
                                    {clesRepartition.filter(c => c.nom !== 'Charges générales').map(cle => (
                                        <th key={cle.id}>{cle.nom}</th>
                                    ))}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lots.map(lot => (
                                    <tr key={lot.id}>
                                        <td>{lot.numero}</td>
                                        <td>{TYPES_LOT.find(t => t.value === lot.type)?.label}</td>
                                        <td>
                                            {lot.estPrincipal ? (
                                                <span className={styles.badge}>Oui</span>
                                            ) : (
                                                <span className={styles.badgeSecondary}>Non</span>
                                            )}
                                        </td>
                                        <td>{getCoproprietaireNom(lot.coproprietaireId)}</td>
                                        <td>{lot.tantiemesGeneraux}</td>
                                        {clesRepartition.filter(c => c.nom !== 'Charges générales').map(cle => (
                                            <td key={cle.id}>{lot.autresCles[cle.nom] || 0}</td>
                                        ))}
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    onClick={() => modifierLot(lot)}
                                                    className={styles.actionBtn}
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => supprimerLot(lot.id)}
                                                    className={styles.actionBtn}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Actions globales */}
                <section className={styles.section}>
                    <div className={styles.actionsGlobales}>
                        <button className="btn btn-secondary">
                            <UserPlus size={16} aria-hidden="true" />
                            Dédoublonner un copropriétaire
                        </button>
                        <button className="btn btn-secondary">
                            <LinkIcon size={16} />
                            Rattacher deux copropriétaires
                        </button>
                        <button className="btn btn-primary">
                            <Save size={16} aria-hidden="true" />
                            Valider
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

