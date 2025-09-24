import { describe, it, expect } from 'vitest';
import {
  sanitizeContent,
  analyzeMessage,
  determineTrack,
  identifyConversationPattern,
  identifyArtifactType,
} from '@/lib/message-analyzer';

describe('message-analyzer', () => {
  it('sanitizes emails, phones, urls, and ids', () => {
    const input =
      'Contact me at jane.doe@example.com or (555) 123-4567 https://example.com ABCDEFGHIJKLM';
    const out = sanitizeContent(input);
    expect(out).not.toContain('jane.doe@example.com');
    expect(out).not.toContain('(555) 123-4567');
    expect(out).not.toContain('https://example.com');
    expect(out).toContain('[EMAIL]');
    expect(out).toContain('[PHONE]');
    expect(out).toContain('[URL]');
    expect(out).toContain('[ID]');
  });

  it('analyzes sentiment and flags challenge/uncertainty', () => {
    const analysis = analyzeMessage('I doubt this is good, maybe wrong');
    expect(analysis.containsChallenge).toBe(true);
    expect(analysis.containsUncertainty).toBe(true);
    expect(['positive', 'neutral', 'negative']).toContain(analysis.sentiment);
    expect(analysis.wordCount).toBeGreaterThan(0);
  });

  it('determines track from messages', () => {
    const skeptical = determineTrack([{ role: 'user', content: 'I am skeptical and have doubts' }]);
    expect(skeptical).toBe('skeptical');
    const tinyTool = determineTrack([{ role: 'user', content: 'This tool can help build a template' }]);
    expect(tinyTool).toBe('tiny-tool');
  });

  it('identifies conversation pattern from analyzed messages', () => {
    const msgs = [
      { containsChallenge: true, containsUncertainty: false, sentiment: 'neutral', wordCount: 5 },
      { containsChallenge: true, containsUncertainty: false, sentiment: 'positive', wordCount: 5 },
      { containsChallenge: true, containsUncertainty: true, sentiment: 'positive', wordCount: 5 },
    ];
    const pattern = identifyConversationPattern(msgs);
    expect(pattern).toContain('challenging');
  });

  it('identifies artifact type from content', () => {
    expect(identifyArtifactType('Email template for outreach')).toBe('email');
    const type = identifyArtifactType('Sleep routine checklist');
    expect(['sleep', 'checklist', 'habit']).toContain(type);
  });
});
