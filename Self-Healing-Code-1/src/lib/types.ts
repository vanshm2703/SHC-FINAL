// Bug severity levels - replaces the binary 'error' | 'warning' system
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

// =============================================================================
// REALISTIC SCORING SYSTEM - Based on Software Quality Metrics (ISO/IEC 25010)
// =============================================================================

// Severity weights based on CVSS (Common Vulnerability Scoring System) principles
// and software engineering research on bug impact
export const SEVERITY_WEIGHTS: Record<BugSeverity, number> = {
  critical: 10.0,  // CVSS 9.0-10.0 range - immediate security/stability risk
  high: 7.5,       // CVSS 7.0-8.9 range - significant functional impact
  medium: 5.0,     // CVSS 4.0-6.9 range - moderate impact on quality
  low: 2.5,        // CVSS 0.1-3.9 range - minimal impact, code hygiene
};

// Contribution value per bug fixed (represents effort/impact of fixing)
export const BUG_CONTRIBUTION_VALUE: Record<BugSeverity, number> = {
  critical: 25,    // Fixing critical bugs = high contribution
  high: 18,        // Fixing high bugs = significant contribution
  medium: 10,      // Fixing medium bugs = moderate contribution
  low: 5,          // Fixing low bugs = minor contribution
};

// Maximum theoretical contribution per session (for normalization)
// Based on: ~4-6 bugs per analysis session being realistic
const MAX_SESSION_CONTRIBUTION = 100;

// Severity definitions for the AI prompt (based on CWE/OWASP classifications)
export const SEVERITY_DEFINITIONS = {
  critical: 'Security vulnerabilities (CWE Top 25), data loss risks, application crashes, infinite loops, memory leaks causing system failure',
  high: 'Logic errors producing incorrect results, unhandled exceptions, race conditions, injection vulnerabilities (SQL/XSS)',
  medium: 'Performance degradation, missing error handling, deprecated API usage, resource management issues',
  low: 'Code style violations, missing documentation, naming convention issues, minor code smells',
};

// =============================================================================
// UNIVERSITY GRADING SCALE - Based on standard academic grading
// =============================================================================

export type GradeLevel = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'F';

export interface GradeInfo {
  grade: GradeLevel;
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
  color: string;
  bgColor: string;
  gpa: number;  // GPA equivalent for reference
}

// Standard university grading scale with GPA equivalents
export const GRADING_SCALE: GradeInfo[] = [
  { grade: 'A+', label: 'Outstanding', description: 'Exceptional contribution - critical bugs fixed', minScore: 95, maxScore: 100, color: '#15803d', bgColor: '#dcfce7', gpa: 4.0 },
  { grade: 'A', label: 'Excellent', description: 'Excellent work - high-impact fixes', minScore: 90, maxScore: 94, color: '#16a34a', bgColor: '#d1fae5', gpa: 4.0 },
  { grade: 'A-', label: 'Very Good', description: 'Very good contribution', minScore: 85, maxScore: 89, color: '#22c55e', bgColor: '#bbf7d0', gpa: 3.7 },
  { grade: 'B+', label: 'Good', description: 'Good quality fixes', minScore: 80, maxScore: 84, color: '#3b82f6', bgColor: '#dbeafe', gpa: 3.3 },
  { grade: 'B', label: 'Above Average', description: 'Above average contribution', minScore: 75, maxScore: 79, color: '#60a5fa', bgColor: '#bfdbfe', gpa: 3.0 },
  { grade: 'B-', label: 'Satisfactory+', description: 'Satisfactory with good effort', minScore: 70, maxScore: 74, color: '#93c5fd', bgColor: '#e0f2fe', gpa: 2.7 },
  { grade: 'C+', label: 'Satisfactory', description: 'Meets basic requirements', minScore: 65, maxScore: 69, color: '#eab308', bgColor: '#fef9c3', gpa: 2.3 },
  { grade: 'C', label: 'Adequate', description: 'Adequate contribution', minScore: 60, maxScore: 64, color: '#f59e0b', bgColor: '#fef3c7', gpa: 2.0 },
  { grade: 'D', label: 'Pass', description: 'Minimal passing grade', minScore: 50, maxScore: 59, color: '#f97316', bgColor: '#ffedd5', gpa: 1.0 },
  { grade: 'F', label: 'Needs Work', description: 'Below passing threshold', minScore: 0, maxScore: 49, color: '#ef4444', bgColor: '#fee2e2', gpa: 0.0 },
];

