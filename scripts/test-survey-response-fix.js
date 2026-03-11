/**
 * Manual E2E Test Script for Survey Response Recording Fix
 * 
 * Purpose: Verify that all questions in a multi-question survey are properly saved
 * with correct question IDs.
 * 
 * Prerequisites:
 * 1. Running Next.js dev server (npm run dev)
 * 2. Access to Supabase database
 * 3. Test user account created
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testSurveyTitle: `Multi-Question Test ${Date.now()}`,
  testQuestions: [
    "What's your biggest challenge with customer research?",
    "How do you currently collect user feedback?",
    "What tools do you use for user interviews?",
    "What's missing from your current setup?"
  ],
  expectedResponses: 4,
}

console.log('🧪 Starting Survey Response Recording Test')
console.log('==========================================')
console.log(`Survey: ${TEST_CONFIG.testSurveyTitle}`)
console.log(`Questions: ${TEST_CONFIG.expectedResponses}`)
console.log('')

// Step 1: Create Test Survey
async function createTestSurvey() {
  console.log('📝 Step 1: Creating test survey...')
  
  const surveyPayload = {
    id: `test-survey-${Date.now()}`,
    title: TEST_CONFIG.testSurveyTitle,
    decisionFocus: 'Testing response recording integrity',
    intent: 'product-research',
    templatePack: 'product-research',
    questions: TEST_CONFIG.testQuestions,
    questionCount: TEST_CONFIG.expectedResponses,
    status: 'published'
  }
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(surveyPayload)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create survey: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('✅ Survey created:', result.survey.id)
    return result.survey
  } catch (error) {
    console.error('❌ Error creating survey:', error.message)
    process.exit(1)
  }
}

// Step 2: Simulate Respondent Flow
async function simulateRespondentFlow(surveyId) {
  console.log('')
  console.log('👤 Step 2: Simulating respondent flow...')
  
  const responses = []
  
  for (let i = 0; i < TEST_CONFIG.testQuestions.length; i++) {
    const questionId = `q${i + 1}`
    console.log(`  Recording response for ${questionId}...`)
    
    // Create fake audio blob (1 second of silence in WebM format)
    const audioBlob = createFakeAudioBlob()
    
    const formData = new FormData()
    formData.append('audio', audioBlob, `${questionId}.webm`)
    formData.append('questionId', questionId)
    formData.append('surveyId', surveyId)
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/responses`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      responses.push({
        questionId,
        responseId: result.data.id,
        timestamp: result.data.timestamp
      })
      
      console.log(`  ✅ Response saved: ${result.data.id}`)
    } catch (error) {
      console.error(`  ❌ Failed to save ${questionId}:`, error.message)
      throw error
    }
  }
  
  console.log('✅ All responses submitted successfully')
  return responses
}

// Step 3: Verify Responses in Database
async function verifyResponses(surveyId, expectedCount) {
  console.log('')
  console.log('🔍 Step 3: Verifying responses...')
  
  try {
    const response = await fetch(
      `${TEST_CONFIG.baseUrl}/api/responses?surveyId=${encodeURIComponent(surveyId)}`,
      { credentials: 'include' }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch responses: ${response.statusText}`)
    }
    
    const data = await response.json()
    const responses = data.responses
    
    console.log(`  Found ${responses.length} responses`)
    
    // Check count
    if (responses.length !== expectedCount) {
      console.error(`  ❌ Expected ${expectedCount} responses, found ${responses.length}`)
      return false
    }
    
    // Check question IDs
    const expectedQuestionIds = Array.from({ length: expectedCount }, (_, i) => `q${i + 1}`)
    const actualQuestionIds = responses.map(r => r.questionId).sort()
    
    console.log('  Expected question IDs:', expectedQuestionIds.join(', '))
    console.log('  Actual question IDs:', actualQuestionIds.join(', '))
    
    const allPresent = expectedQuestionIds.every(id => actualQuestionIds.includes(id))
    
    if (!allPresent) {
      console.error('  ❌ Some question IDs are missing or incorrect')
      return false
    }
    
    // Check for duplicates
    const uniqueQuestionIds = new Set(actualQuestionIds)
    if (uniqueQuestionIds.size !== actualQuestionIds.length) {
      console.error('  ❌ Duplicate responses detected')
      return false
    }
    
    console.log('  ✅ All question IDs present and correct')
    console.log('  ✅ No duplicates found')
    
    return true
  } catch (error) {
    console.error('  ❌ Verification failed:', error.message)
    return false
  }
}

// Helper: Create fake audio blob
function createFakeAudioBlob() {
  // Minimal valid WebM file (silent audio)
  const webmHeader = new Uint8Array([
    0x1A, 0x45, 0xDF, 0xA3, // EBML header
    0x01, 0x00, 0x00, 0x00, // EBML version
    0x01, 0x00, 0x00, 0x00, // EBML read version
    0x01, 0x00, 0x00, 0x00, // EBML max ID length
    0x01, 0x00, 0x00, 0x00, // EBML max size length
    0x6F, 0x82, 0x88, // Document type: webm
    0x01, 0x00, 0x00, 0x00, // Document type version
    0x01, 0x00, 0x00, 0x00, // Document type read version
  ])
  
  return new Blob([webmHeader], { type: 'audio/webm' })
}

// Main test runner
async function runTest() {
  const startTime = Date.now()
  
  try {
    // Create survey
    const survey = await createTestSurvey()
    
    // Submit responses
    const responses = await simulateRespondentFlow(survey.id)
    
    // Verify
    const verified = await verifyResponses(survey.id, TEST_CONFIG.expectedResponses)
    
    // Summary
    console.log('')
    console.log('==========================================')
    console.log('📊 TEST SUMMARY')
    console.log('==========================================')
    console.log(`Survey ID: ${survey.id}`)
    console.log(`Responses Submitted: ${responses.length}`)
    console.log(`Verification: ${verified ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`)
    console.log('')
    
    if (verified) {
      console.log('🎉 All tests passed! The race condition fix is working.')
      console.log('')
      console.log('Next steps:')
      console.log('1. Manually verify in Supabase dashboard')
      console.log('2. Run this test 3 more times to confirm consistency')
      console.log('3. Test with different survey lengths (2, 5, 8 questions)')
      process.exit(0)
    } else {
      console.log('❌ Test failed. Check the errors above.')
      console.log('')
      console.log('Troubleshooting:')
      console.log('1. Ensure you are logged in with a valid session')
      console.log('2. Check that the API server is running')
      console.log('3. Review browser console for any errors')
      console.log('4. Verify database tables are properly configured')
      process.exit(1)
    }
  } catch (error) {
    console.error('')
    console.error('💥 Test crashed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
runTest()
