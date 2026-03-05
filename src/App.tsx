import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocData } from './types/DocData';
import type { Issue, Registry } from './types/Registry';
import { fetchGoogleDoc } from './services/fetchDoc';
import { parseGoogleDoc } from './services/docParser';
import { loadRegistry } from './services/registry';
import { loadFrozenDoc } from './services/frozenDoc';
import { checkPassword } from './services/passwordCheck';
import { getCurrentRoute, navigateTo, buildPath, getBasePath, slugify, findArticleIndex, redirectHashUrls } from './services/router';
import type { Route } from './services/router';
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

function resolveArticleSection(doc: DocData, articleSlug: string): number | null {
  const index = findArticleIndex(doc.sections, articleSlug);
  return index !== undefined ? index : null;
}

export default function App(): React.JSX.Element {
  const basePath = getBasePath();
  const registryRef = useRef<Registry | null>(null);
  const [state, setState] = useState<AppState>(() => {
    redirectHashUrls(basePath);
    const route = getCurrentRoute();
    if (route.kind === 'doc') return { status: 'loading', registry: null };
    return { status: 'registry-loading' };
  });

  const handleRoute = useCallback((route: Route, registry: Registry) => {
    registryRef.current = registry;

    if (route.kind === 'index') {
      setState(registry.issues.length === 0 ? { status: 'idle' } : { status: 'index', registry });
      return;
    }

    if (route.kind === 'issue' || route.kind === 'article') {
      const issue = registry.issues.find((i) => i.slug === route.slug);
      if (issue === undefined) {
        setState({ status: 'error', registry, message: `Issue "${route.slug}" not found in registry` });
        return;
      }
      if (issue.status === 'pre-release') {
        setState({ status: 'password', registry, issue, passwordError: null });
        return;
      }
      setState({ status: 'loading', registry });
      loadIssueDocAsync(issue)
        .then((doc) => {
          const section = route.kind === 'article' ? resolveArticleSection(doc, route.articleSlug) : null;
          setState({ status: 'loaded', registry, doc, currentSection: section });
        })
        .catch((err: unknown) => setState({ status: 'error', registry, message: toErrorMessage(err) }));
      return;
    }

    if (route.kind === 'doc') {
      setState({ status: 'loading', registry: null });
      loadDoc(route.url)
        .then((doc) => setState({ status: 'loaded', registry: null, doc, currentSection: null }))
        .catch((err: unknown) => setState({ status: 'error', registry: null, message: toErrorMessage(err) }));
      return;
    }

    setState({ status: 'error', registry, message: `Page not found: "${route.path}"` });
  }, []);

  useEffect(() => {
    const route = getCurrentRoute();

    if (route.kind === 'doc') {
      loadDoc(route.url)
        .then((doc) => setState({ status: 'loaded', registry: null, doc, currentSection: null }))
        .catch((err: unknown) => setState({ status: 'error', registry: null, message: toErrorMessage(err) }));
      return;
    }

    loadRegistry()
      .then((registry) => handleRoute(route, registry))
      .catch((err: unknown) => setState({ status: 'error', registry: null, message: toErrorMessage(err) }));
  }, [basePath, handleRoute]);

  useEffect(() => {
    function onPopState(): void {
      const route = getCurrentRoute();
      if (route.kind === 'doc') {
        setState({ status: 'loading', registry: null });
        loadDoc(route.url)
          .then((doc) => setState({ status: 'loaded', registry: null, doc, currentSection: null }))
          .catch((err: unknown) => setState({ status: 'error', registry: null, message: toErrorMessage(err) }));
        return;
      }

      const registry = registryRef.current;
      if (registry === null) return;
      handleRoute(route, registry);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleRoute]);

  function handleIssueSelect(slug: string): void {
    navigateTo({ kind: 'issue', slug }, basePath);
  }

  function handleUrlSubmit(url: string): void {
    navigateTo({ kind: 'doc', url }, basePath);
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
    navigateTo({ kind: 'index' }, basePath);
  }

  function currentIssueSlug(): string | undefined {
    const route = getCurrentRoute();
    if (route.kind === 'issue' || route.kind === 'article') return route.slug;
    return undefined;
  }

  function handleSectionSelect(index: number): void {
    setState((prev) => {
      if (prev.status !== 'loaded') return prev;
      const section = prev.doc.sections[index];
      if (section === undefined) return prev;
      const slug = currentIssueSlug();
      if (slug !== undefined) {
        const articleSlug = slugify(section.title);
        const path = buildPath({ kind: 'article', slug, articleSlug }, basePath);
        window.history.pushState(null, '', path);
      }
      return { ...prev, currentSection: index };
    });
    window.scrollTo(0, 0);
  }

  function handleHome(): void {
    setState((prev) => {
      if (prev.status !== 'loaded') return prev;
      const slug = currentIssueSlug();
      if (slug !== undefined) {
        const path = buildPath({ kind: 'issue', slug }, basePath);
        window.history.pushState(null, '', path);
      }
      return { ...prev, currentSection: null };
    });
    window.scrollTo(0, 0);
  }

  function handleBack(): void {
    setState((prev) => {
      if (prev.status !== 'loaded' || prev.currentSection === null) return prev;
      const next = prev.currentSection - 1;
      const nextSection = next < 0 ? null : next;
      const slug = currentIssueSlug();
      if (slug !== undefined) {
        if (nextSection === null) {
          const path = buildPath({ kind: 'issue', slug }, basePath);
          window.history.pushState(null, '', path);
        } else {
          const section = prev.doc.sections[nextSection];
          if (section !== undefined) {
            const path = buildPath({ kind: 'article', slug, articleSlug: slugify(section.title) }, basePath);
            window.history.pushState(null, '', path);
          }
        }
      }
      return { ...prev, currentSection: nextSection };
    });
    window.scrollTo(0, 0);
  }

  function handleNext(): void {
    setState((prev) => {
      if (prev.status !== 'loaded' || prev.currentSection === null) return prev;
      const next = prev.currentSection + 1;
      const nextSection = next >= prev.doc.sections.length ? null : next;
      const slug = currentIssueSlug();
      if (slug !== undefined) {
        if (nextSection === null) {
          const path = buildPath({ kind: 'issue', slug }, basePath);
          window.history.pushState(null, '', path);
        } else {
          const section = prev.doc.sections[nextSection];
          if (section !== undefined) {
            const path = buildPath({ kind: 'article', slug, articleSlug: slugify(section.title) }, basePath);
            window.history.pushState(null, '', path);
          }
        }
      }
      return { ...prev, currentSection: nextSection };
    });
    window.scrollTo(0, 0);
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
