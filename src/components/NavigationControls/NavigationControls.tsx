import styles from './NavigationControls.module.css';

interface NavigationControlsProps {
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onNext: () => void;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

export function NavigationControls({
  onBack,
  onHome,
  onNext,
  isFirst,
  isLast,
}: NavigationControlsProps): React.JSX.Element {
  return (
    <nav className={styles['nav']} aria-label="Section navigation">
      <button
        className={styles['button']}
        onClick={onBack}
        disabled={isFirst}
        type="button"
        aria-label="Previous section"
      >
        <i className="fa fa-arrow-left" aria-hidden="true" /> Back
      </button>
      <button
        className={styles['button']}
        onClick={onHome}
        type="button"
        aria-label="Return to index"
      >
        <i className="fa fa-home" aria-hidden="true" /> Home
      </button>
      <button
        className={styles['button']}
        onClick={onNext}
        disabled={isLast}
        type="button"
        aria-label="Next section"
      >
        Next <i className="fa fa-arrow-right" aria-hidden="true" />
      </button>
    </nav>
  );
}
