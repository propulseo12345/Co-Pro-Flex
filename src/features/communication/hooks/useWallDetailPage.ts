'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicationDetail, Comment, RoleBadge } from '../types';

const MUR_STORAGE_KEY = 'mur-copro-data';

const MOCK_PUBLICATIONS: Record<string, PublicationDetail> = {
  '1': {
    id: 1,
    author: 'Syndic - Jean DUPONT',
    authorRole: 'syndic',
    title: 'Travaux de réfection de la toiture - Planning',
    content: `Suite à la décision de l'Assemblée Générale du 15 novembre 2025, les travaux de réfection de la toiture débuteront le 15 janvier 2026.\n\n**Entreprise retenue :** Toiture Pro SAS\n**Durée estimée :** 6 semaines\n\n**Planning prévisionnel :**\n- Semaine 1-2 : Installation échafaudages et mise en sécurité\n- Semaine 3-4 : Dépose ancienne couverture et vérification charpente\n- Semaine 5-6 : Pose nouvelle couverture et finitions\n\n**Horaires d'intervention :**\nDu lundi au vendredi de 8h à 17h. Aucune intervention le week-end.\n\n**Points d'attention :**\n- Un périmètre de sécurité sera mis en place autour du bâtiment\n- Les places de parking n°12 à 18 seront temporairement inaccessibles\n- Merci de garder vos fenêtres fermées lors des travaux de dépose\n\nPour toute question, n'hésitez pas à contacter le syndic ou à commenter cette publication.`,
    category: 'travaux',
    date: '2025-11-28T10:00:00',
    isPinned: true,
    isLocked: false,
    likes: 12,
    hasAttachment: true,
    isLiked: false,
    tags: ['Toiture', 'Travaux 2026', 'Information'],
    attachments: [
      { id: 'a1', name: 'Planning_travaux_toiture.pdf', type: 'pdf', size: '2.3 MB', url: '#' },
      { id: 'a2', name: 'Devis_ToiturePro.pdf', type: 'pdf', size: '1.1 MB', url: '#' },
      { id: 'a3', name: 'Photos_etat_actuel.jpg', type: 'image', size: '3.5 MB', url: '#' }
    ],
    comments: [
      { id: 'c1', author: 'Marie MARTIN', authorRole: 'conseil', content: 'Merci pour ces informations détaillées. Est-ce que les résidents des derniers étages seront prévenus individuellement avant le début des travaux ?', date: '2025-11-28T14:30:00', likes: 5, isLiked: true },
      { id: 'c2', author: 'Syndic - Jean DUPONT', authorRole: 'syndic', content: 'Bonjour Marie, oui absolument. Un courrier individuel sera envoyé aux résidents des 5ème et 6ème étages une semaine avant le démarrage des travaux.', date: '2025-11-28T15:45:00', likes: 3, isLiked: false },
      { id: 'c3', author: 'Pierre LEBLANC', authorRole: 'copropriétaire', content: 'Les places de parking concernées seront-elles réattribuées temporairement ?', date: '2025-11-29T09:15:00', likes: 2, isLiked: false }
    ]
  },
  '2': {
    id: 2,
    author: 'Marie MARTIN',
    authorRole: 'conseil',
    title: 'Organisation Fête des Voisins 2026',
    content: `Bonjour à tous !\n\nComme chaque année, nous aimerions organiser la Fête des Voisins. Cette année, elle aura lieu le **vendredi 29 mai 2026**.\n\n**Proposition d'organisation :**\n- Lieu : Jardin de la résidence\n- Horaire : 18h30 - 22h00\n- Formule : Chacun apporte un plat à partager\n\n**Nous recherchons des volontaires pour :**\n- Décoration du jardin\n- Installation des tables et chaises\n- Animation musicale (si musiciens parmi nous !)\n- Gestion des boissons\n\nMerci de vous manifester en commentaire si vous êtes intéressés pour participer à l'organisation.\n\nEnsemble, faisons de cette soirée un moment convivial !`,
    category: 'social',
    date: '2025-11-27T14:30:00',
    isPinned: false,
    isLocked: false,
    likes: 24,
    hasAttachment: false,
    isLiked: true,
    tags: ['Événement', 'Convivialité', 'Fête des voisins'],
    attachments: [],
    comments: [
      { id: 'c1', author: 'Sophie LEBLANC', authorRole: 'copropriétaire', content: 'Super initiative ! Je peux m\'occuper de la décoration avec plaisir.', date: '2025-11-27T16:00:00', likes: 8, isLiked: false }
    ]
  },
  '3': {
    id: 3,
    author: 'Pierre LEBLANC',
    authorRole: 'copropriétaire',
    title: 'Rappel - Code d\'accès immeuble',
    content: `Chers voisins,\n\nJe me permets de faire un rappel important concernant la sécurité de notre immeuble.\n\n**Problème constaté :**\nPlusieurs livraisons ont été laissées dans le hall d'entrée sans que les livreurs aient été autorisés à entrer. Cela signifie que le code d'accès a été communiqué à des personnes extérieures.\n\n**Rappel des consignes :**\n- Ne jamais communiquer le code d'accès à des tiers\n- Pour les livraisons, préférer la réception en main propre\n- En cas d'absence, utiliser les points relais ou consignes\n- Ne pas maintenir la porte ouverte pour des inconnus\n\nLa sécurité de notre immeuble est l'affaire de tous.\n\nMerci de votre compréhension.`,
    category: 'securite',
    date: '2025-11-26T16:45:00',
    isPinned: true,
    isLocked: true,
    likes: 8,
    hasAttachment: false,
    isLiked: false,
    tags: ['Sécurité', 'Important'],
    attachments: [],
    comments: [
      { id: 'c1', author: 'Syndic - Jean DUPONT', authorRole: 'syndic', content: 'Merci Pierre pour ce rappel important. Le changement du code est prévu pour le mois prochain.', date: '2025-11-26T17:30:00', likes: 4, isLiked: false }
    ]
  }
};

