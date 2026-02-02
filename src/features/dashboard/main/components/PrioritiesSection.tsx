'use client';

import Link from 'next/link';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { getPriorityIcon, type DashboardTodo } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface PrioritiesSectionProps {
  todos: DashboardTodo[];
  hasTodos: boolean;
  hasMoreTodos: boolean;
  todosCount: number;
}

export function PrioritiesSection({
  todos,
  hasTodos,
  hasMoreTodos,
  todosCount,
}: PrioritiesSectionProps) {
  return (
    <section className={styles.prioritiesSection}>
      <h2 className={styles.sectionTitle}>À faire maintenant</h2>

      {hasTodos ? (
        <>
          <ul className={styles.prioritiesList}>
            {todos.map((todo: DashboardTodo, index: number) => (
              <li key={`${todo.todo_type}-${index}`}>
                <Link href={todo.deep_link} className={styles.priorityItem}>
                  <span className={styles.priorityIcon}>{getPriorityIcon(todo.priority)}</span>
                  <span className={styles.priorityLabel}>{todo.label}</span>
                  <ChevronRight size={16} className={styles.priorityArrow} />
                </Link>
              </li>
            ))}
          </ul>
          {hasMoreTodos && (
            <Link href="/tasks" className={styles.viewAllLink}>
              Voir toutes les tâches ({todosCount})
            </Link>
          )}
        </>
      ) : (
        <div className={styles.noPriorities}>
          <CheckCircle2 size={32} className={styles.checkIcon} />
          <p>Aucune action urgente. Tout est sous contrôle.</p>
        </div>
      )}
    </section>
  );
}
