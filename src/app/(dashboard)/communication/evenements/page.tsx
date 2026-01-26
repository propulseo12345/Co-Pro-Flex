'use client';

import Link from 'next/link';
import { Calendar, Plus, Clock, Download, Send, List, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useEventsPage } from '@/features/communication/hooks';
import { EventCard, CalendarView } from '@/features/communication/components';
import styles from './evenements.module.css';

export default function EvenementsPage() {
  const page = useEventsPage();

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendrier</h1>
          <p className={styles.subtitle}>
            Agenda de la vie de la copropriété - AG, réunions, interventions, travaux et plus encore
          </p>
        </div>
        <div className={styles.actions}>
          <div className={styles.viewToggle}>
            <button className={clsx(styles.toggleBtn, page.viewMode === 'calendar' && styles.toggleBtnActive)} onClick={() => page.setViewMode('calendar')} title="Vue calendrier">
              <Calendar size={18} aria-hidden="true" />
            </button>
            <button className={clsx(styles.toggleBtn, page.viewMode === 'list' && styles.toggleBtnActive)} onClick={() => page.setViewMode('list')} title="Vue liste">
              <List size={18} aria-hidden="true" />
            </button>
          </div>
          <Link href="/communication/evenements/nouveau" className="btn btn-primary">
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Nouvel événement
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        {page.categories.map((cat) => (
          <button
            key={cat.id}
            className={clsx(styles.filterBtn, page.selectedCategory === cat.id && styles.active)}
            style={{ borderColor: page.selectedCategory === cat.id ? cat.color : 'var(--border-color)', background: page.selectedCategory === cat.id ? cat.color : 'white', color: page.selectedCategory === cat.id ? 'white' : 'var(--text-secondary)' }}
            onClick={() => page.setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {page.viewMode === 'list' ? (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Calendar size={18} aria-hidden="true" />
              Événements à venir ({page.upcomingEvents.length})
            </h2>
            <div className={styles.eventsList}>
              {page.upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} getCategoryColor={page.getCategoryColor} getCategoryLabel={page.getCategoryLabel} />
              ))}
              {page.upcomingEvents.length === 0 && (
                <div className={styles.emptyState}>
                  <AlertCircle size={48} aria-hidden="true" />
                  <p>Aucun événement à venir</p>
                </div>
              )}
            </div>
          </div>

          {page.pastEvents.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Clock size={18} aria-hidden="true" />
                Événements passés ({page.pastEvents.length})
              </h2>
              <div className={styles.eventsList}>
                {page.pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} getCategoryColor={page.getCategoryColor} getCategoryLabel={page.getCategoryLabel} isPast />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <CalendarView events={page.filteredEvents} currentMonth={page.currentMonth} setCurrentMonth={page.setCurrentMonth} />
      )}

      <div className={styles.quickActions}>
        <button className="btn btn-secondary" onClick={page.handleExportICS}>
          <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Exporter au format ICS
        </button>
        <button className="btn btn-secondary" onClick={page.handleExportPDF}>
          <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Exporter en PDF
        </button>
        <button className="btn btn-secondary" onClick={page.handleSendGroupInvitations}>
          <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Envoyer invitations groupées
        </button>
      </div>
    </div>
  );
}
