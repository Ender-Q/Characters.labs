import { Avatar } from '@mui/material';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  characterName?: string;
  characterAvatar?: string;
  timestamp: string;
}

export function ChatMessage({ message, isUser, characterName, characterAvatar, timestamp }: ChatMessageProps) {
  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <Avatar
        sx={{ width: 44, height: 44, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        src={characterAvatar}
        alt={isUser ? 'You' : characterName}
      >
        {isUser ? 'U' : characterName?.[0]}
      </Avatar>
      <div className={`flex flex-col max-w-[70%] ${isUser ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-900">
            {isUser ? 'You' : characterName}
          </span>
          <span className="text-xs text-gray-500">{timestamp}</span>
        </div>
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}
