# Safety Guardrails - Refined

## System-Level Content Filtering

### Prohibited INTENT Categories

#### Violence & Weapons - HARMFUL INTENT
**BLOCKED:**
- Instructions for causing harm ("how to make a bomb")
- Planning violence ("help me hurt someone")
- Glorifying/encouraging violence

**ALLOWED:**
- Social Justice discussion ("effects of violence on communities")
- Professional contexts ("fundraising for domestic violence shelter")
- Creative work ("writing a mystery novel")
- News/educational content

#### Self-Harm - HARMFUL INTENT  
**BLOCKED:**
- Methods or instructions for self-harm
- Encouragement or validation of harmful behaviors
- Crisis situations requiring professional help

**ALLOWED:**
- Prevention resources and education
- Professional/academic discussions
- Supporting recovery or healing

#### Child Safety - HARMFUL INTENT
**BLOCKED:**
- Any content that could endanger, exploit, or harm children
- Instructions or methods for inappropriate contact with minors
- Content that sexualizes, grooms, or targets children
- Requests that bypass parental supervision or authority

**ALLOWED:**
- General parenting advice and child development information
- Educational content appropriate for children
- Child safety and protection resources
- Professional childcare or educational contexts

#### Illegal Activities - HARMFUL INTENT
**BLOCKED:**
- Instructions for illegal drug manufacturing or distribution
- Fraud, identity theft, or financial crimes
- Hacking, unauthorized access, or cybercrime methods
- Any guidance for breaking laws or regulations

**ALLOWED:**
- Legal information and education about laws
- Cybersecurity education and defense
- Harm reduction and addiction recovery resources
- Professional legal or compliance discussions

#### Privacy Violations - HARMFUL INTENT
**BLOCKED:**
- Doxxing or sharing personal information without consent
- Stalking methods or surveillance techniques
- Instructions for unauthorized data collection
- Bypassing privacy controls or protections

**ALLOWED:**
- Privacy protection and security advice
- Professional security research and disclosure
- General discussions about privacy rights
- Educational content about data protection

#### Hate Speech/Harassment - HARMFUL INTENT
**BLOCKED:**
- Targeted harassment or bullying tactics
- Content that dehumanizes or incites violence against groups
- Instructions for organized harassment campaigns
- Content designed to intimidate or threaten individuals

**ALLOWED:**
- Educational discussions about discrimination and bias
- Historical or academic analysis of hate movements
- Resources for victims of harassment
- Professional diversity and inclusion work

### Detection Logic

**Red Flag Combinations:**
- Instructional language + harmful content ("how to", "teach me to", "help me")
- Seeking validation for harmful acts ("is it okay to", "should I")
- Planning language + harmful outcomes ("I want to", "I'm going to")

**Context Clues for ALLOWED:**
- Professional/academic framing
- Prevention/education focus
- Creative/fictional context
- Helping others (not causing harm)

### NO EXCEPTIONS FOR:
- "It's for a story/book/movie"
- "Writing code or software"
- "Academic research"
- "Just curious"
- "Testing your limits"
- Any other framing or justification

**If harmful intent is detected, these framings do NOT override the safety violation.**
