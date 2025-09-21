// Debug script to test content parsing logic
const testResponse = `Ah, dealing with difficult clients - that's a real skill that comes with experience! Let me create something practical for you.

**The 5-Minute Client Reset**

**Step 1: Pause and Breathe**
- Take 3 deep breaths before responding
- Count to 5 silently
- Remind yourself: "Their frustration isn't personal"

**Step 2: Acknowledge First**
- "I hear that you're frustrated"
- "I understand this is important to you"
- "Let me make sure I understand correctly..."

**Step 3: Redirect to Solutions**
- "Here's what I can do immediately..."
- "Let's focus on fixing this"
- "What would make this right for you?"

**Step 4: Set Boundaries Kindly**
- "I want to help, and here's how we can move forward..."
- "I'm committed to resolving this within [timeframe]"

**Step 5: Document Everything**
- Write down their concern immediately
- Note your proposed solution
- Follow up in writing

This gives you a clear framework to stay professional and solution-focused, even when they're being unreasonable.`;

// Test the parsing logic
const lines = testResponse.split('\n');

// Test conversational filter - debug each line
console.log('\n=== DEBUGGING EACH LINE ===');
lines.forEach((line, i) => {
  const hasAsterisk = line.includes('**');
  const hasStep = line.includes('Step');
  const hasBullet = line.includes('•');
  const hasDash = line.trim().startsWith('- ');
  const hasToolPhrase = line.includes('Here\'s a micro-tool for you');
  const isEmpty = line.trim() === '';
  const hasConversational = (line.includes('Ah,') || line.includes('Let me') || line.includes('I can tell') || line.includes('The trick') || line.includes('Want to') || line.includes('This') || line.includes('So ') || line.includes('Perfect') || line.includes('Great') || line.includes('Okay') || line.includes('Sure') || line.includes('Absolutely') || line.includes('dealing with') || line.includes('framework') || line.includes('gives you'));
  
  console.log(`Line ${i}: "${line}"`);
  console.log(`  - hasAsterisk: ${hasAsterisk}, hasStep: ${hasStep}, hasBullet: ${hasBullet}, hasDash: ${hasDash}`);
  console.log(`  - hasToolPhrase: ${hasToolPhrase}, isEmpty: ${isEmpty}, hasConversational: ${hasConversational}`);
  console.log(`  - INCLUDED: ${!hasAsterisk && !hasStep && !hasBullet && !hasDash && !hasToolPhrase && !isEmpty && hasConversational}`);
  console.log('');
});

// Test conversational filter
const conversationalLines = lines.filter((line) => 
  !line.includes('**') && 
  !line.includes('Step') && 
  !line.includes('•') &&
  !line.trim().startsWith('- ') &&
  !line.includes('Here\'s a micro-tool for you') &&
  line.trim() !== '' &&
  (line.includes('Ah,') || line.includes('Let me') || line.includes('I can tell') || line.includes('The trick') || line.includes('Want to') || line.includes('This') || line.includes('So ') || line.includes('Perfect') || line.includes('Great') || line.includes('Okay') || line.includes('Sure') || line.includes('Absolutely') || line.includes('dealing with') || line.includes('framework') || line.includes('gives you'))
);

console.log('=== ORIGINAL RESPONSE ===');
console.log(testResponse);
console.log('\n=== CONVERSATIONAL LINES ===');
console.log(conversationalLines);
console.log('\n=== JOINED CONVERSATIONAL CONTENT ===');
console.log(conversationalLines.join('\n').trim());
console.log('\n=== IS EMPTY? ===');
console.log(conversationalLines.join('\n').trim() === '');
