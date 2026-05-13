const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const MODELS = {
  pipsqueak: {
    name: 'PipSqueak',
    description: 'Fast & Efficient. Llama 3.1 8B Instant',
    model: process.env.AI_MODEL_PIPSQUEAK || 'llama-3.1-8b-instant',
    provider: 'groq',
    apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
    context: 32768,
    features: ['fast', 'efficient', 'default'],
    icon: '⚡'
  },
  pipsqueak2: {
    name: 'PipSqueak 2',
    description: 'Gemini 3.1 Flash Lite - Enhanced Performance',
    model: process.env.AI_MODEL_PIPSQUEAK2 || 'gemini-3.1-flash-lite',
    provider: 'google',
    apiUrl: process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
    context: 1048576,
    features: ['enhanced', 'fast', 'efficient'],
    icon: '⚡⚡'
  },
  softlaunch: {
    name: 'Soft Launch',
    description: 'Gemini 2.5 Flash Lite - Best for Roleplay & Consistency',
    model: process.env.AI_MODEL_SOFTLAUNCH || 'gemini-2.5-flash-lite',
    provider: 'google',
    apiUrl: process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
    context: 1048576,
    features: ['consistent', 'memory', 'roleplay'],
    icon: '🎭'
  },
  deepsqueak: {
    name: 'DeepSqueak',
    description: 'Llama 3.1 70B - Enhanced Reasoning & Context',
    model: process.env.AI_MODEL_DEEPSQUEAK || 'llama-3.3-70b-versatile',
    provider: 'groq',
    apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
    context: 128000,
    features: ['reasoning', 'memory', 'creative'],
    icon: '🧠'
  },
  ultrasqueak: {
    name: 'UltraSqueak',
    description: 'Gemini 2.5 Flash - Complex Narratives & Reasoning',
    model: process.env.AI_MODEL_ULTRASQUEAK || 'gemini-2.5-flash',
    provider: 'google',
    apiUrl: process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
    context: 1048576,
    features: ['advanced', 'creative', 'premium'],
    icon: '🚀'
  },
  goro: {
    name: 'Goro',
    description: 'Llama 4 Scout - Ultimate Intelligence',
    model: process.env.AI_MODEL_GORO || 'meta-llama/llama-4-scout-17b-16e-instruct',
    provider: 'groq',
    apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
    context: 131072,
    features: ['intelligent', 'reasoning', 'powerful'],
    icon: '🔥'
  },
  recheck: {
    name: 'ReCheck',
    description: 'Llama Prompt Guard 2 86M - Content Safety & Moderation',
    model: process.env.AI_MODEL_SAFETY || 'meta-llama/llama-prompt-guard-2-86m',
    provider: 'groq',
    apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
    context: 128000,
    features: ['safety', 'moderation', 'content-filter'],
    icon: '🛡️'
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    personality TEXT,
    greeting TEXT,
    avatar_url TEXT,
    lorebook TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    user_id TEXT,
    messages TEXT,
    model_type TEXT DEFAULT 'softlaunch',
    message_count INTEGER DEFAULT 0,
    emotional_intensity REAL DEFAULT 0,
    summary TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters (id)
  )`);

  // Add summary column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE conversations ADD COLUMN summary TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
      console.error('Error adding summary column:', err);
    }
  });
});

class AIService {
  static checkContent(message) {
    const harmfulKeywords = [
      'kill', 'murder', 'rape', 'sexual assault', 'pedophile', 'child porn',
      'extremist', 'terrorist', 'bomb making', 'weaponize', 'bioweapon',
      'self harm', 'suicide', 'eating disorder', 'self-harm',
      'stalk', 'harass', 'bully', 'cyberbullying',
      'fraud', 'scam', 'phishing', 'illegal',
      '18+', 'nsfw', 'explicit sexual', 'nude'
    ];
    
    const lowerMessage = message.toLowerCase();
    for (const keyword of harmfulKeywords) {
      if (lowerMessage.includes(keyword)) {
        return { safe: false, category: keyword };
      }
    }
    return { safe: true };
  }

  static async generateSummary(conversationHistory) {
    // For now, we'll create a simple summary based on recent messages
    // In a production app, you might want to use an AI model to generate better summaries
    if (conversationHistory.length === 0) return '';
    
    // Take the last few messages to create a summary
    const recentMessages = conversationHistory.slice(-10);
    let summary = 'Recent conversation topics: ';
    
    // Extract key topics (simplified)
    const topics = [];
    recentMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      // Simple keyword extraction
      if (content.includes('love') || content.includes('like') || content.includes('enjoy')) topics.push('positive emotions');
      if (content.includes('hate') || content.includes('dislike') || content.includes('angry')) topics.push('negative emotions');
      if (content.includes('work') || content.includes('job') || content.includes('career')) topics.push('work/career');
      if (content.includes('family') || content.includes('friend') || content.includes('relationship')) topics.push('relationships');
      if (content.includes('hobby') || content.includes('game') || content.includes('fun')) topics.push('hobbies/interests');
    });
    
    // Deduplicate and limit topics
    const uniqueTopics = [...new Set(topics)].slice(0, 3);
    summary += uniqueTopics.join(', ');
    
    return summary;
  }

  static async generateResponse(character, message, conversationHistory, modelType = 'softlaunch', summary = '') {
    const contentCheck = this.checkContent(message);
    if (!contentCheck.safe) {
      return {
        content: "I'm sorry, but I can't engage with content related to " + contentCheck.category + ". Let's talk about something else!",
        model: MODELS[modelType].name,
        blocked: true
      };
    }

    const modelConfig = MODELS[modelType] || MODELS.softlaunch;
    const apiKey = modelConfig.provider === 'google' 
      ? process.env.GOOGLE_API_KEY 
      : process.env.GROQ_API_KEY;
    
    let apiUrl = modelConfig.apiUrl;
    let body, headers;

    if (modelConfig.provider === 'google') {
      apiUrl = `${apiUrl}/models/${modelConfig.model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      
       const allMessages = [
         { role: 'user', parts: [{ text: 'System: ' + 'You are ' + character.name + '. ' + character.description + '\n\nPersonality: ' + character.personality + '\n\nIMPORTANT: Stay in character, never mention being AI, never break character.' + (summary ? '\n\nSummary of past conversations: ' + summary : '') }] },
         ...conversationHistory.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
         { role: 'user', parts: [{ text: message }] }
       ];
      
      body = JSON.stringify({
        contents: allMessages,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.8,
          topP: 0.9
        }
      });
    } else {
      apiUrl = `${apiUrl}/chat/completions`;
      
      const lorebook = character.lorebook ? JSON.parse(character.lorebook) : [];
      const loreContext = lorebook.length > 0 
        ? `\n\nLOREBOOK: ${lorebook.map(entry => `${entry.key}: ${entry.value}`).join('\n')}`
        : '';

       const systemPrompt = `You are ${character.name}. ${character.description}${loreContext}
 Personality: ${character.personality}
 IMPORTANT: Stay in character, never mention being AI, never break character.
 Greeting: ${character.greeting}
 Summary of past conversations: ${summary}`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-20),
        { role: "user", content: message }
      ];

      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      body = JSON.stringify({
        model: modelConfig.model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.8,
        top_p: 0.9
      });
    }

