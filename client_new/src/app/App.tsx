import { useState, useEffect, useRef } from 'react';
import { Github, Send, Menu, Plus, Search, Sparkles, Code2, X } from 'lucide-react';
import { CharacterCard } from './components/CharacterCard';
import { ChatMessage } from './components/ChatMessage';
import { CharacterProfile } from './components/CharacterProfile';
import { ModelSelector } from './components/ModelSelector';
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
  id: number;
  name: string;
  description: string;
  personality?: string;
  greeting?: string;
  avatar_url?: string;
  lorebook?: string;
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
  const [createForm, setCreateForm] = useState({ name: '', description: '', greeting: '', avatar_url: '' });
  const [creating, setCreating] = useState(false);
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

  const handleNewChat = () => {
    setSelectedCharacter(null);
    setMessages([]);
    setConversationId(null);
    setMessage('');
  };

  const handleCreateCharacter = async () => {
    if (!createForm.name.trim() || !createForm.description.trim() || !createForm.greeting.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          greeting: createForm.greeting,
          avatar_url: createForm.avatar_url,
          personality: 'friendly and engaging'
        })
      });
      
      if (response.ok) {
        const newChar = await response.json();
        setCharacters(prev => [newChar, ...prev]);
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '', greeting: '', avatar_url: '' });
        handleCharacterSelect(newChar);
      }
    } catch (error) {
      console.error('Error creating character:', error);
    } finally {
      setCreating(false);
    }
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

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Character</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Captain Jack Sparrow"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="A quirky pirate captain who loves adventures..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Greeting *</label>
                <textarea
                  value={createForm.greeting}
                  onChange={(e) => setCreateForm({...createForm, greeting: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Ahoy there, matey! What brings ye to my ship?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                <input
                  type="url"
                  value={createForm.avatar_url}
                  onChange={(e) => setCreateForm({...createForm, avatar_url: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCharacter}
                disabled={creating || !createForm.name.trim() || !createForm.description.trim() || !createForm.greeting.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}