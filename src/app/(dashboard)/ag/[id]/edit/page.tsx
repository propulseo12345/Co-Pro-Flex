'use client';

import { useParams } from 'next/navigation';
import { Clock, FileText, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import Stepper from '@/components/features/ag/Stepper';
import { useAgEditPage } from '@/features/ag/hooks/useAgEditPage';
import { BudgetSection, AddressSection } from '@/features/ag/components/edit';
import styles from '../../new/new-ag.module.css';

export default function EditAGPage() {
  const params = useParams();
  const agId = params.id as string;
  const page = useAgEditPage({ agId });

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={page.goBack} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Modifier la planification de l'AG</h1>
          <p className={styles.subtitle}>Modifiez les informations de base de votre AG</p>
        </div>
      </div>

      <Stepper currentStep={1} agId={agId} />

      <form onSubmit={page.handleSubmit} className={styles.form}>
        {page.showValidationErrors && Object.keys(page.errors).length > 0 && (
          <div className={styles.validationBanner}>
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Veuillez corriger les erreurs suivantes :</strong>
              <ul>
                {Object.entries(page.errors).map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className={styles.formContent}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Type d'assemblée</h2>
            <div className={styles.radioGroup}>
              <label className={styles.radioCard}>
                <input
                  type="radio"
                  name="type"
                  value="ORDINAIRE"
                  checked={page.formData.type === 'ORDINAIRE'}
                  onChange={(e) => page.handleChange('type', e.target.value as 'ORDINAIRE' | 'EXTRAORDINAIRE')}
                />
                <div className={styles.radioContent}>
                  <div className={styles.radioTitle}>Assemblée Générale Ordinaire</div>
                  <div className={styles.radioDescription}>
                    Vote du budget, approbation des comptes, travaux courants
                  </div>
                </div>
              </label>
              <label className={styles.radioCard}>
                <input
                  type="radio"
                  name="type"
                  value="EXTRAORDINAIRE"
                  checked={page.formData.type === 'EXTRAORDINAIRE'}
                  onChange={(e) => page.handleChange('type', e.target.value as 'ORDINAIRE' | 'EXTRAORDINAIRE')}
                />
                <div className={styles.radioContent}>
                  <div className={styles.radioTitle}>Assemblée Générale Extraordinaire</div>
                  <div className={styles.radioDescription}>
                    Modification du règlement, gros travaux, litiges
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.required}>Informations obligatoires</span>
            </h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <DatePicker
                  label="Date de l'AG"
                  value={page.formData.date ? page.parseISO(page.formData.date) : null}
                  onChange={page.handleDateChange}
                  required
                  minDate={page.startOfDay(new Date())}
                  error={page.errors.date}
                  hint="Choisissez une date dans le futur"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="heure" className={styles.label}>
                  <Clock size={18} aria-hidden="true" />
                  Heure <span className={styles.asterisk}>*</span>
                </label>
                <input
                  type="time"
                  id="heure"
                  className={`${styles.input} ${page.errors.heure ? styles.inputError : ''}`}
                  value={page.formData.heure}
                  onChange={(e) => page.handleChange('heure', e.target.value)}
                />
                {page.errors.heure && <span className={styles.error}>{page.errors.heure}</span>}
              </div>
            </div>

            <AddressSection
              adresse={page.formData.adresse}
              adresseComplete={page.formData.adresseComplete}
              isGoogleMapsLoaded={page.isGoogleMapsLoaded}
              autocompleteRef={page.autocompleteRef}
              errors={page.errors}
              onAdresseChange={page.handleAdresseChange}
            />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Informations facultatives</h2>

            <BudgetSection
              enabled={page.formData.budget}
              exercice={page.formData.budgetExercice}
              postes={page.formData.budgetPostes}
              total={page.budgetTotal}
              newPoste={page.newPoste}
              showCustomPoste={page.showCustomPoste}
              editingPosteId={page.editingPosteId}
              editingPosteData={page.editingPosteData}
              editingError={page.editingError}
              postesDepenses={page.POSTES_DEPENSES}
              budgetPrecedent={page.BUDGET_PRECEDENT}
              error={page.errors.budgetMontant}
              onToggle={(v) => page.handleChange('budget', v)}
              onExerciceChange={(v) => page.handleChange('budgetExercice', v)}
              onImportPrecedent={page.handleImportBudgetPrecedent}
              onPosteSelect={page.handlePosteSelect}
              onAddPoste={page.handleAddPoste}
              onRemovePoste={page.handleRemovePoste}
              onEditPoste={page.handleEditPoste}
              onSavePoste={page.handleSavePoste}
              onCancelEdit={page.handleCancelEdit}
              onEditKeyDown={page.handleEditKeyDown}
              onNewPosteChange={page.setNewPoste}
              onEditingDataChange={page.setEditingPosteData}
            />
          </div>

          <div className={styles.infoBox}>
            <FileText size={20} aria-hidden="true" />
            <div>
              <strong>Prochaine étape : Construction de l'ordre du jour</strong>
              <p>
                Vous pourrez ajouter des résolutions depuis la bibliothèque de résolutions ou
                créer des résolutions personnalisées.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={page.goBack} className="btn btn-secondary">
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            Enregistrer les modifications
            <ArrowRight size={16} style={{ marginLeft: 8 }} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
