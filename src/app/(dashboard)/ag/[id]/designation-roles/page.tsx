'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { RoleSelect } from '@/components/features/ag/RoleSelect';
import {
  useDesignationRolesPage,
  RoleCard,
  ConseilSyndicalSection,
} from '@/features/ag/designation';
import styles from './designation-roles.module.css';

export default function DesignationRolesPage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  const {
    coproprietairesPresents,
    roles,
    isLoading,
    isSaving,
    showRoleSelectModal,
    currentRole,
    mappedCoproprietaires,
    mappedGestionnaires,
    allRolesDesigned,
    openModal,
    closeModal,
    selectPerson,
    removeMembre,
  } = useDesignationRolesPage(agId);

  if (isLoading) {
    return (
      <div className="container">
        <p>Chargement...</p>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'president': return 'le président de séance';
      case 'secretaire': return 'le secrétaire de séance';
      case 'scrutateur': return 'le scrutateur';
      case 'conseilTitulaire': return 'un membre titulaire';
      default: return 'un membre suppléant';
    }
  };

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <div>
          <h1 className={styles.title}>Désignation des rôles</h1>
          <p className={styles.subtitle}>
            Pendant l'AG - {coproprietairesPresents.length} copropriétaire(s) présent(s) ou représenté(s)
            {isSaving && <span className={styles.savingIndicator}> (enregistrement...)</span>}
          </p>
        </div>
      </div>

      {coproprietairesPresents.length === 0 && (
        <div className={styles.warning}>
          <p>Aucun copropriétaire présent ou représenté. Veuillez d'abord remplir la feuille de présence.</p>
          <button onClick={() => router.push(`/ag/${agId}/feuille-presence`)} className="btn btn-primary">
            Aller à la feuille de présence
          </button>
        </div>
      )}

      {coproprietairesPresents.length > 0 && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Rôles obligatoires de séance</h2>
            <div className={styles.roleCards}>
              <RoleCard
                title="Président de séance"
                roleType="president"
                roleData={roles.presidentSeance}
                onDesignate={openModal}
              />
              <RoleCard
                title="Secrétaire de séance"
                roleType="secretaire"
                roleData={roles.secretaireSeance}
                onDesignate={openModal}
              />
              <RoleCard
                title="Scrutateur"
                roleType="scrutateur"
                roleData={roles.scrutateur}
                onDesignate={openModal}
              />
            </div>
          </div>

          <ConseilSyndicalSection
            membres={roles.membresConseilSyndical}
            onAddTitulaire={() => openModal('conseilTitulaire')}
            onAddSuppleant={() => openModal('conseilSuppleant')}
            onRemoveMembre={removeMembre}
          />

          {allRolesDesigned && (
            <div className={styles.successBanner}>
              <Check size={20} aria-hidden="true" />
              <span>Tous les rôles obligatoires ont été désignés</span>
            </div>
          )}
        </>
      )}

      {showRoleSelectModal && currentRole && (
        <RoleSelect
          role={currentRole}
          roleLabel={getRoleLabel(currentRole)}
          coproprietairesPresents={mappedCoproprietaires}
          gestionnaires={mappedGestionnaires}
          autoriserGestionnaire={currentRole === 'secretaire'}
          onSelect={selectPerson}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
