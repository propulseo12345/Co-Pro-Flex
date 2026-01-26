'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMail } from '@/hooks/modules/useMail';
import { useDebounce } from '@/hooks/useDebounce';
import {
  PieceJointeMail,
  MailParticipant,
  MailRecipientType,
  BrouillonData,
  formatTailleFichier,
  validerFichierPJ,
  generatePJId,
} from '@/types/models/mail';
import {
  EMAIL_TEMPLATES,
  RECIPIENT_GROUPS,
  INDIVIDUAL_RECIPIENTS,
  REPLY_EMAILS,
} from '@/data/mock/mail.mock';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const replyToId = searchParams.get('reply');
  const draftId = searchParams.get('draft');

  const { sauvegarderBrouillon, envoyerMail, getMailById } = useMail();

  const [recipientType, setRecipientType] = useState<MailRecipientType>('all');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['all']);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PieceJointeMail[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateId);
  const [isSending, setIsSending] = useState(false);
  const [individualSearch, setIndividualSearch] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const hasUnsavedChanges = useRef(false);

  const debouncedSubject = useDebounce(subject, 500);
  const debouncedBody = useDebounce(body, 500);

  // Load draft if draftId
  useEffect(() => {
    if (draftId) {
      const mail = getMailById(draftId);
      if (mail) {
        setSubject(mail.subject || '');
        setBody(mail.body || '');
        setRecipientType(mail.recipientType);
        setAttachments(mail.piecesJointes || []);
        setEditingDraftId(mail.id);
        if (mail.recipientType === 'all') {
          setSelectedGroups(['all']);
        } else if (mail.recipientType === 'group') {
          const groupIds = mail.recipients.map(r => RECIPIENT_GROUPS.find(g => g.label === r.nom)?.id || '').filter(Boolean);
          setSelectedGroups(groupIds.length > 0 ? groupIds : []);
        } else {
          const userIds = mail.recipients.map(r => INDIVIDUAL_RECIPIENTS.find(u => u.nom === r.nom)?.id || '').filter(Boolean);
          setSelectedIndividuals(userIds);
        }
        isFirstLoad.current = false;
      }
    }
  }, [draftId, getMailById]);

  // Apply template or reply
  useEffect(() => {
    if (draftId) return;
    if (replyToId) {
      const replyData = REPLY_EMAILS[Number(replyToId)];
      if (replyData) {
        setSubject(replyData.subject.startsWith('RE:') ? replyData.subject : `RE: ${replyData.subject}`);
        setBody(`\n\n--- Message original de ${replyData.sender} ---\n${replyData.body}`);
        setRecipientType('individual');
        const recipient = INDIVIDUAL_RECIPIENTS.find(r => r.email === replyData.senderEmail);
        if (recipient) setSelectedIndividuals([recipient.id]);
        isFirstLoad.current = false;
      }
    } else if (templateId) {
      const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
        setSelectedTemplate(template.id);
        isFirstLoad.current = false;
      }
    }
  }, [replyToId, templateId, draftId]);

  const buildBrouillonData = useCallback((): BrouillonData => {
    let recipients: MailParticipant[] = [];
    if (recipientType === 'all') {
      recipients = [{ id: 'all', nom: 'Tous les copropriétaires (42 destinataires)', type: 'groupe' }];
    } else if (recipientType === 'group') {
      recipients = selectedGroups.map(gId => {
        const group = RECIPIENT_GROUPS.find(g => g.id === gId);
        return { id: gId, nom: group?.label || gId, type: 'groupe' as const };
      });
    } else {
      recipients = selectedIndividuals.map(uId => {
        const user = INDIVIDUAL_RECIPIENTS.find(u => u.id === uId);
        return { id: uId, nom: user?.nom || uId, email: user?.email, lot: user?.lot, type: 'coproprietaire' as const };
      });
    }
    return {
      id: editingDraftId || undefined,
      subject: subject || '(Sans objet)',
      body,
      recipients,
      recipientType,
      template: selectedTemplate || undefined,
      piecesJointes: attachments
    };
  }, [editingDraftId, subject, body, recipientType, selectedGroups, selectedIndividuals, selectedTemplate, attachments]);

  // Auto-save
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (!hasUnsavedChanges.current && !debouncedSubject && !debouncedBody) return;

    const saveAsDraft = async () => {
      if (!debouncedSubject && !debouncedBody && attachments.length === 0) return;
      setSaveStatus('saving');
      setErrorMessage(null);
      try {
        const result = await sauvegarderBrouillon(buildBrouillonData());
        if (result) {
          if (!editingDraftId) setEditingDraftId(result.id);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
          hasUnsavedChanges.current = false;
        } else {
          setSaveStatus('error');
          setErrorMessage('Erreur lors de la sauvegarde');
        }
      } catch (err) {
        setSaveStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
      }
    };
    saveAsDraft();
  }, [debouncedSubject, debouncedBody]);

  useEffect(() => { hasUnsavedChanges.current = true; }, [subject, body, recipientType, selectedGroups, selectedIndividuals, attachments]);

  const handleTemplateSelect = useCallback((template: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(template.subject);
    setBody(template.body);
    setSelectedTemplate(template.id);
    setShowTemplates(false);
  }, []);

  const handleGroupToggle = useCallback((groupId: string) => {
    if (groupId === 'all') {
      setSelectedGroups(['all']);
    } else {
      setSelectedGroups(prev => {
        const newSelection = prev.filter(id => id !== 'all');
        return prev.includes(groupId) ? newSelection.filter(id => id !== groupId) : [...newSelection, groupId];
      });
    }
  }, []);

  const handleIndividualToggle = useCallback((userId: string) => {
    setSelectedIndividuals(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: PieceJointeMail[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const validation = validerFichierPJ(file);
      if (!validation.valid) { errors.push(`${file.name}: ${validation.error}`); continue; }
      newAttachments.push({ id: generatePJId(), nom: file.name, taille: file.size, mimeType: file.type, url: URL.createObjectURL(file), dateAjout: new Date().toISOString() });
    }
    if (errors.length > 0) { setErrorMessage(errors.join('\n')); setTimeout(() => setErrorMessage(null), 5000); }
    if (newAttachments.length > 0) setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((id: string) => {
    const pj = attachments.find(a => a.id === id);
    if (pj && pj.url.startsWith('blob:')) URL.revokeObjectURL(pj.url);
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, [attachments]);

  const getRecipientCount = useCallback((): number => {
    if (recipientType === 'individual') return selectedIndividuals.length;
    if (selectedGroups.includes('all')) return 42;
    return selectedGroups.reduce((acc, groupId) => acc + (RECIPIENT_GROUPS.find(g => g.id === groupId)?.count || 0), 0);
  }, [recipientType, selectedIndividuals, selectedGroups]);

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !body.trim()) { setErrorMessage('Veuillez remplir l\'objet et le corps du mail'); return; }
    if (recipientType === 'individual' && selectedIndividuals.length === 0) { setErrorMessage('Veuillez sélectionner au moins un destinataire'); return; }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const savedMail = await sauvegarderBrouillon(buildBrouillonData());
      if (savedMail && await envoyerMail(savedMail.id)) {
        router.push('/communication/mail?tab=sent&success=1');
        return;
      }
      setErrorMessage("Erreur lors de l'envoi du mail");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  }, [subject, body, recipientType, selectedIndividuals, buildBrouillonData, sauvegarderBrouillon, envoyerMail, router]);

  const handleSaveDraft = useCallback(async () => {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      if (await sauvegarderBrouillon(buildBrouillonData())) {
        router.push('/communication/mail?tab=drafts');
      } else {
        setSaveStatus('error');
        setErrorMessage('Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    }
  }, [buildBrouillonData, sauvegarderBrouillon, router]);

  const filteredIndividuals = INDIVIDUAL_RECIPIENTS.filter(user =>
    user.nom.toLowerCase().includes(individualSearch.toLowerCase()) ||
    (user.lot || '').toLowerCase().includes(individualSearch.toLowerCase())
  );

  const formatLastSaved = () => {
    if (!lastSavedAt) return '';
    const diffSec = Math.floor((new Date().getTime() - lastSavedAt.getTime()) / 1000);
    if (diffSec < 5) return "À l'instant";
    if (diffSec < 60) return `Il y a ${diffSec}s`;
    return `Il y a ${Math.floor(diffSec / 60)}min`;
  };

  return {
    recipientType, setRecipientType, selectedGroups, setSelectedGroups, selectedIndividuals,
    subject, setSubject, body, setBody, attachments,
    showTemplates, setShowTemplates, selectedTemplate, isSending,
    individualSearch, setIndividualSearch, editingDraftId,
    saveStatus, errorMessage, setErrorMessage,
    handleTemplateSelect, handleGroupToggle, handleIndividualToggle,
    handleFileUpload, removeAttachment, getRecipientCount,
    handleSend, handleSaveDraft,
    filteredIndividuals, formatLastSaved,
    EMAIL_TEMPLATES, RECIPIENT_GROUPS
  };
}
