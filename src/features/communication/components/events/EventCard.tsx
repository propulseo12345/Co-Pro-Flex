'use client';

import Link from 'next/link';
import { Clock, MapPin, User, CheckCircle2, XCircle, Send } from 'lucide-react';
import clsx from 'clsx';
import type { Event } from '../../types';
import styles from '../../../../app/(dashboard)/communication/evenements/evenements.module.css';

interface EventCardProps {
  event: Event;
  getCategoryColor: (cat: string) => string;
  getCategoryLabel: (cat: string) => string;
  isPast?: boolean;
}

export function EventCard({ event, getCategoryColor, getCategoryLabel, isPast = false }: EventCardProps) {
  const categoryColor = getCategoryColor(event.category);
  const categoryLabel = getCategoryLabel(event.category);

  const handleSendReminder = () => {
    const pending = event.participants.pending;
    if (pending > 0) {
      alert(`Relance envoyée à ${pending} participant(s) en attente pour "${event.title}"`);
    } else {
      alert('Tous les participants ont déjà répondu.');
    }
  };

  return (
    <div className={clsx(styles.eventCard, isPast && styles.pastEvent)}>
      <Link href={`/communication/evenements/${event.id}`} className={styles.eventDate} style={{ background: categoryColor }}>
        <span className={styles.dateDay}>{new Date(event.date).getDate()}</span>
        <span className={styles.dateMonth}>
          {new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
      </Link>

      <Link href={`/communication/evenements/${event.id}`} className={styles.eventContent}>
        <div className={styles.eventHeader}>
          <div>
            <h3 className={styles.eventTitle}>{event.title}</h3>
            <span className={styles.categoryBadge} style={{ background: `${categoryColor}20`, color: categoryColor }}>
              {categoryLabel}
            </span>
          </div>
        </div>

        <p className={styles.eventDescription}>{event.description}</p>

        <div className={styles.eventMeta}>
          <div className={styles.metaItem}>
            <Clock size={14} aria-hidden="true" />
            {event.time}
            {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('fr-FR')}`}
          </div>
          <div className={styles.metaItem}>
            <MapPin size={14} aria-hidden="true" />
            {event.location}
          </div>
          <div className={styles.metaItem}>
            <User size={14} aria-hidden="true" />
            {event.organizer}
          </div>
        </div>

        {event.hasInvitations && (
          <div className={styles.participants}>
            <div className={styles.participantStat}>
              <CheckCircle2 size={14} className={styles.iconConfirmed} aria-hidden="true" />
              {event.participants.confirmed} confirmés
            </div>
            <div className={styles.participantStat}>
              <XCircle size={14} className={styles.iconDeclined} aria-hidden="true" />
              {event.participants.declined} déclinés
            </div>
            <div className={styles.participantStat}>
              <Clock size={14} className={styles.iconPending} aria-hidden="true" />
              {event.participants.pending} en attente
            </div>
          </div>
        )}
      </Link>

      <div className={styles.eventActions}>
        {!isPast && event.hasInvitations && (
          <button className={styles.actionBtn} title="Envoyer des relances" onClick={handleSendReminder}>
            <Send size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
