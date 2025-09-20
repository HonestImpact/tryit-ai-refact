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
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="container-premium py-8">
        {/* Header */}
        <div className="text-center mb-12 premium-fade-in">
          <h1 className="text-headline mb-3">
            TryIt-AI Kit
          </h1>
          <p className="text-body">Co-creating solutions with your discernment</p>
        </div>

        {/* Premium Notification */}
        {showNotification && (
          <div className="fixed top-6 right-6 z-50 premium-surface-elevated p-4 premium-scale-in">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg className="w-4 h-4 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-title">Micro-Tool Created</p>
                <p className="text-caption">Something useful just appeared in your sidebar</p>
              </div>
            </div>
          </div>
        )}

        {/* Premium Layout */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-180px)]">
            {/* Chat Area */}
            <div className="lg:col-span-8 flex flex-col">
              <div 
                ref={chatContainerRef}
                className="flex-1 premium-surface-elevated overflow-y-auto p-6 mb-6 premium-scroll"
              >
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl px-6 py-4 rounded-2xl ${
                        message.role === 'user' 
                          ? 'premium-button' 
                          : 'premium-surface'
                      }`}>
                        <p className="text-body whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="premium-surface px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-tertiary)' }}></div>
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-tertiary)', animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-tertiary)', animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-caption">Noah is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="flex-1 premium-input premium-focus"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="premium-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Artifact Generation Indicator */}
              {isGeneratingArtifact && (
                <div className="premium-surface-elevated p-6 premium-fade-in">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--success)', borderTopColor: 'transparent' }}></div>
                    <div>
                      <h3 className="text-title status-success">Creating Micro-Tool</h3>
                      <p className="text-caption">Building something useful for you...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Artifact Display */}
              {artifact && (
                <div className="premium-surface-elevated p-6 premium-scale-in">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 status-success rounded-full"></div>
                      <h3 className="text-title status-success">Micro-Tool Created</h3>
                    </div>
                    <button
                      onClick={downloadArtifact}
                      className="premium-button text-sm px-4 py-2"
                    >
                      Download
                    </button>
                  </div>
                  <h4 className="text-title mb-4">{artifact.title}</h4>
                  <div className="premium-surface p-4 rounded-lg text-caption whitespace-pre-wrap font-mono max-h-64 overflow-y-auto premium-scroll">
                    {artifact.content}
                  </div>
                </div>
              )}

              {/* Reasoning Panel */}
              {reasoning && (
                <div className="premium-surface p-6 premium-hover">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center justify-between w-full text-left mb-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }}></div>
                      <h3 className="text-title" style={{ color: 'var(--accent)' }}>How I Designed This</h3>
                    </div>
                    <span className="text-caption text-xl">{showReasoning ? '−' : '+'}</span>
                  </button>
                  {showReasoning && (
                    <div className="text-caption whitespace-pre-wrap leading-relaxed premium-surface p-4 rounded-lg">
                      {reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* Trust Indicators */}
              <div className="premium-surface p-6 premium-hover">
                <h3 className="text-title mb-6">Why This Is Different</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                      <svg className="w-3 h-3 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-body">Shows reasoning behind suggestions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                      <svg className="w-3 h-3 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-body">Admits uncertainty and limitations</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                      <svg className="w-3 h-3 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-body">Treats you as co-architect, not user</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                      <svg className="w-3 h-3 status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-body">Gets better when challenged</span>
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
