'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, User, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Event } from '../../types';
import styles from '../../../../app/(dashboard)/communication/evenements/evenements.module.css';

interface CalendarViewProps {
  events: Event[];
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

export function CalendarView({ events, currentMonth, setCurrentMonth }: CalendarViewProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const handleCreateEvent = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    router.push(`/communication/evenements/nouveau?date=${dateStr}`);
  };

  const handleEventClick = (event: Event) => {
    router.push(`/communication/evenements/${event.id}`);
  };

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToToday = () => setCurrentMonth(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      if (event.date === dateStr) return true;
      if (event.endDate) return dateStr >= event.date && dateStr <= event.endDate;
      return false;
    });
  };

  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = { ag: '#4f46e5', reunion: '#0284c7', fete: '#8b5cf6', travaux: '#f59e0b', collecte: '#10b981' };
    return colors[category] || '#6b7280';
  };

  return (
    <div className={styles.calendarView}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarNavLeft}>
          <button onClick={previousMonth} className={styles.navBtn} aria-label="Précédent"><ChevronLeft size={20} aria-hidden="true" /></button>
          <button onClick={nextMonth} className={styles.navBtn} aria-label="Suivant"><ChevronRight size={20} aria-hidden="true" /></button>
          <button onClick={goToToday} className={styles.todayBtn}>Aujourd'hui</button>
        </div>
        <h3 className={styles.calendarMonth}>
          {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
        <div className={styles.calendarLegend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#4f46e5' }}></span>AG</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#0284c7' }}></span>Réunion</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#8b5cf6' }}></span>Fête</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f59e0b' }}></span>Travaux</span>
        </div>
      </div>

      <div className={styles.calendarTableWrapper}>
        <div className={styles.calendarWeekHeader}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className={styles.weekDay}>{day}</div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isTodayCell = day ? isToday(day) : false;
            const isHovered = day === hoveredDay;

            return (
              <div key={index} className={clsx(styles.calendarCell, !day && styles.emptyCell, isTodayCell && styles.todayCell)} onMouseEnter={() => day && setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)}>
                {day && (
                  <>
                    <div className={styles.dayHeader}>
                      <span className={clsx(styles.dayNumber, isTodayCell && styles.todayNumber)}>{day}</span>
                      <button className={clsx(styles.addEventBtn, isHovered && styles.addEventBtnVisible)} onClick={() => handleCreateEvent(day)} title={`Créer un événement le ${day}`} aria-label={`Créer un événement le ${day}`}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className={styles.cellEvents}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <button key={event.id} className={styles.cellEvent} style={{ background: getCategoryColor(event.category), borderLeft: `3px solid ${getCategoryColor(event.category)}` }} onClick={() => handleEventClick(event)} title={`${event.title} - ${event.time}`}>
                          <span className={styles.eventTime}>{event.time}</span>
                          <span className={styles.eventName}>{event.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <button className={styles.moreEvents} onClick={() => setSelectedEvent(dayEvents[0])}>+{dayEvents.length - 3} autres</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedEvent && (
        <div className={styles.eventModal} onClick={() => setSelectedEvent(null)}>
          <div className={styles.eventModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.eventModalHeader} style={{ background: getCategoryColor(selectedEvent.category) }}>
              <h3>{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)} className={styles.closeBtn}>
                <XCircle size={24} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.eventModalBody}>
              <div className={styles.modalInfo}>
                <Calendar size={16} aria-hidden="true" />
                <span>
                  {new Date(selectedEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.date && (
                    <> au {new Date(selectedEvent.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  )}
                </span>
              </div>
              <div className={styles.modalInfo}><Clock size={16} aria-hidden="true" /><span>{selectedEvent.time}</span></div>
              <div className={styles.modalInfo}><MapPin size={16} aria-hidden="true" /><span>{selectedEvent.location}</span></div>
              <div className={styles.modalInfo}><User size={16} aria-hidden="true" /><span>{selectedEvent.organizer}</span></div>
              <p className={styles.modalDescription}>{selectedEvent.description}</p>
              {selectedEvent.hasInvitations && (
                <div className={styles.modalParticipants}>
                  <div className={styles.participantItem}><CheckCircle2 size={16} className={styles.iconConfirmed} aria-hidden="true" />{selectedEvent.participants.confirmed} confirmés</div>
                  <div className={styles.participantItem}><XCircle size={16} className={styles.iconDeclined} aria-hidden="true" />{selectedEvent.participants.declined} déclinés</div>
                  <div className={styles.participantItem}><Clock size={16} className={styles.iconPending} aria-hidden="true" />{selectedEvent.participants.pending} en attente</div>
                </div>
              )}
              <div className={styles.modalActions}>
                <Link href={`/communication/evenements/${selectedEvent.id}`} className="btn btn-primary">Voir les détails</Link>
                <button onClick={() => setSelectedEvent(null)} className="btn btn-secondary">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
