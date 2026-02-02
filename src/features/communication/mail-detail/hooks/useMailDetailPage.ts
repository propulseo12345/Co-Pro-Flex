'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mailSupabaseService } from '@/lib/services/mail-supabase.service';
import { Mail, PieceJointeMail } from '@/types/models/mail';

export function useMailDetailPage(mailId: string) {
  const router = useRouter();

  const [mail, setMail] = useState<Mail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load mail from Supabase
  useEffect(() => {
    const loadMail = async () => {
      setLoading(true);
      try {
        const foundMail = await mailSupabaseService.getMailById(mailId);
        setMail(foundMail);
        if (foundMail?.statut === 'received' && !foundMail.isRead) {
          await mailSupabaseService.markAsRead(mailId);
        }
      } catch (err) {
        console.error('Error loading mail:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMail();
  }, [mailId]);

  // Download attachment
  const telechargerPJ = useCallback((pj: PieceJointeMail) => {
    if (pj.url) {
      window.open(pj.url, '_blank');
    }
  }, []);

  // Download all attachments
  const telechargerToutesPJ = useCallback((mailData: Mail) => {
    mailData.piecesJointes?.forEach(pj => {
      if (pj.url) window.open(pj.url, '_blank');
    });
  }, []);

  const handleMoveToTrash = useCallback(async () => {
    try {
      await mailSupabaseService.moveToTrash(mailId);
      setShowDeleteModal(false);
      setToastMessage('Mail déplacé vers la corbeille');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail'), 1500);
    } catch (err) {
      console.error('Error moving to trash:', err);
    }
  }, [mailId, router]);

  const handleRestore = useCallback(async () => {
    try {
      await mailSupabaseService.restore(mailId);
      setToastMessage('Mail restauré avec succès');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail'), 1500);
    } catch (err) {
      console.error('Error restoring:', err);
    }
  }, [mailId, router]);

  const handlePermanentDelete = useCallback(async () => {
    try {
      await mailSupabaseService.permanentDelete(mailId);
      setShowPermanentDeleteModal(false);
      setToastMessage('Mail supprimé définitivement');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail?tab=trash'), 1500);
    } catch (err) {
      console.error('Error permanently deleting:', err);
    }
  }, [mailId, router]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  // Derived state
  const isIncoming = mail?.statut === 'received';
  const isDeleted = mail?.statut === 'deleted';
  const isDraft = mail?.statut === 'draft';

  return {
    // Data
    mail,
    loading,

    // Derived
    isIncoming,
    isDeleted,
    isDraft,

    // Modals
    showDeleteModal,
    setShowDeleteModal,
    showPermanentDeleteModal,
    setShowPermanentDeleteModal,

    // Toast
    showSuccessToast,
    toastMessage,

    // Actions
    telechargerPJ,
    telechargerToutesPJ,
    handleMoveToTrash,
    handleRestore,
    handlePermanentDelete,
    goBack,
  };
}
