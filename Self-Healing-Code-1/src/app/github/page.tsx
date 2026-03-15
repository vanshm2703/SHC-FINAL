"use client";

import React from 'react'
import Spline from '@splinetool/react-spline'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { GitHubError, AnalysisResult, AnalysisResults, SEVERITY_DEFINITIONS, calculatePoints } from "@/lib/types";

// Dynamically import 3D view to avoid SSR issues
const Codebase3DView = dynamic(() => import('@/components/Codebase3DView'), { ssr: false });
// Dynamically import Knowledge Graph to avoid SSR issues
const KnowledgeGraph = dynamic(() => import('@/components/KnowledgeGraph'), {
  ssr: false,
  loading: () => null,
});

interface GitHubFile {
  type: string;
  name: string;
  download_url: string;
}

const GitHubPage = () => {
  const auth = useAuth();
  const user = auth?.user;

  // Check if user has GitHub provider
  const isGitHubUser = user?.providerData?.some(
    (provider) => provider.providerId === 'github.com'
  );

  const [repoUrl, setRepoUrl] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCreatingPR, setIsCreatingPR] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string>('');
  const [show3DView, setShow3DView] = useState<boolean>(false);
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState<boolean>(false);
  const [prResult, setPrResult] = useState<{ prUrl: string; message: string } | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  // Fetch user's total points when they login
  useEffect(() => {
    if (user?.uid) {
      const fetchUserPoints = async () => {
        try {
          const response = await fetch(`/api/save-points?userId=${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setTotalPoints(data.totalPoints || 0);
          }
        } catch (err) {
          console.error('Failed to fetch user points:', err);
        }
      };
      fetchUserPoints();
    }
  }, [user?.uid]);

  // Parse GitHub URL to extract owner and repo
  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(regex);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace('.git', '')
      };
    }
    return null;
  };

  // Fetch repository contents from GitHub API
  const fetchRepoContents = async (owner: string, repo: string, branch = 'main'): Promise<GitHubFile[]> => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`);
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      throw new Error(`Failed to fetch repository: ${err.message}`);
    }
  };

  // Fetch individual file content
  const fetchFileContent = async (downloadUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  };

  // Analyze code using Groq API
  const analyzeCodeWithGroq = async (filename: string, codeContent: string): Promise<{ errors: GitHubError[] }> => {
    const prompt = `
      Analyze this ${filename} file for errors, bugs, and code quality issues.
      Focus on: syntax errors, logic errors, security issues, performance problems, and best practices.

      Classify each issue with a severity level:
      - "critical": ${SEVERITY_DEFINITIONS.critical}
      - "high": ${SEVERITY_DEFINITIONS.high}
      - "medium": ${SEVERITY_DEFINITIONS.medium}
      - "low": ${SEVERITY_DEFINITIONS.low}

      Also set "type" to "error" for critical/high severity, and "warning" for medium/low.

      Code:
      ${codeContent}

      Return ONLY a valid JSON response with this exact format:
      {
        "errors": [
          {
            "type": "error",
            "severity": "high",
            "message": "Description of the issue",
            "line": 10,
            "suggestion": "How to fix it"
          }
        ]
      }
    `;

    try {
      const response = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze code');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Groq API error:', err);
      return { errors: [] };
    }
  };

  // Main analysis function
  const analyzeRepository = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    const parsedUrl = parseGitHubUrl(repoUrl);
    if (!parsedUrl) {
      setError('Invalid GitHub URL format');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisResults(null);

    try {
      const branch = branchName.trim() || 'main';
      const contents = await fetchRepoContents(parsedUrl.owner, parsedUrl.repo, branch);
      
      // Filter code files
      const codeFiles = contents.filter((item: GitHubFile) => 
        item.type === 'file' && 
        /\.(js|jsx|ts|tsx|py|java|cpp|c|cs|php)$/.test(item.name)
      );

      const analysisResults = [];
      // Analyze first 5 files to avoid rate limiting
      const filesToAnalyze = codeFiles.slice(0, 5);
      
      for (const file of filesToAnalyze) {
        const content = await fetchFileContent(file.download_url);
        if (content && content.length < 5000) { // Limit file size
          const analysis = await analyzeCodeWithGroq(file.name, content);
          if (analysis.errors && analysis.errors.length > 0) {
            analysisResults.push({
              filename: file.name,
              errors: analysis.errors
            });
          }
        }
      }

      setAnalysisResults({
        totalFiles: codeFiles.length,
        analyzedFiles: filesToAnalyze.length,
        filesWithErrors: analysisResults.length,
        results: analysisResults,
        repoName: `${parsedUrl.owner}/${parsedUrl.repo}`
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create Pull Request with fixes
  const createAutoFixPR = async () => {
    if (!analysisResults || !githubToken.trim()) {
      setError('GitHub token is required to create pull requests');
      return;
    }

    if (analysisResults.results.length === 0) {
      setError('No issues found to fix');
      return;
    }

    setIsCreatingPR(true);
    setError('');
    setPrResult(null);

    try {
      const response = await fetch('/api/create-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          branchName: branchName.trim() || 'main',
          githubToken,
          analysisResults: analysisResults.results
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create PR');
      }

      setPrResult({
        prUrl: data.prUrl,
        message: data.message
      });

      // Calculate and save points based on bug severity
      const allErrors = analysisResults.results.flatMap(f => f.errors);
      const earned = calculatePoints(allErrors);
      const severityBreakdown = allErrors.reduce((acc, err) => {
        const sev = err.severity || 'medium';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setPointsEarned(earned);

      if (user) {
        try {
          const saveResponse = await fetch('/api/save-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              userEmail: user.email,
              points: earned,
              prUrl: data.prUrl,
              prNumber: data.prNumber,
              repoName: analysisResults.repoName,
              branchName: branchName.trim() || 'main',
              bugsFixed: allErrors.map(e => ({
                filename: 'various',
                severity: e.severity,
                message: e.message,
              })),
              severityBreakdown,
            }),
          });

          if (saveResponse.ok) {
            // Update total points after successful save
            setTotalPoints(prevPoints => prevPoints + earned);
          }
        } catch (pointsError) {
          console.error('Failed to save points:', pointsError);
        }
      }

    } catch (err: any) {
      setError(`Failed to create PR: ${err.message}`);
    } finally {
      setIsCreatingPR(false);
    }
  };

  return (
    <>
      {/* Show login screen if not logged in with GitHub */}
      {!isGitHubUser && (
        <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center space-y-6 p-8">
            <svg className="mx-auto h-16 w-16 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <h2 className="text-3xl font-bold text-gray-900">GitHub Login Required</h2>
            <p className="text-gray-600">
              Sign in with your GitHub account to access the analysis tools.
            </p>
            <Button
              onClick={() => auth?.githubSignIn()}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </Button>
          </div>
        </div>
      )}

      {/* Main content - show only if logged in with GitHub */}
      {isGitHubUser && (
        <>
          {/* Knowledge Graph View */}
          {showKnowledgeGraph && repoUrl && (
            <KnowledgeGraph
              repoUrl={repoUrl}
              onClose={() => setShowKnowledgeGraph(false)}
            />
          )}

          {/* 3D Codebase View Modal */}
          {show3DView && analysisResults && (
            <Codebase3DView
              analysisResults={analysisResults}
              onClose={() => setShow3DView(false)}
              repoUrl={repoUrl}
              branchName={branchName}
              githubToken={githubToken}
              userId={user?.uid}
              userEmail={user?.email || ''}
              totalPoints={totalPoints}
              onPointsEarned={(points) => setTotalPoints(prev => prev + points)}
            />
          )}

        <main className='flex min-h-screen h-fit flex-col items-center justify-center relative'>
          <header id="home" className="flex flex-col-reverse md:flex-row w-full min-h-screen max-w-7xl items-center justify-center p-8 relative overflow-x-hidden">
            <div className='w-full h-fit md:h-full md:w-2/5 flex flex-col justify-center items-center md:items-start gap-8'>
              <div className='flex flex-col gap-2'>
                <h1 className='text-4xl font-black md:text-8xl text-black'>GitHub Integration</h1>
                <h2 className='text-md md:text-2xl text-black'>Connect Your Repository</h2>
              </div>
              <p className='max-w-md text-sm md:text-base text-black'>
                Import your GitHub repository and let our AI analyze and improve your code automatically.
              </p>

              {/* Points Display Badge */}
              {totalPoints > 0 && (
                <div className="w-full max-w-md p-4 bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Your Total Points</p>
                    <p className="text-3xl font-bold text-yellow-600">⭐ {totalPoints.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Logout for Demo Button */}
              <div className="w-full max-w-md">
                <Button
                  onClick={() => auth?.logOut()}
                  className="w-full bg-green-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  🔄 Logout 
                </Button>
              </div>

              {/* GitHub Form */}
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repo-url" className="text-sm font-medium text-black">
                GitHub Repository URL
              </Label>
              <Input 
                id="repo-url" 
                placeholder="https://github.com/user/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-white/10 border-black text-black placeholder:text-black focus:border-black"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="branch-name" className="text-sm font-medium text-black">
                Branch Name 
              </Label>
              <Input 
                id="branch-name" 
                placeholder="main, develop, etc."
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="bg-white/10 border-black text-black placeholder:text-black focus:border-black"
              />
            </div>            
            <div className="space-y-2">
              <Label htmlFor="github-token" className="text-sm font-medium text-black">
                GitHub Token (for PR creation)
              </Label>
              <Input 
                id="github-token" 
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="bg-white/10 border-black text-black placeholder:text-black focus:border-black"
              />
              <p className="text-xs text-gray-600">
                <a 
                  href="https://github.com/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  Generate token here
                </a> with 'repo' permissions for PR creation
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                onClick={analyzeRepository}
                disabled={!repoUrl.trim() || isAnalyzing}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
              </Button>
              <Button
                onClick={() => setShowKnowledgeGraph(true)}
                disabled={!repoUrl.trim()}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
              >
                Knowledge Graph
              </Button>
           </div>

            {/* Success Display */}
            {prResult && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✅</span>
                  <span className="font-semibold">PR Created Successfully!</span>
                </div>
                <p className="mb-3">{prResult.message}</p>
                {pointsEarned > 0 && (
                  <div className="mb-3 p-3 bg-yellow-100 border border-yellow-400 rounded-lg">
                    <div className="text-center mb-2">
                      <span className="text-xl font-bold text-yellow-700">
                        +{pointsEarned.toLocaleString()} points earned! 🎉
                      </span>
                    </div>
                    <div className="text-center text-sm text-yellow-600">
                      <p>Total Points: <strong className="text-lg text-yellow-700">{totalPoints.toLocaleString()}</strong></p>
                    </div>
                  </div>
                )}
                <a
                  href={prResult.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  View Pull Request
                </a>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Analysis Results */}
            {analysisResults && (
              <div className="mt-6 p-4 bg-white/20 border border-black rounded-lg">
                <h3 className="text-lg font-semibold text-black mb-3">
                  Analysis Results - {analysisResults.repoName}
                </h3>
                <div className="text-sm text-black mb-4">
                  <p>📊 Total Files: {analysisResults.totalFiles}</p>
                  <p>🔍 Analyzed Files: {analysisResults.analyzedFiles}</p>
                  <p>⚠️ Files with Issues: {analysisResults.filesWithErrors}</p>
                </div>
                
                {analysisResults.results.length === 0 ? (
                  <p className="text-green-700 font-semibold">✅ No major issues found!</p>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex gap-3">
                        <Button 
                          onClick={createAutoFixPR}
                          disabled={!githubToken.trim() || isCreatingPR || analysisResults.results.length === 0}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCreatingPR ? (
                            <>
                              <span className="animate-spin mr-2">🤖</span>
                              Creating Auto-Fix PR...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">🚀</span>
                              Create Auto-Fix PR ({analysisResults.results.reduce((sum, file) => sum + file.errors.length, 0)} issues)
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => setShow3DView(true)}
                          className="bg-gradient-to-r from-indigo-500 to-cyan-600 hover:from-indigo-600 hover:to-cyan-700 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm"
                        >
                          <span className="mr-1">🏙️</span>
                          3D View
                        </Button>
                      </div>
                      {!githubToken.trim() && (
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          Enter GitHub token above to enable PR creation
                        </p>
                      )}
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                    {analysisResults.results.map((file: AnalysisResult, index: number) => (
                      <div key={index} className="bg-white/30 p-3 rounded border">
                        <h4 className="font-semibold text-black mb-2">📁 {file.filename}</h4>
                        <ul className="space-y-2">
                          {file.errors.map((error: GitHubError, errorIndex: number) => (
                            <li key={errorIndex} className="text-sm border-l-4 border-red-400 pl-3">
                              <div className="text-black font-semibold">
                                {error.type === 'error' ? '🔴' : '🟡'} Line {error.line}: {error.message}
                              </div>
                              {error.suggestion && (
                                <div className="text-gray-700 mt-1">
                                  💡 {error.suggestion}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className='w-full h-fit md:h-full md:w-3/5 flex items-center justify-center relative -z-10'>
          <Spline 
            className="w-full flex scale-[.25] sm:scale-[.35] lg:scale-[.5] items-center justify-center md:justify-start" 
            scene='https://prod.spline.design/pvM5sSiYV2ivWraz/scene.splinecode'
          />
        </div>
      </header>

      {/* Additional Information Section */}
      <section className="w-full max-w-7xl px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-black mb-4">How It Works</h3>
          <p className="text-black max-w-2xl mx-auto">
            Our AI-powered system analyzes your GitHub repository and provides intelligent suggestions for code improvements, bug fixes, and optimizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h4 className="text-xl font-semibold text-black mb-2">Code Analysis</h4>
            <p className="text-black">Deep analysis of your codebase structure, patterns, and potential issues.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔧</span>
            </div>
            <h4 className="text-xl font-semibold text-black mb-2">Smart Suggestions</h4>
            <p className="text-black">AI-generated recommendations for code improvements and optimizations.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h4 className="text-xl font-semibold text-black mb-2">Auto Healing</h4>
            <p className="text-black">Automatic code fixes and improvements applied intelligently.</p>
          </div>
        </div>
      </section>
    </main>
        </>
      )}
    </>
  )
}

export default dynamic(() => Promise.resolve(GitHubPage), { ssr: false })
