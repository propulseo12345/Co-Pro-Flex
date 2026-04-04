import Link from 'next/link';
import styles from './CtaBanner.module.css';

interface CtaBannerProps {
  text: string;
  buttonText: string;
  buttonHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}

export function CtaBanner({
  text,
  buttonText,
  buttonHref = '/contact',
  secondaryText,
  secondaryHref,
}: CtaBannerProps) {
  return (
    <section className={styles.banner}>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <Link href={buttonHref} className={styles.button}>
          {buttonText}
        </Link>
        {secondaryText && secondaryHref && (
          <Link href={secondaryHref} className={styles.secondaryButton}>
            {secondaryText}
          </Link>
        )}
      </div>
    </section>
  );
}
