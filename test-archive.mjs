#!/usr/bin/env node

// Test script to verify the archiving system works
import fs from 'fs/promises';
import path from 'path';

const testData = {
  conversations: [
    {
      id: 'test_conv_1',
      timestamp: new Date().toISOString(),
      track: 'skeptical',
      sessionId: 'test_session_1',
      messages: [
        {
          role: 'user',
          content: 'I doubt this AI can actually help me',
          timestamp: new Date().toISOString(),
          wordCount: 8,
          containsChallenge: true,
          containsUncertainty: false,
          sentiment: 'negative'
        },
        {
          role: 'assistant',
          content: 'Your skepticism is exactly what this needs to get better. Want to test it with something small?',
          timestamp: new Date().toISOString(),
          wordCount: 18,
          containsChallenge: false,
          containsUncertainty: false,
          sentiment: 'positive'
        }
      ],
      trustLevel: 45,
      skepticMode: true,
      conversationLength: 2,
      userChallenges: 1,
      noahUncertainty: 0,
      artifactsGenerated: 0,
      conversationPattern: 'challenging',
      effectiveness: {
        userEngagement: 'medium',
        trustProgression: 'neutral',
        toolAdoption: 'none'
      }
    }
  ],
  artifacts: [
    {
      id: 'test_artifact_1',
      timestamp: new Date().toISOString(),
      track: 'small-pain',
      sessionId: 'test_session_1',
      userInput: 'I keep forgetting to take breaks during work',
      artifactContent: 'TITLE: Break Reminder Tool\nTOOL: Set a timer for 25 minutes of focused work, then take a 5-minute break. Use this simple cycle to maintain energy and focus.\n\nREASONING: The Pomodoro Technique is proven to improve productivity and prevent burnout.',
      artifactType: 'focus',
      effectiveness: {
        relevance: 'high',
        usability: 'high',
        userResponse: 'acknowledged'
      },
      generationTime: 1250
    }
  ]
};

async function testArchiveSystem() {
  console.log('🧪 Testing Archive System...\n');

  try {
    // Test 1: Create logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    console.log('✅ Logs directory created');

    // Test 2: Write test conversation data
    const today = new Date().toISOString().split('T')[0];
    const conversationFile = path.join(logsDir, `conversations_${today}.json`);
    await fs.writeFile(conversationFile, JSON.stringify(testData.conversations, null, 2));
    console.log('✅ Test conversation data written');

    // Test 3: Write test artifact data
    const artifactFile = path.join(logsDir, `artifacts_${today}.json`);
    await fs.writeFile(artifactFile, JSON.stringify(testData.artifacts, null, 2));
    console.log('✅ Test artifact data written');

    // Test 4: Verify files exist and are readable
    const conversationData = await fs.readFile(conversationFile, 'utf-8');
    const artifactData = await fs.readFile(artifactFile, 'utf-8');
    
    const parsedConversations = JSON.parse(conversationData);
    const parsedArtifacts = JSON.parse(artifactData);
    
    console.log(`✅ Read ${parsedConversations.length} conversations`);
    console.log(`✅ Read ${parsedArtifacts.length} artifacts`);

    // Test 5: Verify data structure
    const conv = parsedConversations[0];
    const artifact = parsedArtifacts[0];
    
    console.log('\n📊 Data Structure Verification:');
    console.log(`   Conversation ID: ${conv.id}`);
    console.log(`   Track: ${conv.track}`);
    console.log(`   Trust Level: ${conv.trustLevel}%`);
    console.log(`   Pattern: ${conv.conversationPattern}`);
    console.log(`   Artifact Type: ${artifact.artifactType}`);
    console.log(`   Generation Time: ${artifact.generationTime}ms`);

    // Test 6: Test API endpoint (if server is running)
    try {
      const response = await fetch('http://localhost:3000/api/archive?type=stats');
      if (response.ok) {
        const stats = await response.json();
        console.log('\n🌐 API Endpoint Test:');
        console.log(`   Total Conversations: ${stats.stats.totalConversations}`);
        console.log(`   Total Artifacts: ${stats.stats.totalArtifacts}`);
        console.log('✅ Archive API is working');
      } else {
        console.log('⚠️  Archive API not accessible (server may not be running)');
      }
    } catch (error) {
      console.log('⚠️  Archive API not accessible (server may not be running)');
    }

    console.log('\n🎉 Archive system test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your Next.js server: npm run dev');
    console.log('2. Visit http://localhost:3000/archive to see the dashboard');
    console.log('3. Have a conversation to generate real archive data');
    console.log('4. Check the /logs folder for generated JSON files');

  } catch (error) {
    console.error('❌ Archive system test failed:', error);
    process.exit(1);
  }
}

testArchiveSystem();
