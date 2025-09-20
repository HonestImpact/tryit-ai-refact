'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Artifact {
  title: string;
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi, I'm Noah. I don't know why you're here or what you expect. Most AI tools oversell and underdeliver. This one's different, but you'll have to see for yourself. Want to test it with something small?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    try {
      // Call our API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add Noah's response
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);

      // Check if we should generate an artifact (more broad triggers)
      if (userMessage.length > 15 && (
        userMessage.toLowerCase().includes('frustrat') ||
        userMessage.toLowerCase().includes('annoying') ||
        userMessage.toLowerCase().includes('annoy') ||
        userMessage.toLowerCase().includes('problem') ||
        userMessage.toLowerCase().includes('difficult') ||
        userMessage.toLowerCase().includes('hate') ||
        userMessage.toLowerCase().includes('ugh') ||
        userMessage.toLowerCase().includes('wish') ||
        userMessage.toLowerCase().includes('struggle') ||
        data.content.toLowerCase().includes('co-create') ||
        data.content.toLowerCase().includes('micro-tool') ||
        data.content.toLowerCase().includes('build something')
      )) {
        await generateArtifact(userMessage, data.content);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Something went wrong on my end. Want to try that again? I learn from failures.' 
      }]);
    }

    setIsLoading(false);
  };

  const generateArtifact = async (userInput: string, response: string) => {
    setIsGeneratingArtifact(true);
    try {
      const artifactResponse = await fetch('/api/artifact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput, response }),
      });

      if (!artifactResponse.ok) {
        throw new Error('Failed to generate artifact');
      }

      const data = await artifactResponse.json();
      // Parse the response
      const lines = data.content.split('\n');
      const titleLine = lines.find(line => line.startsWith('TITLE:'));
      const toolStart = lines.findIndex(line => line.startsWith('TOOL:'));
      const reasoningStart = lines.findIndex(line => line.startsWith('REASONING:'));

      if (titleLine && toolStart !== -1) {
        const title = titleLine.replace('TITLE:', '').trim();
        const toolContent = lines.slice(toolStart + 1, reasoningStart !== -1 ? reasoningStart : undefined).join('\n').trim();
        const reasoningContent = reasoningStart !== -1 ? lines.slice(reasoningStart + 1).join('\n').trim() : '';

        // Add a small delay to make the artifact creation feel more intentional
        setTimeout(() => {
          setArtifact({ title, content: toolContent });
          setReasoning(reasoningContent);
          setIsGeneratingArtifact(false);
          
          // Show notification for the "holy shit" moment
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 4000);
        }, 800);
      } else {
        setIsGeneratingArtifact(false);
      }
    } catch (error) {
      console.error('Error generating artifact:', error);
      setIsGeneratingArtifact(false);
    }
  };

  const downloadArtifact = () => {
    if (!artifact) return;
    
    const content = `${artifact.title}\n\n${artifact.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            TryIt-AI Kit
          </h1>
          <p className="text-gray-300 text-lg">Co-creating solutions with your discernment</p>
        </div>

        {/* Notification for micro-tool creation */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl shadow-2xl border border-green-500/50 animate-in slide-in-from-right duration-500">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Micro-Tool Created!</p>
                <p className="text-sm opacity-90">Something useful just appeared in your sidebar</p>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Layout - No more jumping */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
            {/* Chat Area - Takes up most space */}
            <div className="lg:col-span-8 flex flex-col">
              <div 
                ref={chatContainerRef}
                className="flex-1 bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-600/50 overflow-y-auto p-6 mb-4 shadow-xl chat-scroll gentle-glow"
              >
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl px-6 py-4 rounded-2xl ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'bg-gray-700/80 text-gray-100 border border-gray-600/50'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700/80 text-gray-100 px-6 py-4 rounded-2xl border border-gray-600/50">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm">Noah is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Form - Fixed at bottom */}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="flex-1 px-6 py-4 bg-gray-800/60 backdrop-blur-xl border border-gray-600/50 rounded-xl respectful-focus transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Right Panel - Fixed height, no jumping */}
            <div className="lg:col-span-4 space-y-6">
              {/* Artifact Generation Indicator */}
              {isGeneratingArtifact && (
                <div className="bg-gradient-to-r from-green-800/40 to-green-700/40 backdrop-blur-xl rounded-2xl border border-green-600/50 p-6 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <h3 className="font-semibold text-green-400">Creating Micro-Tool</h3>
                      <p className="text-sm text-gray-300">Building something useful for you...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Artifact Display */}
              {artifact && (
                <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-600/50 p-6 shadow-xl micro-tool-created">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <h3 className="font-semibold text-green-400">Micro-Tool Created</h3>
                    </div>
                    <button
                      onClick={downloadArtifact}
                      className="text-sm bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      Download
                    </button>
                  </div>
                  <h4 className="font-semibold text-white mb-3 text-lg">{artifact.title}</h4>
                  <div className="bg-gray-900/80 p-4 rounded-xl text-sm whitespace-pre-wrap font-mono border border-gray-700/50 max-h-64 overflow-y-auto">
                    {artifact.content}
                  </div>
                </div>
              )}

              {/* Reasoning Panel */}
              {reasoning && (
                <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-600/50 p-6 shadow-xl">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center justify-between w-full text-left mb-3"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <h3 className="font-semibold text-blue-400">How I Designed This</h3>
                    </div>
                    <span className="text-gray-400 text-xl">{showReasoning ? '−' : '+'}</span>
                  </button>
                  {showReasoning && (
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-900/40 p-4 rounded-xl border border-gray-700/50">
                      {reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* Trust Indicators - Always visible */}
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-600/50 p-6 shadow-xl respectful-hover">
                <h3 className="font-semibold mb-4 text-gray-200 text-lg">Why This Is Different</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-lg mt-0.5 trust-indicator">✓</span>
                    <span className="text-gray-300">Shows reasoning behind suggestions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-lg mt-0.5 trust-indicator">✓</span>
                    <span className="text-gray-300">Admits uncertainty and limitations</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-lg mt-0.5 trust-indicator">✓</span>
                    <span className="text-gray-300">Treats you as co-architect, not user</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-lg mt-0.5 trust-indicator">✓</span>
                    <span className="text-gray-300">Gets better when challenged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
