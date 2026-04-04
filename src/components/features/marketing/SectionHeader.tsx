import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  label?: string;
  labelColor?: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export function SectionHeader({ label, labelColor, title, description, centered = true }: SectionHeaderProps) {
  return (
    <div className={`${styles.header} ${centered ? styles.centered : ''}`}>
      {label && (
        <span
          className={styles.label}
          style={labelColor ? { '--label-color': labelColor } as React.CSSProperties : undefined}
        >
          {label}
        </span>
      )}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
