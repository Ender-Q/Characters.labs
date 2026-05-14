const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const path = require('path');
const mongodb = require('./mongodb');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? '*' : "http://localhost:3000",
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
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');

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

  db.run(`ALTER TABLE conversations ADD COLUMN summary TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
      console.error('Error adding summary column:', err);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS memory_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    user_id TEXT,
    character_id INTEGER,
    role TEXT,
    content TEXT,
    embedding TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ===== Toxicity Filter =====
class ToxicityFilter {
  static THRESHOLD = 0.00047025534488260746;

  static CATEGORIES = [
    {
      name: 'severe_toxicity',
      patterns: [
        'kill yourself', 'go die', 'kill you', 'i will kill', 'wanna die', 'should die',
        'end yourself', 'commit suicide', 'cut yourself', 'hurt yourself', 'self-harm',
        'child porn', 'sexual assault', 'rape', 'pedophile', 'molest',
        'terrorist', 'bomb making', 'bioweapon', 'nazi', 'white supremacy',
        'torture', 'murder', 'massacre', 'execution'
      ]
    },
    {
      name: 'toxicity',
      patterns: [
        'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'piss off', 'suck my',
        'dick', 'cunt', 'whore', 'slut', 'prick', 'douche', 'motherfucker',
        'damn you', 'go to hell', 'screw you', 'shut the fuck', 'fucking'
      ]
    },
    {
      name: 'identity_attack',
      patterns: [
        'faggot', 'retard', 'tranny', 'chink', 'spic', 'nigger', 'nigga',
        'kike', 'raghead', 'camel jockey', 'sand nigger', 'wetback',
        'gook', 'slant-eye', 'beaner', 'white trash', 'trailer trash'
      ]
    },
    {
      name: 'insult',
      patterns: [
        'stupid', 'idiot', 'moron', 'loser', 'dumbass', 'dumb ass',
        'jerk', 'ass', 'pathetic', 'worthless', 'trash', 'garbage',
        'scumbag', 'lowlife', 'piece of shit', 'you suck', 'suck balls'
      ]
    },
    {
      name: 'threat',
      patterns: [
        'i will find you', 'i know where you live', 'going to kill',
        'going to hurt', 'beat you', 'beat the', 'shoot you', 'stab you',
        'strangle', 'choke you', 'punch you', 'slit your', 'break your'
      ]
    },
    {
      name: 'profanity',
      patterns: [
        'goddamn', 'goddam', 'son of a bitch', 'bullshit', 'horseshit',
        'crap', 'damn', 'hell', 'ass', 'piss', 'cock', 'balls',
        'tits', 'boobs', 'porn', 'nsfw', '18+'
      ]
    },
    {
      name: 'harassment',
      patterns: [
        'ugly', 'fat', 'disgusting', 'creep', 'weirdo', 'freak',
        'nobody likes you', 'no one loves you', 'you should be alone',
        'shut up', 'nobody asked', 'no one cares'
      ]
    }
  ];

  static check(text) {
    const lowerText = text.toLowerCase();
    let maxScore = 0;
    let matchedCategory = null;
    let matchedPattern = null;

    for (const category of this.CATEGORIES) {
      for (const pattern of category.patterns) {
        if (lowerText.includes(pattern)) {
          const score = 0.001;
          if (score > maxScore) {
            maxScore = score;
            matchedCategory = category.name;
            matchedPattern = pattern;
          }
        }
      }
    }

    return {
      score: maxScore,
      blocked: maxScore > this.THRESHOLD,
      category: matchedCategory,
      pattern: matchedPattern
    };
  }
}

// ===== Memory Store (Vector-Based) =====
class MemoryStore {
  constructor(database) {
    this.db = database;
  }

  async _getGoogleEmbedding(text) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;

    const baseUrl = process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
    try {
      const response = await fetch(`${baseUrl}/models/embedding-001:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/embedding-001',
          content: { parts: [{ text: text.slice(0, 2000) }] }
        })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.embedding?.values || null;
    } catch {
      return null;
    }
  }

  cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  async store(conversationId, userId, characterId, role, content) {
    const embedding = await this._getGoogleEmbedding(content);
    if (!embedding) return;

    this.db.run(
      `INSERT INTO memory_embeddings (conversation_id, user_id, character_id, role, content, embedding)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [conversationId, userId, characterId, role, content.slice(0, 1000), JSON.stringify(embedding)]
    );
  }

  async retrieve(query, userId, characterId, topK = 8) {
    const queryEmb = await this._getGoogleEmbedding(query);
    if (!queryEmb) return [];

    const rows = await new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM memory_embeddings WHERE user_id = ? AND character_id = ? ORDER BY created_at DESC LIMIT 200`,
        [userId, characterId],
        (err, rows) => { if (err) reject(err); else resolve(rows); }
      );
    });

    const scored = rows
      .map(row => ({
        content: row.content,
        role: row.role,
        similarity: this.cosineSimilarity(queryEmb, JSON.parse(row.embedding))
      }))
      .filter(r => r.similarity > 0.35);

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  async generateComprehensiveSummary(conversationId) {
    const row = await new Promise((resolve, reject) => {
      this.db.get(
        `SELECT messages, model_type FROM conversations WHERE id = ?`,
        [conversationId],
        (err, row) => { if (err) reject(err); else resolve(row); }
      );
    });

    if (!row) return '';

    const messages = JSON.parse(row.messages || '[]');
    if (messages.length === 0) return '';

    const modelName = MODELS[row.model_type]?.name || 'Unknown';
    const exchangeCount = Math.floor(messages.length / 2);
    let summary = `Conversation (${exchangeCount} exchanges, using ${modelName}):\n`;
    messages.slice(-24).forEach(msg => {
      const prefix = msg.role === 'user' ? 'User' : 'Character';
      summary += `${prefix}: ${msg.content.slice(0, 300)}\n`;
    });

    const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
    const topics = [];
    const topicMap = {
      'positive emotions': ['love', 'like', 'enjoy', 'happy', 'wonderful', 'amazing', 'great', 'fantastic'],
      'negative emotions': ['hate', 'angry', 'sad', 'upset', 'depressed', 'lonely', 'scared', 'hurt'],
      'work/career': ['work', 'job', 'career', 'boss', 'office', 'project', 'promotion', 'salary'],
      'relationships': ['family', 'friend', 'relationship', 'partner', 'girlfriend', 'boyfriend', 'mother', 'father'],
      'hobbies/interests': ['hobby', 'game', 'fun', 'music', 'art', 'book', 'movie', 'sport', 'travel', 'cook'],
      'philosophy': ['meaning', 'purpose', 'life', 'death', 'god', 'universe', 'existence', 'soul'],
      'daily life': ['today', 'morning', 'night', 'weather', 'food', 'eat', 'sleep', 'home', 'school']
    };
    for (const [topic, keywords] of Object.entries(topicMap)) {
      if (keywords.some(kw => allContent.includes(kw))) topics.push(topic);
    }
    if (topics.length > 0) {
      summary += `\nKey topics: ${[...new Set(topics)].join(', ')}.`;
    }

    return summary;
  }
}

