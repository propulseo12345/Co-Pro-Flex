'use client';

import Link from 'next/link';
import type { DashboardTodo } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoPrioritesProps {
  todos: DashboardTodo[];
  hasTodos: boolean;
  hasMoreTodos: boolean;
  todosCount: number;
}

function getPriorityBarClass(priority: number): string {
  if (priority <= 1) return styles.priorityBarRed;
  if (priority <= 2) return styles.priorityBarAmber;
  return styles.priorityBarBlue;
}

function getPriorityBadgeClass(priority: number): string {
  if (priority <= 1) return styles.badgeRed;
  if (priority <= 2) return styles.badgeAmber;
  return styles.badgeBlue;
}

function getPriorityBtnClass(priority: number): string {
  if (priority <= 1) return styles.btnOutlineRed;
  if (priority <= 2) return styles.btnOutlineAmber;
  return styles.btnOutlineBlue;
}

export function BentoPriorites({ todos, hasTodos, hasMoreTodos, todosCount }: BentoPrioritesProps) {
  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.label}>À traiter maintenant</div>
      {hasTodos ? (
        <div className={styles.priorityItems}>
          {todos.map((todo, index) => (
            <div key={`${todo.todo_type}-${index}`} className={`${styles.miniCard} ${styles.priorityItem}`}>
              <div className={`${styles.priorityBar} ${getPriorityBarClass(todo.priority)}`} />
              <div className={styles.priorityContent}>
                <div className={styles.priorityTitle}>{todo.label}</div>
                {todo.context && (
                  <div className={styles.prioritySub}>{todo.context}</div>
                )}
              </div>
              <div className={styles.priorityRight}>
                {todo.deadline && (
                  <span className={`${styles.badge} ${getPriorityBadgeClass(todo.priority)}`}>
                    {todo.deadline}
                  </span>
                )}
                <Link
                  href={todo.deep_link}
                  className={`${styles.btn} ${getPriorityBtnClass(todo.priority)}`}
                >
                  {todo.action_label ?? 'Voir'}
                </Link>
              </div>
            </div>
          ))}
          {hasMoreTodos && (
            <Link href="/tasks" className={styles.actionLink} style={{ textAlign: 'center', padding: '8px', color: 'var(--primary)' }}>
              Voir les {todosCount} tâches →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--success)', fontSize: '14px' }}>
          Aucune action urgente — tout est sous contrôle.
        </div>
      )}
    </div>
  );
}