// =============================================================================
// INTERFACES
// =============================================================================

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

export interface PointsRecord {
  userId: string;
  userEmail: string;
  points: number;
  score: number;  // Normalized 0-100 score
  grade: GradeLevel;
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
  qualityMetrics: QualityMetrics;
  createdAt: Date;
}

// =============================================================================
// QUALITY METRICS INTERFACE
// =============================================================================

export interface QualityMetrics {
  totalBugsFixed: number;
  severityBreakdown: Record<BugSeverity, number>;
  rawContribution: number;      // Sum of contribution values
  normalizedScore: number;      // 0-100 scale
  severityScore: number;        // Weighted severity impact
  diversityBonus: number;       // Bonus for fixing varied severity bugs
  grade: GradeLevel;
  gradeInfo: GradeInfo;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate severity breakdown from errors
 */
export function calculateSeverityBreakdown(errors: GitHubError[]): Record<BugSeverity, number> {
  const breakdown: Record<BugSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  errors.forEach(error => {
    const severity = error.severity || 'low';
    breakdown[severity]++;
  });

  return breakdown;
}

/**
 * Calculate raw contribution points (for database storage)
 * This is the sum of contribution values for all bugs fixed
 */
export function calculatePoints(errors: GitHubError[]): number {
  return errors.reduce((sum, error) => {
    const severity = error.severity || 'low';
    return sum + BUG_CONTRIBUTION_VALUE[severity];
  }, 0);
}

/**
 * Calculate comprehensive quality metrics and normalized score (0-100)
 * Uses a realistic algorithm based on:
 * 1. Bug severity distribution
 * 2. Total contribution value
 * 3. Diversity bonus for varied fixes
 */
export function calculateQualityMetrics(errors: GitHubError[]): QualityMetrics {
  const severityBreakdown = calculateSeverityBreakdown(errors);
  const totalBugsFixed = errors.length;

  if (totalBugsFixed === 0) {
    return {
      totalBugsFixed: 0,
      severityBreakdown,
      rawContribution: 0,
      normalizedScore: 0,
      severityScore: 0,
      diversityBonus: 0,
      grade: 'F',
      gradeInfo: GRADING_SCALE[9],
    };
  }

  // 1. Calculate raw contribution
  const rawContribution = calculatePoints(errors);

  // 2. Calculate weighted severity score (how impactful are the fixes)
  const severityScore = Object.entries(severityBreakdown).reduce((score, [sev, count]) => {
    return score + (SEVERITY_WEIGHTS[sev as BugSeverity] * count);
  }, 0);

  // 3. Calculate diversity bonus (reward fixing different severity levels)
  const severitiesFixed = Object.values(severityBreakdown).filter(count => count > 0).length;
  const diversityBonus = severitiesFixed >= 3 ? 10 : severitiesFixed >= 2 ? 5 : 0;

  // 4. Normalize to 0-100 scale
  // Formula: (rawContribution / maxPossible) * 80 + diversityBonus + severityMultiplier
  const baseScore = Math.min((rawContribution / MAX_SESSION_CONTRIBUTION) * 100, 80);

  // Severity multiplier: boost score if critical/high bugs were fixed
  const hasCritical = severityBreakdown.critical > 0;
  const hasHigh = severityBreakdown.high > 0;
  const severityMultiplier = hasCritical ? 10 : hasHigh ? 5 : 0;

  // Final normalized score (capped at 100)
  const normalizedScore = Math.min(100, Math.round(baseScore + diversityBonus + severityMultiplier));

  // 5. Get grade
  const gradeInfo = getGradeFromScore(normalizedScore);

  return {
    totalBugsFixed,
    severityBreakdown,
    rawContribution,
    normalizedScore,
    severityScore,
    diversityBonus,
    grade: gradeInfo.grade,
    gradeInfo,
  };
}

/**
 * Get grade info based on score (0-100)
 */
export function getGradeFromScore(score: number): GradeInfo {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  return GRADING_SCALE.find(g => clampedScore >= g.minScore && clampedScore <= g.maxScore) || GRADING_SCALE[9];
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}/100`;
}

/**
 * Calculate percentage for progress bar
 */
export function getProgressPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}
