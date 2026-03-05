export type IssueStatus = 'pre-release' | 'published' | 'frozen';

export interface Issue {
  readonly slug: string;
  readonly title: string;
  readonly docUrl: string;
  readonly status: IssueStatus;
  readonly contentHash: string;
}

export interface Registry {
  readonly issues: readonly Issue[];
}
