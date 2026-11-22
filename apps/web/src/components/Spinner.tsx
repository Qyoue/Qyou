import styles from './Spinner.module.css';

export function Spinner() {
  return <span className={`spinner ${styles.spinner}`} role="status" aria-label="Loading" />;
}
