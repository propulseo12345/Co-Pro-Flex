// Types for Events (Evenements)
export type EventCategory = 'reunion' | 'fete' | 'travaux' | 'collecte' | 'ag';

export interface EventParticipantStats {
  confirmed: number;
  declined: number;
  pending: number;
}

export interface Event {
  id: number;
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
  id: number;
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
export type PublicationCategory = 'travaux' | 'social' | 'securite' | 'evenements' | 'annonce';
export type AuthorRole = 'syndic' | 'copropriétaire' | 'conseil';

export interface Publication {
  id: number;
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
