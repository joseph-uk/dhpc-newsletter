import type { DocData } from '../../types/DocData';
import styles from './DocumentIndex.module.css';

interface DocumentIndexProps {
  readonly doc: DocData;
  readonly onSectionSelect: (index: number) => void;
}

export function DocumentIndex({ doc, onSectionSelect }: DocumentIndexProps): React.JSX.Element {
  return (
    <div className={styles['container']}>
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
