// index.js (or getAnalysis.js)

const { Client } = require('@elastic/elasticsearch');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { v4: uuidv4 } = require('uuid');
const { TextDecoder } = require('util'); // Node 18+ typically includes it, but we import to be safe

// ----------------- Elasticsearch Client Setup -----------------
const esClient = new Client({
  node: 'https://abae8b591064454f8a57ba1fa55aa13f.asia-southeast1.gcp.elastic-cloud.com:443',
  auth: {
    apiKey: ''
  }
});

const ES_CONVO_INDEX = 'conversations';
const ES_HEALTH_INDEX = 'health_metrics_index';
const ES_DISEASE_INDEX = 'diseases_index';

// ----------------- Bedrock Client Setup -----------------
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-west-2', // or your chosen region for Bedrock
  credentials: {
    accessKeyId: '', // <-- store in env for security
    secretAccessKey: '' // <-- store in env for security
  }
});

// ----------------- Main Lambda Handler -----------------
exports.handler = async (event) => {
  try {
    // 1) Parse input from event
    let payload;
    if (typeof event.body === 'string') {
      payload = JSON.parse(event.body);
    } else {
      payload = event.body || event;
    }

    const { conversationId, userMessage, symptoms, userId } = payload;

    if (!conversationId || !userMessage || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing conversationId or userMessage or userId' })
      };
    }

    console.log("Fetching conversation:", conversationId);

    // 2) Retrieve existing conversation from Elasticsearch
    let conversationDoc;
    try {
      const getResp = await esClient.get({
        index: ES_CONVO_INDEX,
        id: conversationId
      });
      // In newer ES client versions, the doc is in getResp.body._source
      // In older versions, it's often getResp._source
      // We'll handle both:
      conversationDoc = getResp.body?._source || getResp._source;
      console.log("Existing Conversation Doc:", JSON.stringify(conversationDoc));
    } catch (err) {
      console.error('Error retrieving conversation doc:', err);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Conversation not found' })
      };
    }

    // 3) Extract existing messages
    const historicalMessages = conversationDoc.messages || [];

    // 4) Fetch user health data (optional)
    let userHealthData = null;
    if (userId) {
      try {
        // Suppose your user docs are in "health_metrics_index", keyed by "user_id"
        const healthResp = await esClient.search({
          index: ES_HEALTH_INDEX,
          body: {
            query: {
              term: { user_id: userId }
            }
          }
        });
        // In newer ES: hits in healthResp.body.hits.hits
        // In older ES: healthResp.hits.hits
        const hits = healthResp.body?.hits?.hits || healthResp.hits?.hits || [];
        if (hits.length > 0) {
          userHealthData = hits[0]._source;
        }
      } catch (err) {
        console.error('Error retrieving user health data:', err);
      }
    }

    // 5) Fuzzy search on diseases_index if symptoms given
    let matchedDiseaseInfo = [];
    if (Array.isArray(symptoms) && symptoms.length > 0) {
      const fuzzyClauses = symptoms.map(sym => ({
        match: {
          symptoms: {
            query: sym,
            fuzziness: 'AUTO'
          }
        }
      }));

      const diseaseQuery = {
        index: ES_DISEASE_INDEX,
        body: {
          query: {
            bool: {
              should: fuzzyClauses,
              minimum_should_match: 1
            }
          }
        }
      };

      try {
        const diseaseResp = await esClient.search(diseaseQuery);
        const hits = diseaseResp.body?.hits?.hits || diseaseResp.hits?.hits || [];
        matchedDiseaseInfo = hits.map(h => h._source);
      } catch (err) {
        console.error('Error searching disease info (fuzzy):', err);
      }
    }

    // 6) Build the chat messages array (Claude "Messages" API)
const systemMessage = {
  role: 'user',
  content: 'You are a helpful AI assistant providing medical advice. This is not professional medical advice.'
};

// Convert historical messages from { role: 'assistant'|'user', text: '...' }
// to the new format { role: 'assistant'|'user'|'system', content: '...' }
const chatHistory = historicalMessages.map(msg => ({
  role: msg.role,           // 'assistant' or 'user'
  content: msg.text
}));

// The new user turn:
const newUserTurn = {
  role: 'user',
  content: userMessage
};

// Combine them
const messages = [systemMessage, ...chatHistory, newUserTurn];

console.log(messages);

// 7) Call Amazon Bedrock with 'messages', 'max_tokens', and 'anthropic_version'
const bedrockCommand = new InvokeModelCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',  // The chat-based model
  accept: 'application/json',
  contentType: 'application/json',
  body: JSON.stringify({
    messages: messages,
    max_tokens: 512,
    anthropic_version: "bedrock-2023-05-31"
  })
});

let bedrockResponseText = '[No response from Bedrock]';

try {
  const bedrockResp = await bedrockClient.send(bedrockCommand);
  
  // bedrockResp.body is a Uint8Array
  const decoder = new TextDecoder('utf-8');
  const responseString = decoder.decode(bedrockResp.body);

  let parsed;
  try {
    parsed = JSON.parse(responseString);
  } catch (jsonErr) {
    console.warn('Bedrock response not valid JSON, raw:', responseString);
  }

  // Extract the final text
  if (parsed && parsed.completion) {
    bedrockResponseText = parsed.completion;
  } else if (parsed && parsed.generated_text) {
    bedrockResponseText = parsed.generated_text;
  } else {
    bedrockResponseText = responseString;
  }
} catch (bedrockErr) {
  console.error('Error calling Bedrock:', bedrockErr);
  bedrockResponseText = `Error from Bedrock: ${bedrockErr.message}`;
}

    // 8) Append the new user message + bedrock response to the conversation doc
    const newUserMessageObj = {
      role: 'user',
      text: userMessage,
      timestamp: new Date().toISOString()
    };

    const assistantText = extractClaudeText(bedrockResponseText);

    const bedrockMessageObj = {
      role: 'assistant',
      text: assistantText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...historicalMessages, newUserMessageObj, bedrockMessageObj];

    // 9) Update conversation in Elasticsearch
    await esClient.update({
      index: ES_CONVO_INDEX,
      id: conversationId,
      body: {
        doc: {
          messages: updatedMessages
        },
        doc_as_upsert: true
      },
      refresh: true
    });

    // 10) Return final data
    return {
      statusCode: 200,
      body: JSON.stringify({
        conversationId,
        bedrockResponse: bedrockResponseText,
        messages: updatedMessages
      })
    };
  } catch (err) {
    console.error('Error in getAnalysis Lambda:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: err.message
      })
    };
  }
};


function extractClaudeText(rawClaudeResponse) {
  try {
    const parsed = JSON.parse(rawClaudeResponse);
    // Ensure we have an array of content
    if (Array.isArray(parsed.content)) {
      // Filter to items of type 'text' and join them with newlines
      const textParts = parsed.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      return textParts.trim();
    }
    return rawClaudeResponse; // fallback if no content array
  } catch (err) {
    // If the response isn't valid JSON or parsing fails, fallback
    return rawClaudeResponse;
  }
}