// Types for Events (Evenements)
// DB enums: ag, reunion_cs, travaux, intervention, fete, autre
export type EventCategory = string;

export interface EventParticipantStats {
  confirmed: number;
  declined: number;
  pending: number;
}

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  endDate?: string;
  time: string;
  location: string;
  organizer: string;
  description: string;
  participants: EventParticipantStats;
  hasInvitations: boolean;
  isPast: boolean;
}

export interface Participant {
  id: string;
  name: string;
  status: 'confirmed' | 'declined' | 'pending';
  role: string;
}

export interface EventDetail extends Omit<Event, 'participants'> {
  endTime?: string;
  organizerRole: 'syndic' | 'conseil' | 'copropriétaire';
  fullDescription: string;
  participants: Participant[];
  attachments: { name: string; size: string }[];
  userStatus?: 'confirmed' | 'declined' | 'pending';
  reminders: string[];
}

export interface CategoryInfo {
  id: string;
  label: string;
  color: string;
}

// Types for Wall (Mur)
// DB enums: information, urgent, question, event, other
export type PublicationCategory = string;
export type AuthorRole = string;

export interface Publication {
  id: string;
  author: string;
  authorRole: AuthorRole;
  title: string;
  content: string;
  category: PublicationCategory;
  date: string;
  isPinned: boolean;
  isLocked: boolean;
  likes: number;
  comments: number;
  hasAttachment: boolean;
  tags?: string[];
  isLikedByMe?: boolean;
}

export interface PublicationDraft extends Publication {
  isDraft: boolean;
}

export interface Comment {
  id: string;
  author: string;
  authorRole: AuthorRole;
  content: string;
  date: string;
  likes: number;
  isLiked: boolean;
  parentId?: string | null;
}

export interface PublicationDetail extends Omit<Publication, 'comments'> {
  isLiked: boolean;
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'document';
  url?: string;
}

export interface RoleBadge {
  label: string;
  color: string;
}

// Shared types
export type InvitationType = 'all' | 'cs' | 'custom';
export type VisibilityType = 'tous' | 'conseil' | 'etage';

export interface Organizer {
  id: string;
  name: string;
  role: string;
}

export interface Coproprietaire {
  id: string;
  name: string;
  lot: string;
  email: string;
}

// Category mappings (DB enum -> UI label)
export const WALL_CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  information: { label: 'Information', color: '#10b981' },
  urgent: { label: 'Urgent', color: '#ef4444' },
  question: { label: 'Question', color: '#8b5cf6' },
  event: { label: 'Événement', color: '#3b82f6' },
  other: { label: 'Autre', color: '#6b7280' },
};

export const EVENT_TYPE_MAP: Record<string, { label: string; color: string }> = {
  ag: { label: 'Assemblée Générale', color: '#4f46e5' },
  reunion_cs: { label: 'Réunion CS', color: '#0284c7' },
  travaux: { label: 'Travaux', color: '#f59e0b' },
  intervention: { label: 'Intervention', color: '#ef4444' },
  fete: { label: 'Fête', color: '#8b5cf6' },
  autre: { label: 'Autre', color: '#6b7280' },
};
