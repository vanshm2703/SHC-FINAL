"use client"
import React from 'react'
import Spline from '@splinetool/react-spline'
import TabsDemo from '@/components/component/exampletab'
import { InfiniteMovingCardsDemo } from '@/components/component/infinite-moving-cards'
import UILan from '@/components/uilan'

export default function Landing() {

   return (
    <>
   
    <main className='flex min-h-screen h-fit flex-col items-center justify-center relative'>
    <header id="home" className="flex flex-col-reverse md:flex-row w-full h-screen max-w-7xl items-center justify-center p-8 relative overflow-x-hidden">
      <div className='w-full h-2/4 md:h-full md:w-2/5 flex flex-col justify-center items-center md:items-start gap-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-4xl font-black md:text-8xl'> Self Healing Code</h1>
          <h2 className='text-md md:text-2xl'>Evolving Code, Byte by Byte</h2>
        </div>
        <p className='max-w-md text-sm md:text-base text-zinc-500'>Insightful is an AI-powered sales optimization tool that provides data-driven insights to boost sales performance.</p>
        <div className='w-full flex items-center justify-center md:justify-start gap-4'>
        </div>
      </div>

      <div className='w-full h-2/4 md:h-full md:w-3/5 flex items-center justify-center relative -z-10'>
        <Spline className="w-full flex scale-[.25] sm:scale-[.35] lg:scale-[.5] items-center justify-center md:justify-start" scene='https://prod.spline.design/pvM5sSiYV2ivWraz/scene.splinecode'/>
      </div>

    </header>
    <TabsDemo />
    <div>
    <p className=' text-3xl md:text-3xl text-white items-center justify-center mt-14 '>Customer Feedback</p>
    </div>
    <InfiniteMovingCardsDemo/>
    <UILan />
    </main>
    </>
  )
}
