import { useEffect, useState } from 'react';
import type { DocData } from './types/DocData';
import type { Issue, Registry } from './types/Registry';
import { fetchGoogleDoc } from './services/fetchDoc';
import { parseGoogleDoc } from './services/docParser';
import { loadRegistry } from './services/registry';
import { loadFrozenDoc } from './services/frozenDoc';
import { checkPassword } from './services/passwordCheck';
import { getHashMode, setDocUrl, setIssueSlug } from './services/urlParams';
import { Header } from './components/Header/Header';
import { Instructions } from './components/Instructions/Instructions';
import { IssueIndex } from './components/IssueIndex/IssueIndex';
import { DocumentIndex } from './components/DocumentIndex/DocumentIndex';
import { SectionView } from './components/SectionView/SectionView';
import { PasswordGate } from './components/PasswordGate/PasswordGate';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage/ErrorMessage';
import styles from './App.module.css';

type AppState =
  | { readonly status: 'registry-loading' }
  | { readonly status: 'idle' }
  | { readonly status: 'index'; readonly registry: Registry }
  | { readonly status: 'password'; readonly registry: Registry; readonly issue: Issue; readonly passwordError: string | null }
  | { readonly status: 'loading'; readonly registry: Registry | null }
  | { readonly status: 'loaded'; readonly registry: Registry | null; readonly doc: DocData; readonly currentSection: number | null }
  | { readonly status: 'error'; readonly registry: Registry | null; readonly message: string };

function buildInitialState(): AppState {
  const mode = getHashMode();
  if (mode.kind === 'url') {
    return { status: 'loading', registry: null };
  }
  return { status: 'registry-loading' };
}

async function loadDoc(url: string): Promise<DocData> {
  const html = await fetchGoogleDoc(url);
  return parseGoogleDoc(html);
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function loadIssueDocAsync(issue: Issue): Promise<DocData> {
  if (issue.status === 'frozen') {
    return loadFrozenDoc(issue.slug);
  }
  return loadDoc(issue.docUrl);
}

export default function App(): React.JSX.Element {
  const [state, setState] = useState<AppState>(buildInitialState);

  useEffect(() => {
    const mode = getHashMode();

    if (mode.kind === 'url') {
      loadDoc(mode.url)
        .then((doc) => setState({ status: 'loaded', registry: null, doc, currentSection: null }))
        .catch((err: unknown) => setState({ status: 'error', registry: null, message: toErrorMessage(err) }));
      return;
    }

    loadRegistry()
      .then((registry) => {
        if (mode.kind !== 'issue') {
          setState(registry.issues.length === 0 ? { status: 'idle' } : { status: 'index', registry });
          return;
        }
        const issue = registry.issues.find((i) => i.slug === mode.slug);
        if (issue === undefined) {
          setState({ status: 'error', registry, message: `Issue "${mode.slug}" not found in registry` });
          return;
        }
        if (issue.status === 'pre-release') {
          setState({ status: 'password', registry, issue, passwordError: null });
          return;
        }
        loadIssueDocAsync(issue)
          .then((doc) => setState({ status: 'loaded', registry, doc, currentSection: null }))
          .catch((err: unknown) => setState({ status: 'error', registry, message: toErrorMessage(err) }));
      })
      .catch((err: unknown) => setState({ status: 'error', registry: null, message: toErrorMessage(err) }));
  }, []);

  function handleIssueSelect(slug: string): void {
    setIssueSlug(slug);
  }

  function handleUrlSubmit(url: string): void {
    setDocUrl(url);
  }

  function handlePasswordSubmit(candidate: string): void {
    if (state.status !== 'password') return;
    const { registry, issue } = state;
    checkPassword(candidate)
      .then((correct) => {
        if (!correct) {
          setState({ status: 'password', registry, issue, passwordError: 'Incorrect password. Please try again.' });
          return;
        }
        setState({ status: 'loading', registry });
        loadIssueDocAsync(issue)
          .then((doc) => setState({ status: 'loaded', registry, doc, currentSection: null }))
          .catch((err: unknown) => setState({ status: 'error', registry, message: toErrorMessage(err) }));
      })
      .catch((err: unknown) => {
        setState({ status: 'password', registry, issue, passwordError: toErrorMessage(err) });
      });
  }

  function handleBackToIndex(): void {
    if (state.status !== 'loaded' || state.registry === null) return;
    history.replaceState(null, '', window.location.pathname);
    setState({ status: 'index', registry: state.registry });
    window.scrollTo(0, 0);
  }

  function handleSectionSelect(index: number): void {
    setState((prev) => {
      if (prev.status !== 'loaded') return prev;
      return { ...prev, currentSection: index };
    });
    window.scrollTo(0, 0);
  }

  function handleHome(): void {
    setState((prev) => {
      if (prev.status !== 'loaded') return prev;
      return { ...prev, currentSection: null };
    });
    window.scrollTo(0, 0);
  }

  function handleBack(): void {
    setState((prev) => {
      if (prev.status !== 'loaded' || prev.currentSection === null) return prev;
      const next = prev.currentSection - 1;
      window.scrollTo(0, 0);
      return { ...prev, currentSection: next < 0 ? null : next };
    });
  }

  function handleNext(): void {
    setState((prev) => {
      if (prev.status !== 'loaded' || prev.currentSection === null) return prev;
      const next = prev.currentSection + 1;
      window.scrollTo(0, 0);
      return { ...prev, currentSection: next >= prev.doc.sections.length ? null : next };
    });
  }

  function handleRetry(): void {
    location.reload();
  }

  function renderContent(): React.JSX.Element {
    if (state.status === 'registry-loading' || state.status === 'loading') {
      return <LoadingSpinner />;
    }
    if (state.status === 'error') {
      return <ErrorMessage message={state.message} onRetry={handleRetry} />;
    }
    if (state.status === 'idle') {
      return <Instructions onSubmit={handleUrlSubmit} />;
    }
    if (state.status === 'index') {
      return <IssueIndex registry={state.registry} onIssueSelect={handleIssueSelect} />;
    }
    if (state.status === 'password') {
      return <PasswordGate onSubmit={handlePasswordSubmit} error={state.passwordError} />;
    }
    return renderLoadedContent();
  }

  function renderLoadedContent(): React.JSX.Element {
    if (state.status !== 'loaded') return <LoadingSpinner />;
    const backToIndex = state.registry !== null ? handleBackToIndex : undefined;
    if (state.currentSection === null) {
      return <DocumentIndex doc={state.doc} onSectionSelect={handleSectionSelect} onBackToIndex={backToIndex} />;
    }
    const section = state.doc.sections[state.currentSection];
    if (section === undefined) {
      return <DocumentIndex doc={state.doc} onSectionSelect={handleSectionSelect} onBackToIndex={backToIndex} />;
    }
    return <SectionView section={section} onBack={handleBack} onHome={handleHome} onNext={handleNext} />;
  }

  const headerTitle = state.status === 'loaded' ? state.doc.title : undefined;

  return (
    <>
      <Header title={headerTitle} />
      <main className={styles['main']}>{renderContent()}</main>
    </>
  );
}
