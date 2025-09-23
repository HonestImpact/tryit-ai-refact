export function sanitizeContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}\.\d{3}\.\d{4}\b/g, '[PHONE]')
    .replace(/\bhttps?:\/\/[^\s]+\b/g, '[URL]')
    .replace(/\b[A-Za-z0-9._%+-]+\.[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[DOMAIN]')
    .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
    .replace(/\b[A-Za-z0-9]{12,}\b/g, '[ID]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    .replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g, '[ADDRESS]')
    .replace(/\b\d{5}(?:-\d{4})?\b/g, '[ZIP]')
    .replace(/\s+/g, ' ')
    .trim();
}
export function analyzeMessage(content: string): { containsChallenge: boolean; containsUncertainty: boolean; sentiment: 'positive' | 'neutral' | 'negative'; wordCount: number; } {
  const challengeWords = ['wrong','disagree','doubt','skeptical','question','challenge','problem','issue','concern','criticism','objection','hesitant'];
  const uncertaintyWords = ['maybe','perhaps','might','could','possibly','uncertain','unsure','not sure',"don't know",'unclear','confused'];
  const positiveWords = ['good','great','excellent','love','like','helpful','useful','thanks','appreciate','perfect','amazing','wonderful','fantastic'];
  const negativeWords = ['bad','terrible','hate','awful','useless','waste','stupid','annoying','frustrating','disappointed','angry','upset'];
  const lower = content.toLowerCase();
  const words = content.trim() ? content.split(/\s+/) : [];
  const containsChallenge = challengeWords.some(w => lower.includes(w));
  const containsUncertainty = uncertaintyWords.some(w => lower.includes(w));
  const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lower.includes(w)).length;
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';
  return { containsChallenge, containsUncertainty, sentiment, wordCount: words.length };
}
export function determineTrack(messages: Array<{ content: string; role: string }>): 'skeptical' | 'small-pain' | 'tiny-tool' | 'unknown' {
  const all = messages.map(m => m.content || '').join(' ').toLowerCase();
  if (all.includes('skeptical') || all.includes('doubt') || all.includes('trust') || all.includes('suspicious')) return 'skeptical';
  if (all.includes('pain') || all.includes('problem') || all.includes('frustrat') || all.includes('annoying') || all.includes('difficult') || all.includes('struggle')) return 'small-pain';
  if (all.includes('tool') || all.includes('template') || all.includes('micro') || all.includes('build') || all.includes('create') || all.includes('make')) return 'tiny-tool';
  return 'unknown';
}
export function identifyConversationPattern(messages: Array<{ containsChallenge: boolean; containsUncertainty: boolean; sentiment: string; wordCount: number; }>): string {
  const challengeCount = messages.filter(m => m.containsChallenge).length;
  const uncertaintyCount = messages.filter(m => m.containsUncertainty).length;
  const positiveCount = messages.filter(m => m.sentiment === 'positive').length;
  const total = messages.length;
  const patterns: string[] = [];
  if (challengeCount > 2) patterns.push('challenging');
  if (uncertaintyCount > 1) patterns.push('uncertain');
  if (positiveCount > total / 2) patterns.push('positive');
  if (total > 15) patterns.push('extended');
  if (total < 5) patterns.push('brief');
  return patterns.join('-') || 'standard';
}
export function identifyArtifactType(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('sleep') || lower.includes('bedtime') || lower.includes('rest')) return 'sleep';
  if (lower.includes('email') || lower.includes('template') || lower.includes('message')) return 'email';
  if (lower.includes('focus') || lower.includes('concentration') || lower.includes('attention')) return 'focus';
  if (lower.includes('habit') || lower.includes('routine') || lower.includes('schedule')) return 'habit';
  if (lower.includes('template') || lower.includes('format') || lower.includes('structure')) return 'template';
  if (lower.includes('workflow') || lower.includes('process') || lower.includes('system')) return 'workflow';
  if (lower.includes('checklist') || lower.includes('list') || lower.includes('steps')) return 'checklist';
  return 'general';
}
