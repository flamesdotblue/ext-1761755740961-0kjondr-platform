import React from 'react';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 mt-16">
      <div className="container mx-auto px-4 py-8 text-sm text-neutral-400 flex items-center justify-between">
        <p>© {new Date().getFullYear()} Sound Meter</p>
        <p>
          Built with Web Audio API • Designed with Tailwind CSS
        </p>
      </div>
    </footer>
  );
}
