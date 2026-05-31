'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Wallet, Check, Clock, Users } from 'lucide-react';
import { useAppelsFondsDetail } from '@/features/finance/appels-fonds/hooks/useAppelsFondsDetail';
import { DetailHeader } from '@/features/finance/appels-fonds/components/DetailHeader';
import { StatsGrid } from '@/features/finance/appels-fonds/components/StatsGrid';
import { CoproTable } from '@/features/finance/appels-fonds/components/CoproTable';
import { RelanceModal } from '@/features/finance/appels-fonds/components/RelanceModal';
import { PaymentModal } from '@/features/finance/appels-fonds/components/PaymentModal';
import { formatEuros } from '@/features/finance/appels-fonds/utils';
import type { CallLineDetailed } from '@/lib/finance/api';
import type { StatItem } from '@/features/finance/appels-fonds/components/StatsGrid';
import styles from '@/features/finance/appels-fonds/styles/DetailPage.module.css';

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId as string;

  const { call, lots, stats, isLoading, recordPayment, paymentLoading, refresh } = useAppelsFondsDetail(callId);
  const [relanceLine, setRelanceLine] = useState<CallLineDetailed | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={48} className={styles.spinner} />
        <p>Chargement de l&apos;appel de fonds...</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className={styles.loadingContainer}>
        <p>Appel de fonds introuvable.</p>
        <button className={styles.btnPrimary} onClick={() => router.back()}>
          Retour
        </button>
      </div>
    );
  }

  const subtitle = [
    `Echeance : ${new Date(call.due_date).toLocaleDateString('fr-FR')}`,
    call.issued_at ? `Emis le ${new Date(call.issued_at).toLocaleDateString('fr-FR')}` : null,
    call.repartition_key_name ? `Cles : ${call.repartition_key_name}` : null,
  ].filter(Boolean).join(' \u00B7 ');

  const statItems: StatItem[] = [
    {
      icon: <Wallet size={18} />,
      iconColor: 'blue',
      label: 'Appele',
      value: formatEuros(stats.called),
    },
    {
      icon: <Check size={18} />,
      iconColor: 'green',
      label: 'Encaisse',
      value: formatEuros(stats.paid),
      valueColor: 'green',
    },
    {
      icon: <Clock size={18} />,
      iconColor: 'red',
      label: 'Restant',
      value: formatEuros(stats.remaining),
      valueColor: 'red',
    },
    {
      icon: <Users size={18} />,
      iconColor: 'amber',
      label: 'Coproprietaires',
      value: String(stats.paidCount),
      suffix: `/ ${stats.totalCount} payes`,
    },
  ];

  const handleBack = () => router.push('/finance/appels-fonds');
  const handleGeneratePdf = () => { /* TODO: Task 16 */ };
  const handleSend = () => { /* TODO: Task 17 */ };
  const handleRecordPayment = () => setShowPayment(true);
  const handleRemind = (_lineId: string) => { /* TODO: relance */ };

  return (
    <div>
      <DetailHeader
        title={call.label}
        subtitle={subtitle}
        onBack={handleBack}
        onGeneratePdf={handleGeneratePdf}
        onSend={handleSend}
        onRecordPayment={handleRecordPayment}
        callStatus={call.status}
      />
      <StatsGrid items={statItems} />
      <CoproTable lots={lots} onRemind={handleRemind} onRelance={(line) => setRelanceLine(line)} />
      {relanceLine && call && (
        <RelanceModal
          line={relanceLine}
          call={call}
          coproName="Copropriete"
          syndicName="Le Syndic"
          onClose={() => setRelanceLine(null)}
        />
      )}
      {showPayment && (
        <PaymentModal
          lots={lots}
          periodId={call.period_id}
          isSubmitting={paymentLoading}
          recordPayment={recordPayment}
          onClose={() => setShowPayment(false)}
          onRecorded={refresh}
        />
      )}
    </div>
  );
}
