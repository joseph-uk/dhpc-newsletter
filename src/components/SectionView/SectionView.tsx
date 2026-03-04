import type { Section } from '../../types/DocData';
import { NavigationControls } from '../NavigationControls/NavigationControls';
import styles from './SectionView.module.css';

interface SectionViewProps {
  readonly section: Section;
  readonly sectionIndex: number;
  readonly totalSections: number;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onNext: () => void;
}

export function SectionView({
  section,
  sectionIndex,
  totalSections,
  onBack,
  onHome,
  onNext,
}: SectionViewProps): React.JSX.Element {
  return (
    <article className={styles['article']}>
      <h1 className={styles['sectionTitle']}>{section.title}</h1>
      {section.content.length > 0 && (
        <div
          className={styles['sectionContent']}
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      )}
      {section.subsections.map((sub, idx) => (
        <section key={idx}>
          <h2 className={styles['subsectionTitle']}>{sub.title}</h2>
          <div
            className={styles['subsectionContent']}
            dangerouslySetInnerHTML={{ __html: sub.content }}
          />
        </section>
      ))}
      <NavigationControls
        onBack={onBack}
        onHome={onHome}
        onNext={onNext}
        isFirst={sectionIndex === 0}
        isLast={sectionIndex === totalSections - 1}
      />
    </article>
  );
}
