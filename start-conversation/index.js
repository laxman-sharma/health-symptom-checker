const { v4: uuidv4 } = require('uuid');
const { Client } = require('@elastic/elasticsearch');

// 1) Initialize Elasticsearch client
const esClient = new Client({
  node: 'https://abae8b591064454f8a57ba1fa55aa13f.asia-southeast1.gcp.elastic-cloud.com:443',
  auth: {
    apiKey: ''
  }
});

const ES_INDEX = 'conversations'; // Adjust as needed

// Export a function named "handler" so Lambda can find "index.handler"
exports.handler = async (event) => {
  try {
    // 1) Parse the input from the event
    //    If using API Gateway (HTTP integration), event.body is a JSON string
    let payload;
    if (typeof event.body === 'string') {
      payload = JSON.parse(event.body);
    } else {
      // e.g. direct invocation or different event format
      payload = event.body || event;
    }

    const { userId, conversationId } = payload;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' })
      };
    }

    // 2) Either use the given conversationId or generate a new one
    let newConversationId = conversationId || uuidv4();

    // 3) Check if doc already exists in ES
    let existingConvo = null;
    const existsResp = await esClient.exists({
      index: ES_INDEX,
      id: newConversationId
    });

    if (existsResp.body === true) {
      // 4) Retrieve the existing document
      const getResp = await esClient.get({
        index: ES_INDEX,
        id: newConversationId
      });
      existingConvo = getResp.body._source;
    }

    if (existingConvo) {
      // 5) If we found an existing conversation, return it
      return {
        statusCode: 200,
        body: JSON.stringify({
          conversationId: newConversationId,
          userId: existingConvo.userId,
          messages: existingConvo.messages
        })
      };
    } else {
      // 6) Otherwise, create a new conversation doc
      const greetingMessage = {
        role: 'assistant',
        text: 'Hello! How can I help you today?',
        timestamp: new Date().toISOString()
      };

      const conversationDoc = {
        conversationId: newConversationId,
        userId: userId,
        createdAt: new Date().toISOString(),
        messages: [greetingMessage]
      };

      await esClient.index({
        index: ES_INDEX,
        id: newConversationId,
        body: conversationDoc,
        refresh: true
      });

      // 7) Return the newly created conversation
      return {
        statusCode: 201,
        body: JSON.stringify({
          conversationId: newConversationId,
          userId,
          messages: conversationDoc.messages
        })
      };
    }
  } catch (err) {
    console.error('Error starting conversation:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: err.message
      })
    };
  }
};