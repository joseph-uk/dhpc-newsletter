import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseDocument } from './docParserCore';

const noopSanitize = (html: string): string => html;

function makeDoc(bodyHtml: string): Document {
  const dom = new JSDOM(`<!DOCTYPE html><html><head><title>TEST</title></head><body>${bodyHtml}</body></html>`);
  return dom.window.document;
}

describe('parseDocument', () => {
  it('splits sections on H1 elements', () => {
    const doc = makeDoc(`
      <h1>Section A</h1>
      <p>Content A</p>
      <h1>Section B</h1>
      <p>Content B</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]?.title).toBe('Section A');
    expect(result.sections[0]?.content).toContain('Content A');
    expect(result.sections[0]?.content).not.toContain('Content B');
    expect(result.sections[1]?.title).toBe('Section B');
    expect(result.sections[1]?.content).toContain('Content B');
  });

  it('does not bleed subsection content into adjacent sections', () => {
    const doc = makeDoc(`
      <h1>Coaching</h1>
      <p>Coaching intro</p>
      <h2>Sub Topic</h2>
      <p>Sub topic content</p>
      <h1>Cow Close Fell</h1>
      <p>Cow Close content</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections).toHaveLength(2);

    const coaching = result.sections[0];
    expect(coaching?.title).toBe('Coaching');
    expect(coaching?.subsections).toHaveLength(1);
    expect(coaching?.subsections[0]?.title).toBe('Sub Topic');
    expect(coaching?.subsections[0]?.content).toContain('Sub topic content');
    expect(coaching?.subsections[0]?.content).not.toContain('Cow Close content');

    const cowClose = result.sections[1];
    expect(cowClose?.title).toBe('Cow Close Fell');
    expect(cowClose?.content).toContain('Cow Close content');
  });

  it('handles multiple H2s within a section without content bleed', () => {
    const doc = makeDoc(`
      <h1>Main Section</h1>
      <p>Intro</p>
      <h2>First Sub</h2>
      <p>First sub content</p>
      <h2>Second Sub</h2>
      <p>Second sub content</p>
      <h1>Next Section</h1>
      <p>Next section content</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections).toHaveLength(2);

    const main = result.sections[0];
    expect(main?.subsections).toHaveLength(2);
    expect(main?.subsections[0]?.content).toContain('First sub content');
    expect(main?.subsections[0]?.content).not.toContain('Second sub content');
    expect(main?.subsections[1]?.content).toContain('Second sub content');
    expect(main?.subsections[1]?.content).not.toContain('Next section content');
  });

  it('handles last section with H2 subsections (no subsequent H1)', () => {
    const doc = makeDoc(`
      <h1>First Section</h1>
      <p>First content</p>
      <h1>Last Section</h1>
      <p>Last intro</p>
      <h2>Last Sub</h2>
      <p>Last sub content</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections).toHaveLength(2);

    const last = result.sections[1];
    expect(last?.title).toBe('Last Section');
    expect(last?.subsections).toHaveLength(1);
    expect(last?.subsections[0]?.content).toContain('Last sub content');
    expect(last?.subsections[0]?.content).not.toContain('First content');
  });

  it('extracts title from .title element', () => {
    const doc = makeDoc(`
      <div class="title">My Newsletter</div>
      <h1>Section</h1>
      <p>Content</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.title).toBe('My Newsletter');
  });

  it('extracts title from <title> element when .title is missing', () => {
    const doc = makeDoc(`
      <h1>Section</h1>
      <p>Content</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.title).toBe('TEST');
  });

  it('filters out sections with empty titles', () => {
    const doc = makeDoc(`
      <h1>  </h1>
      <p>Content for empty title</p>
      <h1>Real Section</h1>
      <p>Real content</p>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.title).toBe('Real Section');
  });

  it('rewrites Google Docs image URLs', () => {
    const doc = makeDoc(`
      <h1>Section</h1>
      <img src="https://docs.google.com/docs-images-rt/AHDoZz123">
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections[0]?.content).toContain('lh3.googleusercontent.com/docs-images-rt/AHDoZz123');
    expect(result.sections[0]?.content).not.toContain('docs.google.com/docs-images-rt/');
  });

  it('unwraps Google redirect links', () => {
    const doc = makeDoc(`
      <h1>Section</h1>
      <a href="https://www.google.com/url?q=https://example.com&sa=D">Link</a>
    `);
    const result = parseDocument(doc, noopSanitize);
    expect(result.sections[0]?.content).toContain('href="https://example.com"');
    expect(result.sections[0]?.content).toContain('target="_blank"');
    expect(result.sections[0]?.content).toContain('rel="noopener noreferrer"');
  });
});
