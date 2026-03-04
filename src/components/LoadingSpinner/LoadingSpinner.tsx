import styles from './LoadingSpinner.module.css';

export function LoadingSpinner(): React.JSX.Element {
  return (
    <div className={styles['container']}>
      <div className={styles['spinner']} aria-hidden="true" />
      <p className={styles['text']}>Loading document...</p>
    </div>
  );
}
