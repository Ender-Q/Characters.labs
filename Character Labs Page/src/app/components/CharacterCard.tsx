import { Avatar } from '@mui/material';
import { MessageCircle } from 'lucide-react';

interface CharacterCardProps {
  name: string;
  description: string;
  avatar?: string;
  messageCount: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function CharacterCard({
  name,
  description,
  avatar,
  messageCount,
  isActive,
  onClick
}: CharacterCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
        isActive
          ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-500 shadow-md shadow-blue-500/20'
          : 'bg-white/50 backdrop-blur border-gray-200 hover:bg-white hover:shadow-md hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar src={avatar} alt={name} sx={{ width: 48, height: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {name[0]}
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2 mt-1 leading-relaxed">{description}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <MessageCircle size={12} />
            <span>{messageCount.toLocaleString()} chats</span>
          </div>
        </div>
      </div>
    </div>
  );
}
