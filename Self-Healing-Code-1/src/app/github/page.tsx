"use client";

import React from 'react'
import Spline from '@splinetool/react-spline'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import dynamic from "next/dynamic";
import { useState } from "react";

const GitHubPage = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branchName, setBranchName] = useState('');

  return (
    <main className='flex min-h-screen h-fit flex-col items-center justify-center relative'>
      <header id="home" className="flex flex-col-reverse md:flex-row w-full h-screen max-w-7xl items-center justify-center p-8 relative overflow-x-hidden">
        <div className='w-full h-2/4 md:h-full md:w-2/5 flex flex-col justify-center items-center md:items-start gap-8'>
          <div className='flex flex-col gap-2'>
            <h1 className='text-4xl font-black md:text-8xl text-black'>GitHub Integration</h1>
            <h2 className='text-md md:text-2xl text-black'>Connect Your Repository</h2>
          </div>
          <p className='max-w-md text-sm md:text-base text-black'>
            Import your GitHub repository and let our AI analyze and improve your code automatically.
          </p>
          
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
                Branch Name (Optional)
              </Label>
              <Input 
                id="branch-name" 
                placeholder="main, develop, etc."
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="bg-white/10 border-black text-black placeholder:text-black focus:border-black"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/dashboard" className="flex-1">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                  disabled={!repoUrl.trim()}
                >
                  Analyze Repository
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="border-black text-black hover:bg-white/20 hover:border-black">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className='w-full h-2/4 md:h-full md:w-3/5 flex items-center justify-center relative -z-10'>
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
  )
}

export default dynamic(() => Promise.resolve(GitHubPage), { ssr: false })
