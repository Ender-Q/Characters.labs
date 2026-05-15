import { useState, useEffect, useRef, useCallback } from 'react';
import { Github, Send, Menu, Plus, Search, Sparkles, Code2, X, Rewind, Clock } from 'lucide-react';
import { CharacterCard } from './components/CharacterCard';
import { ChatMessage } from './components/ChatMessage';
import { CharacterProfile } from './components/CharacterProfile';
import { ModelSelector } from './components/ModelSelector';
import { CharacterCreator } from './components/CharacterCreator';
import io from 'socket.io-client';

const API_URL = '';

const MODELS = {
  pipsqueak: { name: 'PipSqueak', icon: '⚡' },
  softlaunch: { name: 'Soft Launch', icon: '🎭' },
  deepsqueak: { name: 'DeepSqueak', icon: '🧠' },
  ultrasqueak: { name: 'UltraSqueak', icon: '🚀' },
  goro: { name: 'Goro', icon: '🔥' }
};

interface Character {
  id: number | string;
  name: string;
  description: string;
  personality?: string;
  greeting?: string;
  avatar_url?: string;
  lorebook?: string;
  _v2?: boolean;
  personality_traits?: { traits?: string[]; background?: string; archetype?: string };
  dialogue?: { style?: string; tone?: string; catchphrases?: string[]; speech_pattern?: string };
  visual?: { art_style?: string; color_palette?: string[]; mood?: string; custom_params?: any };
  relationships?: Array<{ target_name: string; type: string; description?: string }>;
  attributes?: { intelligence?: number; empathy?: number; humor?: number; creativity?: number; wisdom?: number; charisma?: number };
  output?: { size?: string; custom_width?: number; custom_height?: number; max_tokens?: number; temperature?: number };
}

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    message: string;
    isUser: boolean;
    timestamp: string;
    model?: string;
  }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState('softlaunch');
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRewind, setShowRewind] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCharacters();
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('ai-response', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        message: data.message,
        isUser: false,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        model: data.model || MODELS[currentModel]?.name
      }]);
      setIsTyping(false);
      setConversationId(data.conversationId);
    });

    newSocket.on('error', () => {
      setIsTyping(false);
    });

    newSocket.on('model-switched', (data) => {
      setConversationId(data.conversationId);
      if (data.messages && data.messages.length > 0) {
        const loaded = data.messages.map((m: any, i: number) => ({
          id: `msg-${i}`,
          message: m.content,
          isUser: m.role === 'user',
          timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          model: m.model
        }));
        setMessages(loaded);
      }
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/characters`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !selectedCharacter || !socket) return;

    const newMessage = {
      id: Date.now().toString(),
      message: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsTyping(true);

    socket.emit('join-character', selectedCharacter.id);
    socket.emit('send-message', {
      characterId: selectedCharacter.id,
      message: message,
      conversationId,
      modelType: currentModel
    });
  };

  const handleCharacterSelect = (character: Character) => {
    setSelectedCharacter(character);
    setMessages([]);
    setConversationId(null);
    
    if (character.greeting) {
      setMessages([{
        id: 'greeting',
        message: character.greeting,
        isUser: false,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        model: MODELS[currentModel]?.name
      }]);
    }
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    if (socket && conversationId && selectedCharacter) {
      socket.emit('switch-model', {
        conversationId,
        modelType: model,
        characterId: selectedCharacter.id
      });
    }
  };

  const saveToRewind = useCallback((character: Character, msgs: typeof messages, convId: number | null, model: string) => {
    if (!character || msgs.length === 0) return;
    const preview = msgs.slice(-2).map(m => `${m.isUser ? 'You' : character.name}: ${m.message.slice(0, 80)}`).join('\n');
    const entry = {
      id: Date.now().toString(),
      characterName: character.name,
      characterId: character.id,
      character,
      messages: msgs,
      conversationId: convId,
      modelType: model,
      timestamp: new Date().toISOString(),
      preview
    };
    try {
      const stored = JSON.parse(localStorage.getItem('rewind_chats') || '[]');
      const existing = stored.findIndex((s: any) => s.conversationId === convId && s.characterId === character.id);
      if (existing >= 0) stored[existing] = entry;
      else stored.unshift(entry);
      localStorage.setItem('rewind_chats', JSON.stringify(stored.slice(0, 50)));
    } catch {}
  }, []);

  const loadFromRewind = (chat: any) => {
    const char = characters.find(c => c.id === chat.characterId) || chat.character;
    if (char) {
      setSelectedCharacter(char);
      setMessages(chat.messages || []);
      setConversationId(chat.conversationId);
      setCurrentModel(chat.modelType || 'softlaunch');
      setShowRewind(false);
    }
  };

  useEffect(() => {
    if (selectedCharacter && messages.length > 0) {
      saveToRewind(selectedCharacter, messages, conversationId, currentModel);
    }
  }, [messages, selectedCharacter, conversationId, currentModel, saveToRewind]);

  const onCharacterCreated = (char: any) => {
    const flat: Character = {
      id: char.id,
      _v2: true,
      name: char.name,
      description: char.description,
      personality: char.personality || 'friendly and engaging',
      greeting: char.greeting,
      avatar_url: char.avatar_url,
      lorebook: '[]',
      personality_traits: char.personality_traits,
      dialogue: char.dialogue,
      visual: char.visual,
      relationships: char.relationships,
      attributes: char.attributes,
      output: char.output
    };
    setCharacters(prev => [flat, ...prev]);
    handleCharacterSelect(flat);
  };

  const handleNewChat = () => {
    setSelectedCharacter(null);
    setMessages([]);
    setConversationId(null);
    setMessage('');
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="size-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Character.labs
              </h1>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Code2 size={12} />
                Open-source AI characters
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20"
          >
            <Github size={18} />
            <span className="hidden sm:inline">Star on GitHub</span>
          </a>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transition-all duration-300 overflow-hidden shadow-xl`}
        >
          <div className="p-4 border-b border-gray-200/50">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
            >
              <Plus size={18} />
              <span className="font-medium">New Chat</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all mt-2"
            >
              <Sparkles size={16} />
              <span className="font-medium text-sm">Create Character</span>
            </button>

            <button
              onClick={() => { setShowRewind(!showRewind); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all mt-2"
            >
              <Rewind size={16} />
              <span className="font-medium text-sm">ReWind</span>
            </button>

            {showRewind && (
              <div className="mt-2 bg-white border border-amber-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-sm">
                {(() => {
                  const chats = JSON.parse(localStorage.getItem('rewind_chats') || '[]');
                  return chats.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No saved chats yet</p>
                  ) : (
                    chats.map((chat: any) => (
                      <button key={chat.id} onClick={() => loadFromRewind(chat)}
                        className="w-full text-left p-3 border-b border-amber-100 hover:bg-amber-50 transition-colors last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-900">{chat.characterName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{new Date(chat.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{chat.preview}</p>
                      </button>
                    ))
                  );
                })()}
              </div>
            )}

            <div className="mt-3 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Characters</h2>
            {filteredCharacters.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} className="text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-2">No characters yet</p>
                <p className="text-xs text-gray-500">
                  Create characters to start chatting
                </p>
              </div>
            ) : (
              filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  onClick={() => handleCharacterSelect(character)}
                  className="cursor-pointer"
                >
                  <CharacterCard
                    name={character.name}
                    description={character.description}
                    avatar={character.avatar_url}
                    messageCount={0}
                    isActive={selectedCharacter?.id === character.id}
                  />
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200/50 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="flex items-start gap-2 text-sm">
              <Github size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Open Weights</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  All models are open-source and can be self-hosted
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 flex flex-col">
              {!selectedCharacter ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
                      <Sparkles size={48} className="text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      Welcome to Character.labs
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      An open-source platform for AI character conversations. Select a character from the sidebar to start chatting.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">Ready to connect?</span> Select a character from the sidebar to start chatting.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Model Selector Bar */}
                  <div className="px-6 py-3 border-b border-gray-200/50 bg-white/50 backdrop-blur flex items-center gap-4">
                    <span className="text-sm text-gray-500">Model:</span>
                    <ModelSelector
                      currentModel={currentModel}
                      onModelChange={handleModelChange}
                      disabled={isTyping}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="max-w-4xl mx-auto">
                      {messages.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Send size={36} className="text-blue-600" />
                          </div>
                          <p className="text-gray-600 mb-2">Start a conversation</p>
                          <p className="text-sm text-gray-500">
                            Type a message below to begin chatting with {selectedCharacter.name}
                          </p>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg) => (
                            <ChatMessage
                              key={msg.id}
                              message={msg.message}
                              isUser={msg.isUser}
                              characterName={selectedCharacter.name}
                              characterAvatar={selectedCharacter.avatar_url}
                              timestamp={msg.timestamp}
                            />
                          ))}
                          {isTyping && (
                            <div className="flex justify-start">
                              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-xl p-4 shadow-lg">
                    <div className="max-w-4xl mx-auto flex gap-3">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`Chat with ${selectedCharacter.name}...`}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        disabled={isTyping}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || isTyping}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        <Send size={18} />
                        <span className="hidden sm:inline font-medium">Send</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3 flex items-center justify-center gap-2">
                      <Code2 size={12} />
                      Powered by open-source AI models • Self-hostable • No tracking
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Character Profile Panel */}
            {selectedCharacter && (
              <div className="hidden xl:block w-80">
                <CharacterProfile
                  name={selectedCharacter.name}
                  description={selectedCharacter.description}
                  avatar={selectedCharacter.avatar_url}
                  model={MODELS[currentModel]?.name || 'Soft Launch'}
                  creator="Character Labs"
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {showCreateModal && (
        <CharacterCreator onClose={() => setShowCreateModal(false)} onCreated={onCharacterCreated} />
      )}
    </div>
  );
}