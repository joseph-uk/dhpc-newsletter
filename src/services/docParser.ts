import DOMPurify from 'dompurify';
import type { DocData } from '../types/DocData';
import { parseDocument } from './docParserCore';

export function parseGoogleDoc(html: string): DocData {
  if (html.length === 0) {
    throw new Error('parseGoogleDoc: html must not be empty');
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseDocument(doc, (h) => DOMPurify.sanitize(h, { ADD_ATTR: ['target', 'rel'] }));
}
