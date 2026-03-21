"use client";

import React, { useMemo } from 'react';
import {
  BugSeverity,
  SEVERITY_WEIGHTS,
  BUG_CONTRIBUTION_VALUE,
  SEVERITY_DEFINITIONS,
  GRADING_SCALE,
  GitHubError,
  calculateQualityMetrics,
  getProgressPercentage,
} from '@/lib/types';

interface GradingDisplayProps {
  errors: GitHubError[];
  showGradingScale?: boolean;
  showFormula?: boolean;
  compact?: boolean;
}

// Severity visual config
const SEVERITY_CONFIG: Record<BugSeverity, {
  icon: string;
  color: string;
  bgColor: string;
  barColor: string;
  label: string;
}> = {
  critical: {
    icon: '🔴',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    barColor: 'bg-red-500',
    label: 'Critical',
  },
  high: {
    icon: '🟠',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    barColor: 'bg-orange-500',
    label: 'High',
  },
  medium: {
    icon: '🟡',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    barColor: 'bg-yellow-500',
    label: 'Medium',
  },
  low: {
    icon: '🔵',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    barColor: 'bg-blue-500',
    label: 'Low',
  },
};

export default function GradingDisplay({
  errors,
  showGradingScale = true,
  showFormula = true,
  compact = false,
}: GradingDisplayProps) {
  // Calculate metrics using the realistic algorithm
  const metrics = useMemo(() => calculateQualityMetrics(errors), [errors]);

  const {
    totalBugsFixed,
    severityBreakdown,
    rawContribution,
    normalizedScore,
    diversityBonus,
    gradeInfo,
  } = metrics;

  return (
    <div className={`w-full ${compact ? 'space-y-3' : 'space-y-5'} p-4 bg-white rounded-xl border border-gray-200 shadow-sm`}>

      {/* Main Score Display */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Score Circle */}
          <div
            className="w-20 h-20 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg"
            style={{ backgroundColor: gradeInfo.color }}
          >
            <span className="text-2xl leading-none">{normalizedScore}</span>
            <span className="text-xs opacity-80">/100</span>
          </div>

          {/* Grade & Label */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-3xl font-black"
                style={{ color: gradeInfo.color }}
              >
                {gradeInfo.grade}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                GPA: {gradeInfo.gpa.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600">{gradeInfo.label}</p>
            <p className="text-xs text-gray-400">{gradeInfo.description}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{totalBugsFixed}</div>
          <div className="text-xs text-gray-500">Bugs Fixed</div>
          {diversityBonus > 0 && (
            <div className="text-xs text-green-600 font-medium mt-1">
              +{diversityBonus} diversity bonus
            </div>
          )}
        </div>
      </div>

      {/* Score Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Score Progress</span>
          <span>{normalizedScore}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${normalizedScore}%`,
              backgroundColor: gradeInfo.color,
            }}
          />
        </div>
        {/* Grade markers */}
        <div className="flex justify-between text-[10px] text-gray-400 px-1">
          <span>F</span>
          <span>D</span>
          <span>C</span>
          <span>B</span>
          <span>A</span>
          <span>A+</span>
        </div>
      </div>

      {/* Severity Breakdown with Progress Bars */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">Bug Severity Breakdown</h4>

        {(['critical', 'high', 'medium', 'low'] as BugSeverity[]).map((severity) => {
          const count = severityBreakdown[severity];
          const config = SEVERITY_CONFIG[severity];
          const contribution = count * BUG_CONTRIBUTION_VALUE[severity];
          const percentage = getProgressPercentage(count, totalBugsFixed);

          return (
            <div key={severity} className={`p-3 rounded-lg ${config.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span className={`font-medium text-sm ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${config.color}`}>{count}</span>
                  <span className="text-gray-500 text-xs ml-1">bugs</span>
                  {count > 0 && (
                    <span className="text-green-600 text-xs ml-2 font-medium">
                      +{contribution} pts
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Severity description */}
              {!compact && count > 0 && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                  {SEVERITY_DEFINITIONS[severity].split(',')[0]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Scoring Formula Reference */}
      {showFormula && !compact && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm">Score Calculation Breakdown</h4>

          {/* Score Formula Visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
              <span className="text-sm font-medium text-gray-700">Base Score</span>
              <span className="font-mono font-bold text-lg">
                {Math.round((metrics.rawContribution / 100) * 100)}
              </span>
            </div>

            {metrics.gradeInfo.grade !== 'F' && metrics.severityBreakdown.high > 0 && (
              <div className="flex items-center justify-between p-2 bg-white rounded border border-orange-200">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span>🟠</span>
                  <span>High Bug Fixed Bonus</span>
                </span>
                <span className="font-mono font-bold text-green-600">+5</span>
              </div>
            )}

            {metrics.gradeInfo.grade !== 'F' && metrics.severityBreakdown.critical > 0 && (
              <div className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span>🔴</span>
                  <span>Critical Bug Fixed Bonus</span>
                </span>
                <span className="font-mono font-bold text-green-600">+10</span>
              </div>
            )}

            {metrics.diversityBonus > 0 && (
              <div className="flex items-center justify-between p-2 bg-white rounded border border-purple-200">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span>🎯</span>
                  <span>
                    Diversity Bonus ({Object.values(metrics.severityBreakdown).filter(c => c > 0).length} types fixed)
                  </span>
                </span>
                <span className="font-mono font-bold text-green-600">+{metrics.diversityBonus}</span>
              </div>
            )}

            <div className="border-t border-gray-300 pt-2 flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded font-bold">
              <span className="text-gray-800">Final Normalized Score</span>
              <span
                className="font-mono text-xl text-white px-3 py-1 rounded"
                style={{ backgroundColor: metrics.gradeInfo.color }}
              >
                {metrics.normalizedScore}/100
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Formula: Base (0-80) + Critical/High Bonus (0-10) + Diversity Bonus (0-10) = Score (0-100)
          </p>
        </div>
      )}

      {/* Scoring Formula Reference - Original */}
      {showFormula && !compact && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Points Per Bug Fixed</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(['critical', 'high', 'medium', 'low'] as BugSeverity[]).map((sev) => (
              <div key={sev} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1">
                  {SEVERITY_CONFIG[sev].icon}
                  <span className="capitalize">{sev}</span>
                </span>
                <span className="font-mono font-bold">+{BUG_CONTRIBUTION_VALUE[sev]}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Raw contribution points saved in database for lifetime tracking
          </p>
        </div>
      )}

      {/* University Grading Scale */}
      {showGradingScale && !compact && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800 text-sm">Grading Scale</h4>
          <div className="grid grid-cols-5 gap-1.5">
            {GRADING_SCALE.slice(0, 10).map((g) => (
              <div
                key={g.grade}
                className={`p-1.5 rounded text-center transition-all ${
                  gradeInfo.grade === g.grade
                    ? 'ring-2 ring-offset-1 scale-105 shadow-sm'
                    : 'opacity-70'
                }`}
                style={{
                  backgroundColor: g.bgColor,
                  borderColor: g.color,
                  ...(gradeInfo.grade === g.grade ? { ringColor: g.color } : {}),
                }}
              >
                <div className="font-bold text-sm" style={{ color: g.color }}>
                  {g.grade}
                </div>
                <div className="text-[10px] text-gray-500">
                  {g.minScore}-{g.maxScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standards Reference Footer */}
      <div className="pt-2 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          Grading system based on <span className="font-semibold">CVSS 3.1</span> (Common Vulnerability Scoring System) · <span className="font-semibold">ISO/IEC 25010</span> (Software Quality) · <span className="font-semibold">OWASP</span> risk assessment standards
        </p>
      </div>
    </div>
  );
}
