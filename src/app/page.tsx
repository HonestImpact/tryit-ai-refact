import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="container-premium section-spacing">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-20 premium-fade-in">
            <h1 className="text-display mb-6">
              TryIt-AI Kit
            </h1>
            <p className="text-headline text-body max-w-2xl mx-auto">
              For people who choose <span className="status-success font-medium">discernment</span> over blind trust
            </p>
          </div>

          {/* Main Value Proposition */}
          <div className="premium-surface-elevated p-16 mb-20 premium-hover premium-scale-in">
            <div className="text-center space-y-8">
              <h2 className="text-headline">
                Your skepticism is <span className="status-success">wisdom</span>.
              </h2>
              <p className="text-body text-lg max-w-2xl mx-auto">
                Most AI tools want your blind trust. This one earns it by letting you help define what good technology looks like.
              </p>
              
              <div className="pt-6">
                <Link href="/chat" className="premium-button inline-flex items-center">
                  Help define what good technology looks like
                  <svg className="ml-3 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="premium-surface p-8 text-center premium-hover premium-fade-in">
              <div className="w-12 h-12 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg className="w-6 h-6 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-title mb-3">Shows its reasoning</h3>
              <p className="text-caption">No black boxes. See how decisions are made.</p>
            </div>
            
            <div className="premium-surface p-8 text-center premium-hover premium-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg className="w-6 h-6 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-title mb-3">Admits when uncertain</h3>
              <p className="text-caption">Honest about limitations and unknowns.</p>
            </div>
            
            <div className="premium-surface p-8 text-center premium-hover premium-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg className="w-6 h-6 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-title mb-3">Gets better when challenged</h3>
              <p className="text-caption">Your pushback makes it stronger.</p>
            </div>
          </div>

          {/* Trust Building Footer */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center space-x-3 text-caption">
              <div className="w-2 h-2 status-success rounded-full"></div>
              <span>No data collection • No tracking • No manipulation</span>
            </div>
            <footer className="text-caption">
              Built by skeptics, improved by skeptics
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