interface UseWallDetailPageParams {
  publicationId: string;
}

export function useWallDetailPage({ publicationId }: UseWallDetailPageParams) {
  const router = useRouter();
  const [publication, setPublication] = useState<PublicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    let pub: PublicationDetail | null = null;

    if (MOCK_PUBLICATIONS[publicationId]) pub = MOCK_PUBLICATIONS[publicationId];

    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.publications && data.publications[publicationId]) pub = data.publications[publicationId];
        if (data.comments && data.comments[publicationId]) setComments(data.comments[publicationId]);
        else if (pub) setComments(pub.comments || []);
      } catch (e) { /* ignore */ }
    } else if (pub) {
      setComments(pub.comments || []);
    }

    if (pub) {
      setPublication(pub);
      setIsLiked(pub.isLiked || false);
      setLikesCount(pub.likes || 0);
    }
    setLoading(false);
  }, [publicationId]);

  const getCategoryColor = useCallback((category: string) => {
    const colors: Record<string, string> = { travaux: '#f59e0b', social: '#8b5cf6', securite: '#ef4444', evenements: '#3b82f6', annonce: '#10b981' };
    return colors[category] || '#6b7280';
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = { travaux: 'Travaux', social: 'Social', securite: 'Sécurité', evenements: 'Événements', annonce: 'Annonce' };
    return labels[category] || category;
  }, []);

  const getRoleBadge = useCallback((role: string): RoleBadge => {
    const badges: Record<string, RoleBadge> = { syndic: { label: 'Syndic', color: '#4f46e5' }, conseil: { label: 'Conseil Syndical', color: '#059669' }, copropriétaire: { label: 'Copropriétaire', color: '#6b7280' } };
    return badges[role] || badges.copropriétaire;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  }, [isLiked]);

  const handleLikeComment = useCallback((commentId: string) => {
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, isLiked: !comment.isLiked, likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1 };
      }
      return comment;
    });
    setComments(updatedComments);

    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { publications: {}, comments: {} };
    data.comments = data.comments || {};
    data.comments[publicationId] = updatedComments;
    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
  }, [comments, publicationId]);

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyContent('');
  }, [replyingTo]);

  const handleSubmitReply = useCallback(async (parentCommentId: string) => {
    if (!replyContent.trim() || publication?.isLocked) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const parentComment = comments.find(c => c.id === parentCommentId);
    const replyComment: Comment = { id: `c-${Date.now()}`, author: 'Moi', authorRole: 'copropriétaire', content: `@${parentComment?.author} ${replyContent.trim()}`, date: new Date().toISOString(), likes: 0, isLiked: false };

    const updatedComments = [...comments, replyComment];
    setComments(updatedComments);

    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { publications: {}, comments: {} };
    data.comments = data.comments || {};
    data.comments[publicationId] = updatedComments;
    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));

    setReplyContent('');
    setReplyingTo(null);
    setIsSubmitting(false);
  }, [replyContent, publication, comments, publicationId]);

  const handleCommentSubmit = useCallback(async () => {
    if (!newComment.trim() || publication?.isLocked) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const newCommentObj: Comment = { id: `c-${Date.now()}`, author: 'Moi', authorRole: 'copropriétaire', content: newComment.trim(), date: new Date().toISOString(), likes: 0, isLiked: false };
    const updatedComments = [...comments, newCommentObj];
    setComments(updatedComments);

    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { publications: {}, comments: {} };
    data.comments = data.comments || {};
    data.comments[publicationId] = updatedComments;
    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));

    setNewComment('');
    setIsSubmitting(false);
  }, [newComment, publication, comments, publicationId]);

  const handleDeletePublication = useCallback(() => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
      const stored = localStorage.getItem(MUR_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.publications && data.publications[publicationId]) delete data.publications[publicationId];
        if (data.list) data.list = data.list.filter((p: { id: number | string }) => p.id.toString() !== publicationId);
        localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
      }
      router.push('/communication/mur');
    }
    setShowActions(false);
  }, [router, publicationId]);

  const handleEditPublication = useCallback(() => {
    router.push(`/communication/mur/nouveau?edit=${publicationId}`);
    setShowActions(false);
  }, [router, publicationId]);

  const handleShare = useCallback((type: 'copy' | 'email') => {
    if (type === 'copy') {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié !');
    } else if (type === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(publication?.title || '')}&body=${encodeURIComponent(window.location.href)}`;
    }
    setShowShareMenu(false);
  }, [publication]);

  return {
    publication,
    loading,
    isLiked,
    likesCount,
    comments,
    newComment,
    setNewComment,
    isSubmitting,
    showActions,
    setShowActions,
    showShareMenu,
    setShowShareMenu,
    replyingTo,
    replyContent,
    setReplyContent,
    getCategoryColor,
    getCategoryLabel,
    getRoleBadge,
    formatDate,
    handleLike,
    handleLikeComment,
    handleReply,
    handleSubmitReply,
    handleCommentSubmit,
    handleDeletePublication,
    handleEditPublication,
    handleShare,
  };
}
