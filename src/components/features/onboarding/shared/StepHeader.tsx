import styles from './StepHeader.module.css';

interface StepHeaderProps {
  title: string;
  description: string;
  count?: string;
}

export function StepHeader({ title, description, count }: StepHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.topLine}>
        <h2 className={styles.title}>{title}</h2>
        {count && <span className={styles.count}>{count}</span>}
      </div>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
