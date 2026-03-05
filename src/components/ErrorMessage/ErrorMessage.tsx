import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  readonly message: string;
  readonly onRetry: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps): React.JSX.Element {
  return (
    <div className={styles['container']}>
      <i className="fa fa-exclamation-triangle fa-3x" aria-hidden="true" />
      <p className={styles['message']}>{message}</p>
      <button className={styles['retryButton']} onClick={onRetry} type="button">
        Try Again
      </button>
      <p className={styles['altLink']}>
        <a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer">Enter a different URL</a>
      </p>
    </div>
  );
}