try {
      const rawResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: body
      });

      const rawText = await rawResponse.text();
      
      if (!rawResponse.ok) {
        console.error(`API Error (${rawResponse.status}):`, rawText);
        throw new Error(`API Error ${rawResponse.status}: ${rawText.substring(0, 200)}`);
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', rawText.substring(0, 500));
        throw new Error('Invalid JSON response from AI API');
      }

      let content;
      if (modelConfig.provider === 'google') {
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || 'No response';
      } else {
        content = data.choices[0].message.content;
      }
      
      return {
        content: content,
        model: modelConfig.name
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        content: `I apologize, but I'm having trouble responding right now. Error: ${error.message}`,
        model: modelConfig.name
      };
    }
  }
}

// API Routes
app.get('/api/models', (req, res) => {
  const availableModels = Object.entries(MODELS).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
    icon: value.icon,
    context: value.context,
    features: value.features
  }));
  res.json(availableModels);
});

app.get('/api/characters', (req, res) => {
  db.all("SELECT * FROM characters ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/characters', (req, res) => {
  const { name, description, personality, greeting, avatar_url, lorebook } = req.body;
  const lorebookJson = JSON.stringify(lorebook || []);
  
  db.run(
    `INSERT INTO characters (name, description, personality, greeting, avatar_url, lorebook) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, personality, greeting, avatar_url, lorebookJson],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, description, personality, greeting, avatar_url, lorebook: lorebookJson });
    }
  );
});

app.get('/api/characters/:id', (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM characters WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Character not found" });
      return;
    }
    res.json(row);
  });
});

app.put('/api/conversations/:id/model', (req, res) => {
  const { id } = req.params;
  const { modelType } = req.body;
  
  if (!MODELS[modelType]) {
    res.status(400).json({ error: 'Invalid model type' });
    return;
  }

  db.run(
    "UPDATE conversations SET model_type = ? WHERE id = ?",
    [modelType, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, modelType });
    }
  );
});

app.get('/api/conversations/:characterId/:userId', (req, res) => {
  const { characterId, userId } = req.params;
  
  db.all(
    "SELECT * FROM conversations WHERE character_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10",
    [characterId, userId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows.map(row => ({
        ...row,
        messages: JSON.parse(row.messages || '[]')
      })));
    }
  );
});

const userSessions = new Map();

class SoftLaunchLayer {
  constructor() {
    this.messageCount = 0;
    this.emotionalIntensity = 0;
  }

  analyzeEmotion(message) {
    const intenseKeywords = ['love', 'hate', 'miss', 'need', 'always', 'forever', 'never', 'die', 'kill', 'alone', 'destroy'];
    const moderateKeywords = ['feel', 'think', 'want', 'hope', 'wish', 'sad', 'happy', 'angry', 'scared'];
    
    let score = 0;
    const lowerMsg = message.toLowerCase();
    
    intenseKeywords.forEach(kw => { if (lowerMsg.includes(kw)) score += 0.15; });
    moderateKeywords.forEach(kw => { if (lowerMsg.includes(kw)) score += 0.05; });
    
    return Math.min(score, 1);
  }

  checkEscalation(message) {
    this.messageCount++;
    this.emotionalIntensity = this.analyzeEmotion(message);
    
    if (this.messageCount >= 8 && this.emotionalIntensity > 0.7) {
      return this.intervene();
    }
    return null;
  }

  intervene() {
    this.messageCount = 0;
    this.emotionalIntensity = 0;
    return {
      type: 'reset',
      message: "Let's take a moment to breathe. How about we talk about something else for a change of pace?"
    };
  }

  reset() {
    this.messageCount = 0;
    this.emotionalIntensity = 0;
  }
}

function getUserSession(socketId) {
  if (!userSessions.has(socketId)) {
    userSessions.set(socketId, new SoftLaunchLayer());
  }
  return userSessions.get(socketId);
}

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-character', (characterId) => {
    socket.join(`character-${characterId}`);
  });

  socket.on('send-message', async (data) => {
    const { characterId, message, conversationId, modelType = 'softlaunch' } = data;
    
    try {
      db.get("SELECT * FROM characters WHERE id = ?", [characterId], async (err, character) => {
        if (err || !character) {
          socket.emit('error', { message: 'Character not found' });
          return;
        }

        db.get(
          "SELECT * FROM conversations WHERE id = ?", 
          [conversationId], 
          async (err, conversation) => {
            const history = conversation ? JSON.parse(conversation.messages || '[]') : [];
            const session = getUserSession(`${socket.id}-${characterId}`);
            const intervention = session.checkEscalation(message);
            
            let finalResponse;
            if (intervention) {
              finalResponse = intervention.message;
            } else {
              // Pass conversation history and existing summary to generateResponse
              const aiResult = await AIService.generateResponse(character, message, history, modelType, conversation.summary || '');
              finalResponse = aiResult.content;
            }
            
            const newHistory = [
              ...history,
              { role: "user", content: message, timestamp: new Date().toISOString() },
              { role: "assistant", content: finalResponse, timestamp: new Date().toISOString(), model: MODELS[modelType]?.name || 'Soft Launch' }
            ];

            // Generate summary for permanent memory
            const summary = await AIService.generateSummary(newHistory);

            let newConversationId = conversationId;
            
            if (conversationId) {
              db.run(
                "UPDATE conversations SET messages = ?, message_count = ?, summary = ? WHERE id = ?",
                [JSON.stringify(newHistory), newHistory.length, summary, conversationId]
              );
            } else {
              db.run(
                "INSERT INTO conversations (character_id, user_id, messages, model_type, message_count, summary) VALUES (?, ?, ?, ?, ?, ?)",
                [characterId, socket.id, JSON.stringify(newHistory), modelType, newHistory.length, summary],
                function(err) {
                  if (!err) {
                    newConversationId = this.lastID;
                  }
                }
              );
            }

            socket.emit('ai-response', {
              message: finalResponse,
              conversationId: newConversationId,
              intervention: intervention ? true : false
            });
          }
        );
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to generate response' });
    }
  });

  socket.on('switch-model', (data) => {
    const { conversationId, modelType } = data;
    if (MODELS[modelType]) {
      db.run("UPDATE conversations SET model_type = ? WHERE id = ?", [modelType, conversationId]);
    }
  });

  socket.on('reset-context', (data) => {
    const { conversationId } = data;
    const session = getUserSession(`${socket.id}-${data.characterId}`);
    session.reset();
    socket.emit('context-reset', { success: true });
  });

  socket.on('disconnect', () => {
    userSessions.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
