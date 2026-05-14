const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL;

let connected = false;

async function connect() {
  if (!MONGO_URL) {
    console.log('MONGO_URL not set — MongoDB features disabled');
    return false;
  }
  try {
    await mongoose.connect(MONGO_URL);
    connected = true;
    console.log('MongoDB connected');
    return true;
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    return false;
  }
}

function isConnected() {
  return connected;
}

const attributeSliderSchema = new mongoose.Schema({
  intelligence: { type: Number, min: 0, max: 100, default: 50 },
  empathy: { type: Number, min: 0, max: 100, default: 50 },
  humor: { type: Number, min: 0, max: 100, default: 50 },
  creativity: { type: Number, min: 0, max: 100, default: 50 },
  wisdom: { type: Number, min: 0, max: 100, default: 50 },
  charisma: { type: Number, min: 0, max: 100, default: 50 }
}, { _id: false });

const outputPreferencesSchema = new mongoose.Schema({
  size: { type: String, enum: ['small', 'medium', 'large', 'custom'], default: 'medium' },
  custom_width: { type: Number, default: null },
  custom_height: { type: Number, default: null },
  max_tokens: { type: Number, default: 500 },
  temperature: { type: Number, default: 0.8 }
}, { _id: false });

const relationshipSchema = new mongoose.Schema({
  target_name: { type: String, required: true },
  type: { type: String, enum: ['friend', 'rival', 'mentor', 'family', 'ally', 'enemy', 'love_interest', 'other'], default: 'friend' },
  description: { type: String, default: '' }
});

const characterProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  greeting: { type: String, default: '' },
  avatar_url: { type: String, default: '' },
  personality: {
    traits: [String],
    background: { type: String, default: '' },
    archetype: { type: String, default: 'custom' }
  },
  dialogue: {
    style: { type: String, default: 'casual' },
    tone: { type: String, default: 'warm' },
    catchphrases: [String],
    speech_pattern: { type: String, default: '' }
  },
  visual: {
    art_style: { type: String, default: '' },
    color_palette: [String],
    mood: { type: String, default: '' },
    custom_params: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  relationships: [relationshipSchema],
  attributes: { type: attributeSliderSchema, default: () => ({}) },
  output: { type: outputPreferencesSchema, default: () => ({}) },
  lorebook: { type: String, default: '[]' },
  metadata_only: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  version_history: [{
    version: Number,
    data: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

characterProfileSchema.pre('save', function(next) {
  this.updated_at = new Date();
  if (this.isModified()) {
    this.version_history.push({
      version: this.version,
      data: this.toObject()
    });
    this.version += 1;
  }
  next();
});

const CharacterProfile = mongoose.model('CharacterProfile', characterProfileSchema);

const userPreferenceSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  default_output_size: { type: String, enum: ['small', 'medium', 'large', 'custom'], default: 'medium' },
  custom_width: Number,
  custom_height: Number,
  default_temperature: { type: Number, default: 0.8 },
  theme: { type: String, default: 'light' },
  saved_at: { type: Date, default: Date.now }
});

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

module.exports = { connect, isConnected, CharacterProfile, UserPreference };
