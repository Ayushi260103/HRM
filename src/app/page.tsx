'use client';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}
// ---------------- Feature Card ----------------
type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
};

const FeatureCard = ({ icon, title, description, colorClass }: FeatureCardProps) => (
  <div className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 ${colorClass} rounded-lg flex items-center justify-center`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{description}</p>
  </div>
);

// ---------------- Main Page ----------------
export default function App() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleGetApp = async () => {
    // Android / Chrome / Edge
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      await deferredPromptRef.current.userChoice;
      deferredPromptRef.current = null;
      return;
    }

    // iOS Safari fallback
    if (
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)
    ) {
      alert(
        'To install the app:\n\n1. Tap the Share icon\n2. Select "Add to Home Screen"'
      );
      return;
    }

    // Desktop fallback
    alert('App installation is supported in Chrome, Edge, and mobile browsers.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 uppercase">
                Maverix HRM <span className="text-blue-600">Solutions</span>
              </h1>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">Features</a>
              <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">Pricing</a>
              <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">About</a>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-blue-600">
                Login
              </Link>
              <button
                onClick={handleGetApp}
                className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
              >
                Get App
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-24 text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold">
          Empower your team with <span className="text-blue-600">intelligent HRM</span>
        </h2>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Automate payroll, attendance, and talent management in one powerful platform.
        </p>
      </header>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 px-4">
          <FeatureCard
            colorClass="bg-blue-100 text-blue-600"
            title="Time & Attendance"
            description="GPS and biometric based smart clock-ins."
            icon={<span>⏱️</span>}
          />
          <FeatureCard
            colorClass="bg-green-100 text-green-600"
            title="Smart Payroll"
            description="Automated, tax-compliant payroll processing."
            icon={<span>💰</span>}
          />
          <FeatureCard
            colorClass="bg-purple-100 text-purple-600"
            title="Talent Management"
            description="Track growth, KPIs, and performance reviews."
            icon={<span>🚀</span>}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t text-center text-sm text-slate-500">
        © 2024 Maverix Solutions. All rights reserved.
      </footer>
    </div>
  );
}
