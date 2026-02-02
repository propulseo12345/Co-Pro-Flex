import React from 'react';
import { Send, Eye, CheckCircle2, FileText, Trash2, Mail, Image } from 'lucide-react';

export function getStatusIcon(status: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    sent: <Send size={14} aria-hidden="true" />,
    opened: <Eye size={14} aria-hidden="true" />,
    received: <CheckCircle2 size={14} aria-hidden="true" />,
    draft: <FileText size={14} aria-hidden="true" />,
    deleted: <Trash2 size={14} aria-hidden="true" />
  };
  return icons[status] || <Mail size={14} aria-hidden="true" />;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    sent: 'Envoyé',
    opened: 'Lu par les destinataires',
    received: 'Reçu',
    draft: 'Brouillon',
    deleted: 'Dans la corbeille'
  };
  return labels[status] || 'Inconnu';
}

export function getFileIcon(mimeType: string): React.ReactNode {
  return mimeType.startsWith('image/')
    ? <Image size={24} aria-hidden="true" />
    : <FileText size={24} aria-hidden="true" />;
}
