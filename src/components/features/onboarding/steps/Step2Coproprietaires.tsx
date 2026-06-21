'use client';

import { useState, useCallback, useEffect } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import {
  createCoproprietaire,
  listCoproprietaires,
  deleteCoproprietaire,
} from '@/lib/onboarding/api';
import styles from './Step2Coproprietaires.module.css';

interface Step2Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface CoproRow {
  id: string;
  last_name: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  is_resident: boolean;
}

export function Step2Coproprietaires({ coproId, onComplete, onBack }: Step2Props) {
  const [rows, setRows] = useState<CoproRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Champs du formulaire d'ajout rapide
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Charger les copropriétaires existants
  useEffect(() => {
    async function load() {
      setLoadError(null);
      const { data, error } = await listCoproprietaires(coproId);
      // Ne jamais échouer en silence : une erreur (ex. session expirée) doit être
      // affichée, sinon on confond « aucun copropriétaire » et « chargement KO ».
      if (error) setLoadError(error.message);
      else if (data) setRows(data);
      setIsLoading(false);
    }
    load();
  }, [coproId]);

  const handleAdd = useCallback(async () => {
    if (!nom.trim()) return;
    setIsAdding(true);
    setAddError(null);

    const { data, error } = await createCoproprietaire({
      copro_id: coproId,
      last_name: nom.trim(),
      first_name: prenom.trim() || undefined,
      email: email.trim() || undefined,
      phone: telephone.trim() || undefined,
    });

    if (error) {
      // Ne jamais échouer en silence : on affiche la vraie raison.
      setAddError(error.message);
      setIsAdding(false);
      return;
    }

    if (data) {
      setRows(prev => [...prev, {
        id: data.id,
        last_name: data.last_name,
        first_name: data.first_name,
        email: email.trim() || null,
        phone: telephone.trim() || null,
        is_resident: true,
      }]);
      setNom('');
      setPrenom('');
      setEmail('');
      setTelephone('');
    }
    setIsAdding(false);
  }, [coproId, nom, prenom, email, telephone]);

  const handleDelete = useCallback(async (id: string) => {
    const { success } = await deleteCoproprietaire(id);
    if (success) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  }, [handleAdd]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Copropriétaires"
        description="Ajoutez les copropriétaires. Vous pourrez compléter leurs informations plus tard."
        count={`${rows.length} copropriétaire${rows.length > 1 ? 's' : ''}`}
      />

      {/* Formulaire d'ajout rapide */}
      <div className={styles.addRow}>
        <input
          value={nom}
          onChange={e => setNom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom *"
        />
        <input
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Prénom"
        />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Email"
        />
        <input
          value={telephone}
          onChange={e => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          onKeyDown={handleKeyDown}
          placeholder="Téléphone"
        />
        <button
          className={styles.btnAdd}
          onClick={handleAdd}
          disabled={!nom.trim() || isAdding}
        >
          <UserPlus size={14} />
          {isAdding ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>

      {addError && <div className={styles.addError}>{addError}</div>}
      {loadError && (
        <div className={styles.addError}>
          Impossible de charger les copropriétaires : {loadError}. Essayez de recharger la page
          (ou de vous reconnecter si votre session a expiré).
        </div>
      )}

      {/* Tableau */}
      {rows.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.last_name}</td>
                <td>{row.first_name || '—'}</td>
                <td>{row.email || '—'}</td>
                <td>{row.phone || '—'}</td>
                <td>
                  <button className={styles.btnDelete} onClick={() => handleDelete(row.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.emptyState}>
          {isLoading ? 'Chargement...' : 'Aucun copropriétaire ajouté. Remplissez le formulaire ci-dessus.'}
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={onComplete}
          disabled={rows.length === 0}
        >
          Continuer ({rows.length} copropriétaire{rows.length > 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
