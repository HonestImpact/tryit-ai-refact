'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  challenged?: boolean;
}

interface Artifact {
  title: string;
  content: string;
}

export default function TrustRecoveryProtocol() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
  const [skepticMode, setSkepticMode] = useState(false);
  const [trustLevel, setTrustLevel] = useState(50);
  const [challengedMessages, setChallengedMessages] = useState<Set<number>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change (but not on initial load)
  useEffect(() => {
    // Only auto-scroll if we have messages and it's not the initial load
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize messages and focus input on page load
  useEffect(() => {
    // Ensure page starts at the top
    window.scrollTo(0, 0);
    
    // Set initial message on client-side to prevent hydration mismatch
    setMessages([
      {
        role: 'assistant',
        content: "Hi, I'm Noah. I don't know why you're here or what you expect. Most AI tools oversell and underdeliver. This one's different, but you'll have to see for yourself. Want to test it with something small?",
        timestamp: Date.now()
      }
    ]);
    
    // Focus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const newMessages = [...messages, { 
      role: 'user' as const, 
      content: userMessage,
      timestamp: Date.now()
    }];
    setMessages(newMessages);

    try {
      // Call our API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: newMessages,
          skepticMode: skepticMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add Noah's response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.content,
        timestamp: Date.now()
      }]);

      // Adjust trust level based on response quality
      if (data.content.toLowerCase().includes('uncertain') || data.content.toLowerCase().includes('not sure')) {
        setTrustLevel(prev => Math.min(100, prev + 5));
      }

      // Check if Noah's response contains artifact content
      console.log('=== ARTIFACT DETECTION ===');
      console.log('Noah\'s full response:', data.content);
      
      // Check for both structured format (TITLE:/TOOL:) and natural format (bold headers)
      const hasStructuredMarkers = data.content.includes('TITLE:') && data.content.includes('TOOL:');
      const hasNaturalToolFormat = data.content.includes('**') && (
        data.content.includes('Step 1:') || 
        data.content.includes('Step 2:') || 
        data.content.includes('Step 3:') ||
        data.content.includes('**Step') ||
        data.content.includes('**How to') ||
        data.content.includes('**Tool:') ||
        data.content.includes('**Method:')
      );
      
      console.log('Contains TITLE?:', data.content.includes('TITLE:'));
      console.log('Contains TOOL?:', data.content.includes('TOOL:'));
      console.log('Has structured markers:', hasStructuredMarkers);
      console.log('Has natural tool format:', hasNaturalToolFormat);
      
      const hasArtifactMarkers = hasStructuredMarkers || hasNaturalToolFormat;
      console.log('Has artifact markers:', hasArtifactMarkers);
      if (hasArtifactMarkers) {
        console.log('Parsing artifact from Noah\'s response');
        // Parse the artifact directly from Noah's response
        const lines = data.content.split('\n');
        const titleLine = lines.find((line: string) => line.startsWith('TITLE:'));
        const toolStart = lines.findIndex((line: string) => line.startsWith('TOOL:'));
        const reasoningStart = lines.findIndex((line: string) => line.startsWith('REASONING:'));

        console.log('Parsing lines:', lines);
        console.log('Title line found:', titleLine);
        console.log('Tool start index:', toolStart);
        console.log('Reasoning start index:', reasoningStart);
        
        if (titleLine && toolStart !== -1) {
          const title = titleLine.replace('TITLE:', '').trim();
          const toolContent = lines.slice(toolStart + 1, reasoningStart !== -1 ? reasoningStart : undefined).join('\n').trim();
          const reasoningContent = reasoningStart !== -1 ? lines.slice(reasoningStart + 1).join('\n').trim() : '';

          console.log('=== PARSED ARTIFACT ===');
          console.log('Title:', title);
          console.log('Tool content:', toolContent);
          console.log('Reasoning content:', reasoningContent);

          // Remove the artifact content from Noah's message and keep only the conversational part
          const cleanContent = lines.filter((line: string) => 
            !line.startsWith('TITLE:') && 
            !line.startsWith('TOOL:') && 
            !line.startsWith('REASONING:') &&
            line.trim() !== ''
          ).join('\n').trim();

          // Update the last message with clean content
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content: cleanContent || "Here's a micro-tool for you:"
            };
            return newMessages;
          });

          // Set the artifact
          setTimeout(() => {
            setArtifact({ title, content: toolContent });
            setReasoning(reasoningContent);
          }, 800);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Something went wrong on my end. Want to try that again? I learn from failures.',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  };

  const generateArtifact = async (userInput: string, response: string) => {
    console.log('generateArtifact called with:', { userInput, response });
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
      console.log('Artifact API response:', data.content); // Debug log
      
      const lines = data.content.split('\n');
      const titleLine = lines.find((line: string) => line.startsWith('TITLE:'));
      const toolStart = lines.findIndex((line: string) => line.startsWith('TOOL:'));
      const reasoningStart = lines.findIndex((line: string) => line.startsWith('REASONING:'));

      if (titleLine && toolStart !== -1) {
        const title = titleLine.replace('TITLE:', '').trim();
        const toolContent = lines.slice(toolStart + 1, reasoningStart !== -1 ? reasoningStart : undefined).join('\n').trim();
        const reasoningContent = reasoningStart !== -1 ? lines.slice(reasoningStart + 1).join('\n').trim() : '';

        console.log('Parsed artifact:', { title, toolContent, reasoningContent }); // Debug log

        setTimeout(() => {
          setArtifact({ title, content: toolContent });
          setReasoning(reasoningContent);
          setIsGeneratingArtifact(false);
        }, 800);
      } else {
        console.log('Failed to parse artifact - missing TITLE or TOOL markers');
        console.log('Available lines:', lines);
        setIsGeneratingArtifact(false);
      }
    } catch (error) {
      console.error('Error generating artifact:', error);
      setIsGeneratingArtifact(false);
    }
  };

  const downloadArtifact = () => {
    console.log('Download clicked, artifact:', artifact); // Debug log
    if (!artifact) {
      console.log('No artifact to download');
      return;
    }
    
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
    console.log('Download completed');
  };

  const toggleSkepticMode = () => {
    setSkepticMode(!skepticMode);
    setTrustLevel(prev => Math.max(0, prev - 10));
  };

  const challengeMessage = async (messageIndex: number) => {
    if (isLoading) return;
    
    const message = messages[messageIndex];
    if (message.role !== 'assistant') return;
    
    // Mark as challenged
    setChallengedMessages(prev => new Set(prev).add(messageIndex));
    
    // Increase trust level for challenging (shows the system respects skepticism)
    setTrustLevel(prev => Math.min(100, prev + 3));
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(0, messageIndex + 1),
            {
              role: 'user',
              content: `I want to challenge your previous response: "${message.content}". Can you think about this differently or explain your reasoning more clearly?`
            }
          ],
          trustLevel,
          skepticMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add the challenge response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.content,
        timestamp: Date.now()
      }]);

      // Adjust trust level based on response quality
      if (data.content.toLowerCase().includes('uncertain') || data.content.toLowerCase().includes('not sure')) {
        setTrustLevel(prev => Math.min(100, prev + 5));
      }

      // Check if the challenge response contains artifact content
      const hasArtifactMarkers = data.content.includes('TITLE:') && data.content.includes('TOOL:');
      
      if (hasArtifactMarkers) {
        // Parse the artifact directly from the challenge response
        const lines = data.content.split('\n');
        const titleLine = lines.find((line: string) => line.startsWith('TITLE:'));
        const toolStart = lines.findIndex((line: string) => line.startsWith('TOOL:'));
        const reasoningStart = lines.findIndex((line: string) => line.startsWith('REASONING:'));

        if (titleLine && toolStart !== -1) {
          const title = titleLine.replace('TITLE:', '').trim();
          const toolContent = lines.slice(toolStart + 1, reasoningStart !== -1 ? reasoningStart : undefined).join('\n').trim();
          const reasoningContent = reasoningStart !== -1 ? lines.slice(reasoningStart + 1).join('\n').trim() : '';

          // Remove the artifact content from the challenge response
          const cleanContent = lines.filter((line: string) => 
            !line.startsWith('TITLE:') && 
            !line.startsWith('TOOL:') && 
            !line.startsWith('REASONING:') &&
            line.trim() !== ''
          ).join('\n').trim();

          // Update the last message with clean content
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content: cleanContent || "Here's a micro-tool for you:"
            };
            return newMessages;
          });

          // Set the artifact
          setTimeout(() => {
            setArtifact({ title, content: toolContent });
            setReasoning(reasoningContent);
          }, 800);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I appreciate the challenge, but I\'m having trouble responding right now. Want to try that again?',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200/60 backdrop-blur-sm bg-white/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">TryIt-AI Kit</h1>
                <p className="text-sm text-slate-500">Trust Recovery Protocol</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Trust Level Indicator */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-slate-600">Trust Level</span>
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000 ease-out"
                    style={{ width: `${trustLevel}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-slate-500 w-8">{trustLevel}%</span>
              </div>

              {/* Skeptic Mode Toggle */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleSkepticMode}
                  className={`inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    skepticMode ? 'bg-red-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      skepticMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-600">
                  {skepticMode ? 'Skeptic Mode ON' : 'Skeptic Mode OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Hero Section */}
            <div className="mb-12">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-4">
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                For people who choose discernment over blind trust
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Your skepticism is <span className="text-blue-600">wisdom</span>
              </h1>
              
              <p className="text-xl text-slate-600 leading-relaxed max-w-3xl">
                Most AI tools want your blind trust. This one earns it by letting you help define what good technology looks like.
              </p>
            </div>

            {/* Conversation */}
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className="group">
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-2xl">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl rounded-br-md shadow-lg">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 text-right">
                          {new Date(message.timestamp!).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-2xl">
                        <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-bl-md shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-slate-600">N</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-800 leading-relaxed">{message.content}</p>
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-xs text-slate-500">
                                  {new Date(message.timestamp!).toLocaleTimeString()}
                                </div>
                                {!challengedMessages.has(index) && (
                                  <button
                                    onClick={() => challengeMessage(index)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  >
                                    Challenge this →
                                  </button>
                                )}
                                {challengedMessages.has(index) && (
                                  <div className="text-xs text-green-600 font-medium">
                                    ✓ Challenged
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl">
                    <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-bl-md shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                        <div className="text-slate-600 text-sm">Noah is thinking...</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="mt-8">
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Continue the conversation..."
                    className="w-full px-6 py-4 pr-24 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400 resize-none min-h-[3.5rem] max-h-32 overflow-y-auto"
                    disabled={isLoading}
                    rows={1}
                    style={{
                      height: 'auto',
                      minHeight: '3.5rem'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    tabIndex={0}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Artifact Generation */}
              {isGeneratingArtifact && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-fade-in-up">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Creating Tool</h3>
                      <p className="text-sm text-slate-600">Building something useful...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Artifact Display */}
              {artifact && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-fade-in-up">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Micro-Tool Created</h3>
                      <p className="text-sm text-slate-600">{artifact.title}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {artifact.content}
                    </pre>
                  </div>
                  
                  <button
                    onClick={downloadArtifact}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-sm"
                  >
                    Download Tool
                  </button>
                </div>
              )}

              {/* Reasoning Panel */}
              {reasoning && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-slate-900">How I Designed This</h3>
                    <span className="text-slate-400">{showReasoning ? '−' : '+'}</span>
                  </button>
                  {showReasoning && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Trust Indicators */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Trust Recovery Protocol</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">Interactive skepticism - challenge any response</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">Skeptic mode - Noah becomes your devil&apos;s advocate</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">Real-time trust meter - see your confidence grow</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">Co-create micro-tools for your specific needs</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t border-slate-200">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-500">No tracking • No name or email required</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Built by skeptics, improved by skeptics</p>
                <div className="flex items-center justify-center">
                  <a 
                    href="/archive" 
                    className="text-xs text-slate-600 hover:text-slate-800 transition-colors font-medium"
                  >
                    View Archive Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}