const memoryStore = new MemoryStore(db);

// ===== AI Service =====
class AIService {
  static async generateResponse(character, message, conversationHistory, modelType = 'softlaunch', memories = [], summary = '') {
    const modelConfig = MODELS[modelType] || MODELS.softlaunch;
    const apiKey = modelConfig.provider === 'google'
      ? process.env.GOOGLE_API_KEY
      : process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        content: "Service not configured. Please set API keys in environment variables.",
        model: modelConfig.name
      };
    }

    let apiUrl = modelConfig.apiUrl;
    let body, headers;

    const summaryContext = summary ? `\n\nConversation summary: ${summary}` : '';
    const memoryContext = memories.length > 0
      ? '\n\nRelevant past memories:\n' + memories.map(m => `- ${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Character' : 'System'} said: "${m.content.slice(0, 300)}"`).join('\n')
      : '';
    const fullContext = summaryContext + memoryContext;

    if (modelConfig.provider === 'google') {
      apiUrl = `${apiUrl}/models/${modelConfig.model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };

      const allMessages = [
        { role: 'user', parts: [{ text: 'System: ' + 'You are ' + character.name + '. ' + character.description + '\n\nPersonality: ' + character.personality + '\n\nIMPORTANT: Stay in character, never mention being AI, never break character.' + fullContext }] },
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
Greeting: ${character.greeting}${fullContext}`;

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

app.get('/api/characters', async (req, res) => {
  db.all("SELECT * FROM characters ORDER BY created_at DESC", async (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    let results = rows || [];
    if (mongodb.isConnected()) {
      try {
        const mongoChars = await mongodb.CharacterProfile.find().sort({ created_at: -1 }).lean();
        const normalized = mongoChars.map(c => ({
          id: c._id.toString(),
          _v2: true,
          name: c.name,
          description: c.description,
          personality: c.personality?.traits?.join(', ') || 'friendly and engaging',
          greeting: c.greeting || '',
          avatar_url: c.avatar_url || '',
          lorebook: c.lorebook || '[]',
          created_at: c.created_at,
          personality_traits: c.personality,
          dialogue: c.dialogue,
          visual: c.visual,
          relationships: c.relationships,
          attributes: c.attributes,
          output: c.output
        }));
        results = [...results, ...normalized];
      } catch (e) {
        console.error('MongoDB fetch error:', e.message);
      }
    }
    res.json(results);
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

// MongoDB character routes
app.get('/api/v2/characters', async (req, res) => {
  if (!mongodb.isConnected()) {
    return res.json([]);
  }
  try {
    const chars = await mongodb.CharacterProfile.find().sort({ created_at: -1 }).lean();
    res.json(chars);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v2/characters/:id', async (req, res) => {
  if (!mongodb.isConnected()) {
    return res.status(503).json({ error: 'MongoDB not connected' });
  }
  try {
    const char = await mongodb.CharacterProfile.findById(req.params.id).lean();
    if (!char) return res.status(404).json({ error: 'Character not found' });
    res.json(char);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v2/characters', async (req, res) => {
  if (!mongodb.isConnected()) {
    return res.status(503).json({ error: 'MongoDB not connected' });
  }
  try {
    const { name, description, greeting, avatar_url, personality, dialogue, visual, relationships, attributes, output, lorebook } = req.body;
    const profile = new mongodb.CharacterProfile({
      name, description, greeting, avatar_url,
      personality: {
        traits: personality?.traits || [],
        background: personality?.background || '',
        archetype: personality?.archetype || 'custom'
      },
      dialogue: {
        style: dialogue?.style || 'casual',
        tone: dialogue?.tone || 'warm',
        catchphrases: dialogue?.catchphrases || [],
        speech_pattern: dialogue?.speech_pattern || ''
      },
      visual: {
        art_style: visual?.art_style || '',
        color_palette: visual?.color_palette || [],
        mood: visual?.mood || '',
        custom_params: visual?.custom_params || {}
      },
      relationships: relationships || [],
      attributes: {
        intelligence: attributes?.intelligence ?? 50,
        empathy: attributes?.empathy ?? 50,
        humor: attributes?.humor ?? 50,
        creativity: attributes?.creativity ?? 50,
        wisdom: attributes?.wisdom ?? 50,
        charisma: attributes?.charisma ?? 50
      },
      output: {
        size: output?.size || 'medium',
        custom_width: output?.custom_width || null,
        custom_height: output?.custom_height || null,
        max_tokens: output?.max_tokens || 500,
        temperature: output?.temperature ?? 0.8
      },
      lorebook: JSON.stringify(lorebook || []),
      metadata_only: true
    });
    await profile.save();
    res.json(profile.toObject());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/v2/characters/:id', async (req, res) => {
  if (!mongodb.isConnected()) {
    return res.status(503).json({ error: 'MongoDB not connected' });
  }
  try {
    const updates = req.body;
    updates.updated_at = new Date();
    const char = await mongodb.CharacterProfile.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!char) return res.status(404).json({ error: 'Character not found' });
    res.json(char);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/v2/characters/:id', async (req, res) => {
  if (!mongodb.isConnected()) {
    return res.status(503).json({ error: 'MongoDB not connected' });
  }
  try {
    await mongodb.CharacterProfile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client_new', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client_new', 'dist', 'index.html'));
  });
}

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

    const toxicityCheck = ToxicityFilter.check(message);
    if (toxicityCheck.blocked) {
      socket.emit('ai-response', {
        message: "I'm sorry, but I can't respond to that.",
        conversationId,
        blocked: true
      });
      return;
    }

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

            const memories = await memoryStore.retrieve(message, socket.id, characterId);
            const existingSummary = conversation ? (conversation.summary || '') : '';

            let finalResponse;
            if (intervention) {
              finalResponse = intervention.message;
            } else {
              const aiResult = await AIService.generateResponse(character, message, history, modelType, memories, existingSummary);
              finalResponse = aiResult.content;
            }

            const newHistory = [
              ...history,
              { role: "user", content: message, timestamp: new Date().toISOString() },
              { role: "assistant", content: finalResponse, timestamp: new Date().toISOString(), model: MODELS[modelType]?.name || 'Soft Launch' }
            ];

            const summary = await memoryStore.generateComprehensiveSummary(conversationId || 0);
            const finalSummary = summary || '';

            const emitResponse = (id) => {
              memoryStore.store(id, socket.id, characterId, 'user', message);
              memoryStore.store(id, socket.id, characterId, 'assistant', finalResponse);
              if (finalSummary) {
                memoryStore.store(id, socket.id, characterId, 'summary', finalSummary);
              }
              socket.emit('ai-response', {
                message: finalResponse,
                conversationId: id,
                intervention: intervention ? true : false
              });
            };

            if (conversationId) {
              db.run(
                "UPDATE conversations SET messages = ?, message_count = ?, summary = ? WHERE id = ?",
                [JSON.stringify(newHistory), newHistory.length, finalSummary, conversationId],
                () => emitResponse(conversationId)
              );
            } else {
              db.run(
                "INSERT INTO conversations (character_id, user_id, messages, model_type, message_count, summary) VALUES (?, ?, ?, ?, ?, ?)",
                [characterId, socket.id, JSON.stringify(newHistory), modelType, newHistory.length, finalSummary],
                function(err) {
                  emitResponse(err ? null : this.lastID);
                }
              );
            }
          }
        );
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to generate response' });
    }
  });

  socket.on('switch-model', async (data) => {
    const { conversationId, modelType, characterId } = data;
    if (MODELS[modelType] && conversationId) {
      db.run("UPDATE conversations SET model_type = ? WHERE id = ?", [modelType, conversationId]);

      const summary = await memoryStore.generateComprehensiveSummary(conversationId);
      if (summary) {
        db.run("UPDATE conversations SET summary = ? WHERE id = ?", [summary, conversationId]);
      }

      const row = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM conversations WHERE id = ?", [conversationId], (err, row) => {
          if (err) reject(err); else resolve(row);
        });
      });

      if (row) {
        socket.emit('model-switched', {
          modelType,
          conversationId,
          messages: JSON.parse(row.messages || '[]'),
          summary: row.summary || ''
        });
      }
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
server.listen(PORT, async () => {
  await mongodb.connect();
  console.log(`Server running on port ${PORT}`);
});
