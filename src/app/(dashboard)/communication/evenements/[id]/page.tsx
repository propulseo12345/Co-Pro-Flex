'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, User, Users, CheckCircle2, XCircle, Edit, Trash2, Share2, MoreVertical, Bell, Paperclip, MessageCircle, AlertCircle, Download } from 'lucide-react';
import clsx from 'clsx';
import { useEventDetailPage } from '@/features/communication/hooks';
import styles from './event-detail.module.css';

export default function EventDetailPage() {
  const params = useParams();
  const page = useEventDetailPage({ eventId: params.id as string });

  if (page.loading) {
    return <div className="container"><div className={styles.notFound}><p>Chargement...</p></div></div>;
  }

  if (!page.event) {
    return (
      <div className="container">
        <div className={styles.notFound}>
          <AlertCircle size={48} aria-hidden="true" />
          <h2>Événement introuvable</h2>
          <p>Cet événement n'existe pas ou a été supprimé.</p>
          <Link href="/communication/evenements" className="btn btn-primary">Retour aux événements</Link>
        </div>
      </div>
    );
  }

  const categoryInfo = page.getCategoryInfo(page.event.category);

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={page.goBack} className={styles.backBtn}><ArrowLeft size={20} aria-hidden="true" />Retour</button>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn}><Share2 size={18} /></button>
          <div className={styles.menuWrapper}>
            <button className={styles.iconBtn} onClick={() => page.setShowActions(!page.showActions)}><MoreVertical size={18} aria-hidden="true" /></button>
            {page.showActions && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={page.handleEdit}><Edit size={16} aria-hidden="true" />Modifier</button>
                <button className={clsx(styles.dropdownItem, styles.danger)} onClick={page.handleDelete}><Trash2 size={16} aria-hidden="true" />Supprimer</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div className={styles.dateBox} style={{ background: categoryInfo.color }}>
                <span className={styles.dateDay}>{new Date(page.event.date).getDate()}</span>
                <span className={styles.dateMonth}>{new Date(page.event.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                <span className={styles.dateYear}>{new Date(page.event.date).getFullYear()}</span>
              </div>
              <div className={styles.eventInfo}>
                <span className={styles.categoryBadge} style={{ background: `${categoryInfo.color}15`, color: categoryInfo.color }}>{categoryInfo.label}</span>
                <h1 className={styles.title}>{page.event.title}</h1>
                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}><Clock size={16} aria-hidden="true" /><span>{page.event.time}{page.event.endTime && ` - ${page.event.endTime}`}</span></div>
                  {page.event.endDate && <div className={styles.metaItem}><Calendar size={16} aria-hidden="true" /><span>Jusqu'au {new Date(page.event.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>}
                  <div className={styles.metaItem}><MapPin size={16} aria-hidden="true" /><span>{page.event.location}</span></div>
                  <div className={styles.metaItem}><User size={16} aria-hidden="true" /><span>{page.event.organizer}</span></div>
                </div>
              </div>
            </div>

            {page.event.hasInvitations && !page.event.isPast && (
              <div className={styles.rsvpSection}>
                <h3 className={styles.sectionTitle}>Votre réponse</h3>
                <div className={styles.rsvpButtons}>
                  <button className={clsx(styles.rsvpBtn, styles.rsvpConfirm, page.event.userStatus === 'confirmed' && styles.active)} onClick={() => page.handleRSVP('confirmed')}><CheckCircle2 size={18} aria-hidden="true" />Je participe</button>
                  <button className={clsx(styles.rsvpBtn, styles.rsvpDecline, page.event.userStatus === 'declined' && styles.active)} onClick={() => page.handleRSVP('declined')}><XCircle size={18} aria-hidden="true" />Je ne peux pas</button>
                </div>
                {page.event.userStatus === 'confirmed' && <p className={styles.rsvpConfirmation}><CheckCircle2 size={14} aria-hidden="true" />Votre participation est confirmée</p>}
              </div>
            )}

            <div className={styles.description}>
              <h3 className={styles.sectionTitle}>Description</h3>
              <div className={styles.descriptionContent}>
                {page.event.fullDescription.split('\n').map((paragraph, index) => {
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) return <h4 key={index} className={styles.subtitle}>{paragraph.replace(/\*\*/g, '')}</h4>;
                  if (paragraph.match(/^\d+\./)) return <li key={index} className={styles.listItem}>{paragraph}</li>;
                  if (paragraph.startsWith('- ')) return <li key={index} className={styles.listItem}>{paragraph.substring(2)}</li>;
                  return paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />;
                })}
              </div>
            </div>

            {page.event.attachments.length > 0 && (
              <div className={styles.attachments}>
                <h3 className={styles.sectionTitle}><Paperclip size={18} aria-hidden="true" />Documents ({page.event.attachments.length})</h3>
                <div className={styles.attachmentList}>
                  {page.event.attachments.map((file, index) => (
                    <button key={index} className={styles.attachmentItem} onClick={() => page.handleDownloadAttachment(file.name)} title={`Télécharger ${file.name}`}>
                      <div className={styles.attachmentIcon}><Paperclip size={16} aria-hidden="true" /></div>
                      <div className={styles.attachmentInfo}><span className={styles.attachmentName}>{file.name}</span><span className={styles.attachmentSize}>{file.size}</span></div>
                      <Download size={16} className={styles.downloadIcon} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.commentsSection}>
            <h3 className={styles.sectionTitle}><MessageCircle size={18} aria-hidden="true" />Discussion</h3>
            <div className={styles.comingSoon}><AlertCircle size={24} aria-hidden="true" /><p>Fonctionnalité à venir</p><span>La discussion sur les événements sera bientôt disponible</span></div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          {page.event.hasInvitations && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}><Users size={18} aria-hidden="true" />Participants</h3>
              <div className={styles.participantStats}>
                <div className={styles.statItem}><CheckCircle2 size={16} className={styles.iconConfirmed} aria-hidden="true" /><span>{page.confirmedCount} confirmés</span></div>
                <div className={styles.statItem}><XCircle size={16} className={styles.iconDeclined} aria-hidden="true" /><span>{page.declinedCount} déclinés</span></div>
                <div className={styles.statItem}><Clock size={16} className={styles.iconPending} aria-hidden="true" /><span>{page.pendingCount} en attente</span></div>
              </div>
              <div className={styles.participantList}>
                {page.event.participants.map((participant) => (
                  <div key={participant.id} className={styles.participant}>
                    <div className={styles.participantAvatar}><User size={14} aria-hidden="true" /></div>
                    <div className={styles.participantInfo}><span className={styles.participantName}>{participant.name}</span><span className={styles.participantRole}>{participant.role}</span></div>
                    <span className={clsx(styles.statusIcon, styles[`status${participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}`])}>
                      {participant.status === 'confirmed' && <CheckCircle2 size={14} aria-hidden="true" />}
                      {participant.status === 'declined' && <XCircle size={14} aria-hidden="true" />}
                      {participant.status === 'pending' && <Clock size={14} aria-hidden="true" />}
                    </span>
                  </div>
                ))}
              </div>
              {page.event.participants.length > 5 && <button className={styles.showMore}>Voir tous les participants</button>}
            </div>
          )}

          {page.event.reminders.length > 0 && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}><Bell size={18} aria-hidden="true" />Rappels configurés</h3>
              <div className={styles.reminderList}>
                {page.event.reminders.map((reminder, index) => (<div key={index} className={styles.reminderItem}><Clock size={14} aria-hidden="true" />{reminder}</div>))}
              </div>
            </div>
          )}

          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Actions rapides</h3>
            <div className={styles.quickActions}>
              <button className="btn btn-secondary btn-block" onClick={page.handleExportICS}><Download size={16} aria-hidden="true" />Exporter ICS</button>
              <button className="btn btn-secondary btn-block" onClick={page.handleShare}><Share2 size={16} />Partager</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
