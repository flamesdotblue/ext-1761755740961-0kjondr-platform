import React from 'react';
import Hero from './components/Hero';
import SoundMeter from './components/SoundMeter';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Hero />
      <main className="relative z-10 container mx-auto px-4 py-12">
        <section className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Real-time Sound Meter</h2>
            <p className="mt-3 text-neutral-300 max-w-2xl mx-auto">
              Measure ambient sound levels in your environment using your microphone. Visualize audio in real time and monitor approximate loudness.
            </p>
          </div>
          <SoundMeter />
        </section>
      </main>
      <Footer />
    </div>
  );
}
