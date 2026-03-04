import type { DocData } from '../../types/DocData';
import styles from './DocumentIndex.module.css';

interface DocumentIndexProps {
  readonly doc: DocData;
  readonly onSectionSelect: (index: number) => void;
  readonly onBackToIndex: (() => void) | undefined;
}

export function DocumentIndex({ doc, onSectionSelect, onBackToIndex }: DocumentIndexProps): React.JSX.Element {
  return (
    <div className={styles['container']}>
      {onBackToIndex !== undefined && (
        <button className={styles['backLink']} onClick={onBackToIndex} type="button">
          Back to Issues
        </button>
      )}
      <h1 className={styles['title']}>{doc.title}</h1>
      <ul className={styles['list']}>
        {doc.sections.map((section, index) => (
          <li key={index} className={styles['item']}>
            <button
              className={styles['link']}
              onClick={() => onSectionSelect(index)}
              type="button"
            >
              {section.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
