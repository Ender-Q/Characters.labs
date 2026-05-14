# Character Labs

![Character Labs Banner](https://via.placeholder.com/1200x400/0066ff/ffffff?text=Character+Labs+AI+Chat+Platform)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18-blue)](https://reactjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.IO-%23010101?logo=socket.io)](https://socket.io/)

## 🚀 An open-source AI character chat application similar to Character.AI, built with React, Node.js, and powered by open-source AI models. Free forever, no paywalls(and README.md images😭).

## ✨ Features

- ⚡ **Multiple AI Models** - PipSqueak, PipSqueak 2, Soft Launch, DeepSqueak, UltraSqueak, Goro, ReCheck
- 🎭 **Enhanced Roleplay** - Soft Launch model for consistent character behavior
- 🧠 **Lorebook System** - Add world facts your characters remember
- 💬 Real-time chat with AI characters
- 🎨 Personality sliders for character creation
- 🔄 Real-time model switching
- 📱 Responsive web interface
- 🎨 Modern UI with Tailwind CSS
- 🛡️ Content safety with Llama Prompt Guard
- 🔥 Ultimate Intelligence with Llama 4 Scout (Goro model)

## 📸 Screenshots

![Home Page](https://via.placeholder.com/800x450/0066ff/ffffff?text=Character+Labs+Home+Page)
![Chat Interface](https://via.placeholder.com/800x450/0066ff/ffffff?text=AI+Character+Chat+Interface)
![Character Creation](https://via.placeholder.com/800x450/0066ff/ffffff?text=Create+Your+AI+Character)

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Socket.IO Client
- React Router
- Lucide React Icons

### Backend
- Node.js
- Express
- Socket.IO
- SQLite
- OpenAI-compatible API integration (Groq & Google AI)

## 🏗️ Getting Started

### Prerequisites
- Node.js 16+ installed
- AI model API keys (Groq and/or Google AI Studio)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CharacterLABS
```

2. Install dependencies:
```bash
npm install
cd server && npm install
cd ../client_new && npm install
```

3. Set up environment variables:
```bash
cd server
cp .env.example .env
# Edit .env with your AI API configuration
```

4. Start the development servers:
```bash
# From the root directory
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔑 AI Setup

Character Labs supports multiple AI models from Groq and Google AI. Configure each model independently in your `.env` file.

### Required API Keys
1. [Groq API Key](https://console.groq.com/keys) (for Llama models)
2. [Google AI Studio API Key](https://makersuite.google.com/app/apikey) (for Gemini models)

### Environment Variables (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Groq API (For Llama models)
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1

# Google AI Studio API (For Gemini models)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_API_URL=https://generativelanguage.googleapis.com/v1beta

# AI Model Configuration
AI_MODEL_SOFTLAUNCH=gemini-2.5-flash-lite
AI_MODEL_PIPSQUEAK=llama-3.1-8b-instant
AI_MODEL_PIPSQUEAK2=gemini-3.1-flash-lite
AI_MODEL_DEEPSQUEAK=llama-3.1-70b-instruct
AI_MODEL_ULTRASQUEAK=gemini-2.5-flash
AI_MODEL_GORO=meta-llama/llama-4-scout-17b-16e-instruct
AI_MODEL_SAFETY=meta-llama/llama-prompt-guard-2-86m

# Database
DB_PATH=./database.sqlite

# JWT Secret
JWT_SECRET=your_jwt_secret_here
```

## 💻 Usage

1. **Create a Character**: Use the "Create Character" button to design your AI character with a name, description, personality traits, and greeting message.

2. **Start Chatting**: Click on any character card to begin a conversation. The AI will respond according to the character's personality and maintain conversation context.

3. **Manage Characters**: View all your characters on the home page and create as many as you like.

4. **Switch Models**: During chat, click the model selector to switch between different AI personalities (e.g., Soft Launch for roleplay, Goro for complex reasoning).

5. **Lorebook**: Enhance your character's memory by adding lorebook entries that the AI will remember and reference.

## 🚂 Deployment to Railway

Character Labs can be easily deployed to Railway with a single click.

### Option 1: One-click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/<your-template-link>)

### Option 2: Manual Deployment

1. Push your code to a GitHub repository
2. Create a new Railway project
3. Connect your GitHub repository
4. Railway will automatically detect the Node.js project and deploy it
5. Add the following environment variables in Railway dashboard:
   - `GROQ_API_KEY`
   - `GOOGLE_API_KEY`
   - `JWT_SECRET`
   - `NODE_ENV=production`

### Railway Configuration

The project includes a `railway.json` file for configuration. The build process:
1. Installs root dependencies
2. Installs server dependencies
3. Installs client_new dependencies
4. Builds the React frontend (if needed)
5. Starts the server

## 📁 Project Structure

```
CharacterLABS/
├── client_new/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                     # Node.js backend
│   ├── index.js               # Main server file
│   ├── package.json
│   ├── .env.example           # Environment template
│   └── railway.json           # Railway configuration
├── package.json               # Root package.json
├── README.md
├── Document.md                # Technical roadmap
└── .gitignore
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 💬 Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for fast AI inference
- [Google AI Studio](https://makersuite.google.com/) for Gemini models
- [Llama.cpp](https://github.com/ggerganov/llama.cpp) for open-source LLMs
- The open-source AI community
