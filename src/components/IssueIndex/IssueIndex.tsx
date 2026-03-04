import type { Registry } from '../../types/Registry';
import styles from './IssueIndex.module.css';

interface IssueIndexProps {
  readonly registry: Registry;
  readonly onIssueSelect: (slug: string) => void;
}

export function IssueIndex({ registry, onIssueSelect }: IssueIndexProps): React.JSX.Element {
  const issues = [...registry.issues].reverse();

  return (
    <div className={styles['container']}>
      <h1 className={styles['heading']}>Skywords Newsletter</h1>
      <ul className={styles['list']}>
        {issues.map((issue) => (
          <li key={issue.slug} className={styles['item']}>
            <button
              className={styles['link']}
              onClick={() => onIssueSelect(issue.slug)}
              type="button"
            >
              {issue.title}
              {issue.status === 'pre-release' && (
                <span className={styles['badge']}>Preview</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
