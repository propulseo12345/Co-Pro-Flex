'use client';

import Link from 'next/link';
import { AlertCircle, AlertTriangle, Clock, DollarSign, Users, Wrench, ChevronDown } from 'lucide-react';
import styles from '../../../app/(dashboard)/dashboard/dashboard.module.css';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  action: string;
  actionLink: string;
  category: string;
  dueDate: string;
}

interface DashboardTasksProps {
  tasks: Task[];
  showSecondaryTasks: boolean;
  onToggleSecondary: () => void;
}

export function DashboardTasks({ tasks, showSecondaryTasks, onToggleSecondary }: DashboardTasksProps) {
  const urgentTasks = tasks.filter(t => t.priority === 'high');
  const financeTasks = tasks.filter(t => t.category === 'Finance' && t.priority !== 'high');
  const agTasks = tasks.filter(t => t.category === 'Assemblées' && t.priority !== 'high');
  const maintenanceTasks = tasks.filter(t => t.category === 'Maintenance' && t.priority !== 'high');

  return (
    <div className={styles.mainColumn}>
      {urgentTasks.length > 0 && (
        <div className={styles.prioritySection}>
          <div className={styles.prioritySectionHeader}>
            <div className={styles.prioritySectionTitle}>
              <div className={`${styles.prioritySectionIcon} ${styles.iconUrgent}`}><AlertTriangle size={20} aria-hidden="true" /></div>
              <h2>Actions urgentes</h2>
            </div>
            <span className={`${styles.prioritySectionCount} ${styles.urgent}`}>{urgentTasks.length} urgent{urgentTasks.length > 1 ? 'es' : 'e'}</span>
          </div>
          <div className={styles.tasksList}>
            {urgentTasks.map((task) => (
              <div key={task.id} className={`${styles.taskCard} ${styles.priorityHigh}`}>
                <div className={styles.taskBody}>
                  <div className={styles.taskIcon}><AlertCircle size={24} aria-hidden="true" /></div>
                  <div className={styles.taskContent}>
                    <div className={styles.taskTitleRow}><h3 className={styles.taskTitle}>{task.title}</h3><span className={styles.urgentBadge}>Urgent</span></div>
                    <p className={styles.taskDesc}>{task.description}</p>
                  </div>
                </div>
                <div className={styles.taskActions}>
                  <Link href={task.actionLink} className="btn btn-primary btn-sm">{task.action}</Link>
                  <span className={styles.taskDueDate}><Clock size={14} aria-hidden="true" />{task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {financeTasks.length > 0 && (
        <div className={`${styles.themedGroup} ${styles.financeTheme}`}>
          <div className={styles.themedGroupHeader}><DollarSign aria-hidden="true" />Finance</div>
          <div className={styles.tasksList}>
            {financeTasks.map((task) => (
              <div key={task.id} className={styles.taskCardCompact}>
                <div className={styles.taskBody}>
                  <div className={styles.taskIcon}><DollarSign size={18} aria-hidden="true" /></div>
                  <div className={styles.taskContent}>
                    <div className={styles.taskTitleRow}><h3 className={styles.taskTitle}>{task.title}</h3>{task.dueDate === 'Cette semaine' && <span className={styles.thisWeekBadge}>À faire cette semaine</span>}</div>
                    <p className={styles.taskDesc}>{task.description}</p>
                  </div>
                </div>
                <div className={styles.taskActions}><Link href={task.actionLink} className="btn btn-primary btn-sm">{task.action}</Link></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {agTasks.length > 0 && (
        <div className={`${styles.themedGroup} ${styles.agTheme}`}>
          <div className={styles.themedGroupHeader}><Users aria-hidden="true" />Assemblées Générales</div>
          <div className={styles.tasksList}>
            {agTasks.map((task) => (
              <div key={task.id} className={styles.taskCardCompact}>
                <div className={styles.taskBody}>
                  <div className={styles.taskIcon}><Users size={18} aria-hidden="true" /></div>
                  <div className={styles.taskContent}><h3 className={styles.taskTitle}>{task.title}</h3><p className={styles.taskDesc}>{task.description}</p></div>
                </div>
                <div className={styles.taskActions}><Link href={task.actionLink} className="btn btn-primary btn-sm">{task.action}</Link></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {maintenanceTasks.length > 0 && (
        <>
          <button className={`${styles.seeMoreBtn} ${showSecondaryTasks ? styles.expanded : ''}`} onClick={onToggleSecondary}>
            <ChevronDown size={18} aria-hidden="true" />{showSecondaryTasks ? 'Masquer les autres tâches' : `Voir ${maintenanceTasks.length} autres tâches`}
          </button>
          <div className={`${styles.collapsibleContent} ${!showSecondaryTasks ? styles.collapsed : ''}`}>
            <div className={`${styles.themedGroup} ${styles.maintenanceTheme}`}>
              <div className={styles.themedGroupHeader}><Wrench aria-hidden="true" />Maintenance</div>
              <div className={styles.tasksList}>
                {maintenanceTasks.map((task) => (
                  <div key={task.id} className={styles.taskCardCompact}>
                    <div className={styles.taskBody}>
                      <div className={styles.taskIcon}><Wrench size={18} aria-hidden="true" /></div>
                      <div className={styles.taskContent}><h3 className={styles.taskTitle}>{task.title}</h3><p className={styles.taskDesc}>{task.description}</p></div>
                    </div>
                    <div className={styles.taskActions}><Link href={task.actionLink} className="btn btn-primary btn-sm">{task.action}</Link></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
