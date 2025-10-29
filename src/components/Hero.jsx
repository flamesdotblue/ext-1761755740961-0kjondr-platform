import React from 'react';
import Spline from '@splinetool/react-spline';

export default function Hero() {
  return (
    <section className="relative w-full h-[65vh] sm:h-[75vh]">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/QrI46EbSvyxcmozb/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      </div>
      <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Sound Meter
          </h1>
          <p className="mt-4 text-neutral-200 max-w-2xl mx-auto">
            Visualize sound with a modern, vibrant audio spectrum. Grant mic access to begin.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a href="#meter" className="inline-flex items-center rounded-md bg-red-600 hover:bg-red-500 transition-colors px-5 py-2.5 text-sm font-medium shadow-lg shadow-red-900/30">
              Start Measuring
            </a>
            <a href="#about" className="inline-flex items-center rounded-md border border-white/20 hover:bg-white/10 transition-colors px-5 py-2.5 text-sm font-medium">
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
