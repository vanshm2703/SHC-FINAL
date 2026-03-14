// Bug severity levels - replaces the binary 'error' | 'warning' system
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

// Points awarded per severity level
export const SEVERITY_POINTS: Record<BugSeverity, number> = {
  critical: 500,
  high: 300,
  medium: 150,
  low: 50,
};

// Severity definitions for the AI prompt
export const SEVERITY_DEFINITIONS = {
  critical: 'Security vulnerabilities, data loss risks, crashes, infinite loops, memory leaks that crash the app',
  high: 'Logic errors that produce wrong results, unhandled exceptions, race conditions, SQL injection potential',
  medium: 'Performance issues, missing error handling, deprecated API usage, poor resource management',
  low: 'Code style issues, missing documentation, naming convention violations, minor code smells',
};

// Updated error interface with severity
export interface GitHubError {
  type: 'error' | 'warning';
  severity: BugSeverity;
  message: string;
  line: number;
  suggestion?: string;
}

export interface AnalysisResult {
  filename: string;
  errors: GitHubError[];
}

export interface AnalysisResults {
  totalFiles: number;
  analyzedFiles: number;
  filesWithErrors: number;
  results: AnalysisResult[];
  repoName: string;
}

// Points record stored in MongoDB
export interface PointsRecord {
  userId: string;
  userEmail: string;
  points: number;
  prUrl: string;
  prNumber: number;
  repoName: string;
  branchName: string;
  bugsFixed: {
    filename: string;
    severity: BugSeverity;
    message: string;
  }[];
  severityBreakdown: Record<BugSeverity, number>;
  createdAt: Date;
}

// Calculate total points from a list of errors
export function calculatePoints(errors: GitHubError[]): number {
  return errors.reduce((sum, error) => {
    return sum + (SEVERITY_POINTS[error.severity] || SEVERITY_POINTS.low);
  }, 0);
}
