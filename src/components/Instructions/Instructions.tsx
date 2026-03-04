import { useState } from 'react';
import styles from './Instructions.module.css';

interface InstructionsProps {
  readonly onSubmit: (url: string) => void;
}

export function Instructions({ onSubmit }: InstructionsProps): React.JSX.Element {
  const [url, setUrl] = useState('');

  function handleSubmit(): void {
    if (url.trim().length === 0) {
      return;
    }
    onSubmit(url.trim());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  return (
    <div className={styles['container']}>
      <h2 className={styles['heading']}>Skywords Newsletter Viewer</h2>
      <p className={styles['description']}>
        Paste a published Google Docs URL below to view it as a newsletter.
      </p>
      <input
        className={styles['input']}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://docs.google.com/document/d/e/.../pub"
        aria-label="Google Docs URL"
      />
      <br />
      <button className={styles['button']} onClick={handleSubmit} type="button">
        Load Newsletter
      </button>
      <p className={styles['hint']}>
        Example:{' '}
        <code className={styles['code']}>
          https://docs.google.com/document/d/e/2PACX-.../pub
        </code>
      </p>
    </div>
  );
}
