// Data sanitization utilities for privacy protection

export function sanitizeContent(content: string): string {
  if (!content) return '';
  
  return content
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    
    // Remove phone numbers (various formats)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}\.\d{3}\.\d{4}\b/g, '[PHONE]')
    
    // Remove URLs and domains
    .replace(/\bhttps?:\/\/[^\s]+\b/g, '[URL]')
    .replace(/\b[A-Za-z0-9._%+-]+\.[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[DOMAIN]')
    
    // Remove potential names (simple pattern - first name + last name)
    .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME]')
    
    // Remove IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
    
    // Remove potential usernames/IDs (long alphanumeric strings)
    .replace(/\b[A-Za-z0-9]{12,}\b/g, '[ID]')
    
    // Remove credit card patterns
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    
    // Remove addresses (basic pattern)
    .replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g, '[ADDRESS]')
    
    // Remove ZIP codes
    .replace(/\b\d{5}(?:-\d{4})?\b/g, '[ZIP]')
    
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function analyzeMessage(content: string): {
  containsChallenge: boolean;
  containsUncertainty: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  wordCount: number;
} {
  const challengeWords = [
    'wrong', 'disagree', 'doubt', 'skeptical', 'question', 'challenge', 
    'problem', 'issue', 'concern', 'criticism', 'objection', 'hesitant'
  ];
  
  const uncertaintyWords = [
    'maybe', 'perhaps', 'might', 'could', 'possibly', 'uncertain', 
    'unsure', 'not sure', 'don\'t know', 'unclear', 'confused'
  ];
  
  const positiveWords = [
    'good', 'great', 'excellent', 'love', 'like', 'helpful', 'useful', 
    'thanks', 'appreciate', 'perfect', 'amazing', 'wonderful', 'fantastic'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'hate', 'awful', 'useless', 'waste', 'stupid',
    'annoying', 'frustrating', 'disappointed', 'angry', 'upset'
  ];

  const lowerContent = content.toLowerCase();
  const words = content.split(/\s+/);

  const containsChallenge = challengeWords.some(word => lowerContent.includes(word));
  const containsUncertainty = uncertaintyWords.some(word => lowerContent.includes(word));
  
  const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
  }

  return {
    containsChallenge,
    containsUncertainty,
    sentiment,
    wordCount: words.length
  };
}

export function determineTrack(messages: Array<{ content: string; role: string }>): 'skeptical' | 'small-pain' | 'tiny-tool' | 'unknown' {
  const allContent = messages.map(m => m.content || '').join(' ').toLowerCase();
  
  if (allContent.includes('skeptical') || allContent.includes('doubt') || 
      allContent.includes('trust') || allContent.includes('suspicious')) {
    return 'skeptical';
  }
  
  if (allContent.includes('pain') || allContent.includes('problem') || 
      allContent.includes('frustrat') || allContent.includes('annoying') ||
      allContent.includes('difficult') || allContent.includes('struggle')) {
    return 'small-pain';
  }
  
  if (allContent.includes('tool') || allContent.includes('template') || 
      allContent.includes('micro') || allContent.includes('build') ||
      allContent.includes('create') || allContent.includes('make')) {
    return 'tiny-tool';
  }
  
  return 'unknown';
}

export function identifyConversationPattern(messages: Array<{ 
  containsChallenge: boolean; 
  containsUncertainty: boolean; 
  sentiment: string; 
  wordCount: number; 
}>): string {
  const patterns = [];
  
  const challengeCount = messages.filter(m => m.containsChallenge).length;
  const uncertaintyCount = messages.filter(m => m.containsUncertainty).length;
  const positiveCount = messages.filter(m => m.sentiment === 'positive').length;
  const totalMessages = messages.length;
  
  if (challengeCount > 2) {
    patterns.push('challenging');
  }
  
  if (uncertaintyCount > 1) {
    patterns.push('uncertain');
  }
  
  if (positiveCount > totalMessages / 2) {
    patterns.push('positive');
  }
  
  if (totalMessages > 15) {
    patterns.push('extended');
  }
  
  if (totalMessages < 5) {
    patterns.push('brief');
  }
  
  return patterns.join('-') || 'standard';
}

export function identifyArtifactType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('sleep') || lowerContent.includes('bedtime') || lowerContent.includes('rest')) {
    return 'sleep';
  }
  
  if (lowerContent.includes('email') || lowerContent.includes('template') || lowerContent.includes('message')) {
    return 'email';
  }
  
  if (lowerContent.includes('focus') || lowerContent.includes('concentration') || lowerContent.includes('attention')) {
    return 'focus';
  }
  
  if (lowerContent.includes('habit') || lowerContent.includes('routine') || lowerContent.includes('schedule')) {
    return 'habit';
  }
  
  if (lowerContent.includes('template') || lowerContent.includes('format') || lowerContent.includes('structure')) {
    return 'template';
  }
  
  if (lowerContent.includes('workflow') || lowerContent.includes('process') || lowerContent.includes('system')) {
    return 'workflow';
  }
  
  if (lowerContent.includes('checklist') || lowerContent.includes('list') || lowerContent.includes('steps')) {
    return 'checklist';
  }
  
  return 'general';
}
