export interface Subsection {
  readonly title: string;
  readonly content: string; // DOMPurify-sanitised HTML string
}

export interface Section {
  readonly title: string;
  readonly content: string; // HTML content before the first h2 (may be empty)
  readonly subsections: readonly Subsection[];
}

export interface DocData {
  readonly title: string;
  readonly sections: readonly Section[];
}
