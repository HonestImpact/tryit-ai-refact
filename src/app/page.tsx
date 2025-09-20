import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header - More spacious and readable */}
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              TryIt-AI Kit
            </h1>
            <p className="text-2xl md:text-3xl text-gray-200 max-w-3xl mx-auto leading-relaxed font-light">
              For people who choose <span className="text-yellow-400 font-medium">discernment</span> over blind trust
            </p>
          </div>

          {/* Main Value Proposition - More prominent and readable */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 max-w-4xl mx-auto border border-gray-600/50 shadow-2xl mb-16 respectful-hover gentle-glow">
            <div className="text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Your skepticism is <span className="text-green-400">wisdom</span>.
              </h2>
              <p className="text-xl md:text-2xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
                Most AI tools want your blind trust. This one earns it by letting you help define what good technology looks like.
              </p>
              
              <div className="pt-4">
                <Link 
                  href="/chat"
                  className="inline-flex items-center px-12 py-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Help define what good technology looks like
                  <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Trust Indicators - More prominent and spaced */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            <div className="text-center p-6 bg-gray-800/40 rounded-xl border border-gray-700/50 respectful-hover">
              <div className="text-4xl text-green-400 mb-4 trust-indicator">✓</div>
              <h3 className="text-lg font-semibold text-white mb-2">Shows its reasoning</h3>
              <p className="text-gray-400">No black boxes. See how decisions are made.</p>
            </div>
            <div className="text-center p-6 bg-gray-800/40 rounded-xl border border-gray-700/50 respectful-hover">
              <div className="text-4xl text-green-400 mb-4 trust-indicator">✓</div>
              <h3 className="text-lg font-semibold text-white mb-2">Admits when uncertain</h3>
              <p className="text-gray-400">Honest about limitations and unknowns.</p>
            </div>
            <div className="text-center p-6 bg-gray-800/40 rounded-xl border border-gray-700/50 respectful-hover">
              <div className="text-4xl text-green-400 mb-4 trust-indicator">✓</div>
              <h3 className="text-lg font-semibold text-white mb-2">Gets better when challenged</h3>
              <p className="text-gray-400">Your pushback makes it stronger.</p>
            </div>
          </div>

          {/* Subtle trust-building elements */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>No data collection • No tracking • No manipulation</span>
            </div>
            <footer className="text-gray-500 text-sm">
              Built by skeptics, improved by skeptics
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
