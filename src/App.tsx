import { useEffect, useState } from 'react';
import type { DocData } from './types/DocData';
import { fetchGoogleDoc } from './services/fetchDoc';
import { parseGoogleDoc } from './services/docParser';
import { getDocUrl, setDocUrl } from './services/urlParams';
import { Header } from './components/Header/Header';
import { Instructions } from './components/Instructions/Instructions';
import { DocumentIndex } from './components/DocumentIndex/DocumentIndex';
import { SectionView } from './components/SectionView/SectionView';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage/ErrorMessage';
import styles from './App.module.css';

type AppStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AppState {
  readonly status: AppStatus;
  readonly doc: DocData | null;
  readonly error: string | null;
  readonly currentSection: number | null;
}

function buildInitialState(): AppState {
  const url = getDocUrl();
  return {
    status: url === null ? 'idle' : 'loading',
    doc: null,
    error: null,
    currentSection: null,
  };
}

async function loadDoc(url: string): Promise<DocData> {
  const html = await fetchGoogleDoc(url);
  return parseGoogleDoc(html);
}

export default function App(): React.JSX.Element {
  const [state, setState] = useState<AppState>(buildInitialState);

  useEffect(() => {
    const url = getDocUrl();
    if (url === null) {
      return;
    }

    loadDoc(url)
      .then((doc) => {
        setState({
          status: 'loaded',
          doc,
          error: null,
          currentSection: null,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setState({
          status: 'error',
          doc: null,
          error: message,
          currentSection: null,
        });
      });
  }, []);

  function handleUrlSubmit(url: string): void {
    setDocUrl(url);
  }

  function handleSectionSelect(index: number): void {
    setState((prev) => ({ ...prev, currentSection: index }));
    window.scrollTo(0, 0);
  }

  function handleHome(): void {
    setState((prev) => ({ ...prev, currentSection: null }));
    window.scrollTo(0, 0);
  }

  function handleBack(): void {
    setState((prev) => {
      if (prev.currentSection === null) return prev;
      const next = prev.currentSection - 1;
      window.scrollTo(0, 0);
      return { ...prev, currentSection: next < 0 ? null : next };
    });
  }

  function handleNext(): void {
    setState((prev) => {
      if (prev.currentSection === null || prev.doc === null) return prev;
      const next = prev.currentSection + 1;
      window.scrollTo(0, 0);
      return {
        ...prev,
        currentSection: next >= prev.doc.sections.length ? null : next,
      };
    });
  }

  function handleRetry(): void {
    const url = getDocUrl();
    if (url === null) {
      setState((prev) => ({ ...prev, status: 'idle', error: null }));
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    loadDoc(url)
      .then((doc) => {
        setState({
          status: 'loaded',
          doc,
          error: null,
          currentSection: null,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setState({
          status: 'error',
          doc: null,
          error: message,
          currentSection: null,
        });
      });
  }

  function renderContent(): React.JSX.Element {
    if (state.status === 'idle') {
      return <Instructions onSubmit={handleUrlSubmit} />;
    }

    if (state.status === 'loading') {
      return <LoadingSpinner />;
    }

    if (state.status === 'error') {
      const message = state.error ?? 'An unknown error occurred.';
      return <ErrorMessage message={message} onRetry={handleRetry} />;
    }

    if (state.doc === null) {
      return <LoadingSpinner />;
    }

    if (state.currentSection === null) {
      return (
        <DocumentIndex doc={state.doc} onSectionSelect={handleSectionSelect} onBackToIndex={undefined} />
      );
    }

    const section = state.doc.sections[state.currentSection];
    if (section === undefined) {
      return (
        <DocumentIndex doc={state.doc} onSectionSelect={handleSectionSelect} onBackToIndex={undefined} />
      );
    }

    return (
      <SectionView
        section={section}
        onBack={handleBack}
        onHome={handleHome}
        onNext={handleNext}
      />
    );
  }

  return (
    <>
      <Header />
      <main className={styles['main']}>{renderContent()}</main>
    </>
  );
}
