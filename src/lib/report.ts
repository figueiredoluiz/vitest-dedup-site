import reportJson from '../data/sample-report.json';

export type Severity = 'error' | 'warning';

export type Verdict = 'redundant' | 'consolidatable' | 'name-collision' | 'similar-uncertain';

export interface ReportParticipant {
  file: string;
  title: string;
  line: number;
  column: number;
  inert: boolean;
}

export interface ReportFinding {
  id: string;
  rule: string;
  severity: Severity;
  verdict: Verdict;
  message: string;
  action: string;
  fingerprint: string;
  participants: ReportParticipant[];
}

export interface SampleReport {
  meta: {
    source: string;
    note: string;
    toolVersion: string;
  };
  summary: {
    filesAnalyzed: number;
    testsAnalyzed: number;
    findings: number;
    errorFindings: number;
    warningFindings: number;
    suppressed: number;
    detectionTimeMs: number;
    incomplete: boolean;
  };
  findings: ReportFinding[];
}

export const sampleReport = reportJson as SampleReport;

export const verdictLabels: Record<Verdict, string> = {
  redundant: 'Redundant — one copy can go',
  consolidatable: 'Consolidatable — belongs in one table',
  'name-collision': 'Name collision — rename',
  'similar-uncertain': 'Similar — review decides',
};
