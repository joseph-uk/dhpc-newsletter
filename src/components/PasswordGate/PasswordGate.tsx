import { useState } from 'react';
import styles from './PasswordGate.module.css';

interface PasswordGateProps {
  readonly onSubmit: (password: string) => void;
  readonly error: string | null;
}

export function PasswordGate({ onSubmit, error }: PasswordGateProps): React.JSX.Element {
  const [password, setPassword] = useState('');

  function handleSubmit(): void {
    if (password.trim().length === 0) {
      return;
    }
    onSubmit(password.trim());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  return (
    <div className={styles['container']}>
      <h2 className={styles['heading']}>Preview Issue</h2>
      <p className={styles['description']}>
        This issue is not yet published. Enter the preview password to continue.
      </p>
      <input
        className={styles['input']}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Preview password"
        autoComplete="current-password"
      />
      <br />
      <button className={styles['button']} onClick={handleSubmit} type="button">
        Unlock
      </button>
      {error !== null && (
        <p className={styles['error']} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
