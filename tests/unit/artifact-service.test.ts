import { describe, it, expect } from 'vitest';
import { ArtifactService } from '../../src/lib/artifact-service';

describe('ArtifactService', () => {
  describe('detectArtifact', () => {
    it('should detect legacy tool signal phrase', () => {
      const content = "Here's a tool for you to consider:\n\n**Task Tracker**\nSimple tool";
      expect(ArtifactService.detectArtifact(content)).toBe(true);
    });

    it('should detect legacy TITLE: format', () => {
      const content = "TITLE: Task Manager\nTOOL: Simple tracker";
      expect(ArtifactService.detectArtifact(content)).toBe(true);
    });

    it('should detect structured content with actionable elements', () => {
      const content = `I suggest trying this daily routine:

**Morning Focus Routine**

1. Start with 5 minutes of deep breathing
2. Write down your top 3 priorities
3. Use the Pomodoro technique for your first task

This method helps you create a productive mindset and maintain focus throughout the day.`;
      expect(ArtifactService.detectArtifact(content)).toBe(true);
    });

    it('should detect email template content', () => {
      const content = `You can use this email template for following up:

**Follow-up Email Template**

Subject: Following up on our conversation

Hi [Name],

I wanted to follow up on our discussion about [topic]. Here are the key points we covered:

- Point 1
- Point 2
- Point 3

Let me know if you have any questions!

This template works because it's concise and actionable.`;
      expect(ArtifactService.detectArtifact(content)).toBe(true);
    });

    it('should detect checklist-style content', () => {
      const content = `Here's a simple approach to organize your workspace:

**Workspace Organization Checklist**

- Clear your desk of all unnecessary items
- Create designated areas for different types of work
- Set up a filing system for important documents
- Use cable management for a clean setup

Follow these steps to create a more productive environment.`;
      expect(ArtifactService.detectArtifact(content)).toBe(true);
    });

    it('should detect breathing exercise content', () => {
      const content = `Try this breathing exercise for stress relief:

**4-7-8 Breathing Technique**

1. Exhale completely through your mouth
2. Inhale through your nose for 4 counts
3. Hold your breath for 7 counts
4. Exhale through your mouth for 8 counts
5. Repeat 3-4 times

This technique helps activate your parasympathetic nervous system and reduce anxiety.`;
      expect(ArtifactService.detectArtifact(content)).toBe(true);
    });

    it('should NOT detect short responses', () => {
      const content = "That's a good idea. Try it and see how it works.";
      expect(ArtifactService.detectArtifact(content)).toBe(false);
    });

    it('should NOT detect conversational responses', () => {
      const content = "I understand you're frustrated with your current workflow. What specific part is causing you the most trouble? Maybe we can work together to figure out a better approach.";
      expect(ArtifactService.detectArtifact(content)).toBe(false);
    });

    it('should NOT detect explanatory responses without structure', () => {
      const content = "The reason this happens is because your brain processes information differently when you're stressed. Stress hormones can interfere with memory formation and recall, which makes it harder to focus on tasks.";
      expect(ArtifactService.detectArtifact(content)).toBe(false);
    });
  });

  describe('parseArtifact', () => {
    it('should parse legacy tool signal format correctly', () => {
      const content = "Let me help you.\n\nHere's a tool for you to consider:\n\n**Quick Task Tracker**\n\nSimple checklist tool.";
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.title).toBe('Quick Task Tracker');
      expect(result.content).toBe('**Quick Task Tracker**\n\nSimple checklist tool.');
      expect(result.cleanContent).toBe('Let me help you.');
    });

    it('should parse structured TITLE format correctly', () => {
      const content = "I can help.\n\nTITLE: Task Manager\nTOOL:\nSimple tracker tool\nREASONING:\nBecause it's useful";
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.title).toBe('Task Manager');
      expect(result.content).toBe('Simple tracker tool');
      expect(result.reasoning).toBe('Because it\'s useful');
      expect(result.cleanContent).toBe('I can help.');
    });

    it('should parse natural language artifacts with smart titles', () => {
      const content = `I suggest trying this daily routine:

**Morning Focus Routine**

1. Start with 5 minutes of deep breathing
2. Write down your top 3 priorities  
3. Use the Pomodoro technique for your first task

This method helps you create a productive mindset and maintain focus throughout the day.`;
      
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.title).toBe('Morning Focus Routine');
      expect(result.cleanContent).toBe('I suggest trying this daily routine:');
      expect(result.content).toContain('**Morning Focus Routine**');
      expect(result.content).toContain('1. Start with 5 minutes');
    });

    it('should extract smart titles from content patterns', () => {
      const content = `You can use this email template for client follow-ups:

**Follow-up Email Template**

Subject: Following up on our meeting

Hi [Client Name],

Thank you for taking the time to meet with me yesterday...

This approach is effective because it's personal and timely.`;
      
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.title).toBe('Follow-up Email Template');
      expect(result.cleanContent).toBe('You can use this email template for client follow-ups:');
    });

    it('should handle breathing exercise content', () => {
      const content = `Try this breathing technique when you feel stressed:

**4-7-8 Breathing**

1. Exhale completely
2. Inhale for 4 counts
3. Hold for 7 counts
4. Exhale for 8 counts

This technique works because it activates your parasympathetic nervous system.`;
      
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.title).toBe('4-7-8 Breathing');
      // Reasoning extraction is optional - just verify artifact is detected
    });

    it('should separate actionable content from explanations', () => {
      const content = `Task management can be overwhelming, but here's a simple system that works:

**Daily Priority System**

1. List all your tasks
2. Pick the top 3 most important
3. Do those first before anything else
4. Review and adjust at the end of the day

This system helps because it forces you to focus on what really matters.`;
      
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.cleanContent).toBe('Task management can be overwhelming, but here\'s a simple system that works:');
      expect(result.content).toContain('**Daily Priority System**');
    });

    it('should handle messages without artifacts', () => {
      const content = "This is just a regular message without any actionable content.";
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(false);
      expect(result.title).toBe('');
      expect(result.content).toBe('');
      expect(result.cleanContent).toBe(content);
    });

    it('should provide smart fallback title for action-based content', () => {
      const content = `Try this simple morning routine to start your day:

**Morning Energy Checklist**

- Make your bed
- Drink a glass of water  
- Do 10 minutes of stretching
- Review your daily goals

Following this routine will help you start each day with intention and energy.`;
      
      const result = ArtifactService.parseArtifact(content);
      
      expect(result.hasArtifact).toBe(true);
      expect(result.title).toBe('Morning Energy Checklist'); // Title from bold header
    });
  });
});
