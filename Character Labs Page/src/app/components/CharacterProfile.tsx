import { Avatar } from '@mui/material';
import { Github, Globe, Zap } from 'lucide-react';

interface CharacterProfileProps {
  name: string;
  description: string;
  avatar?: string;
  model: string;
  creator: string;
}

export function CharacterProfile({ name, description, avatar, model, creator }: CharacterProfileProps) {
  return (
    <div className="p-6 bg-white/80 backdrop-blur-xl border-l border-gray-200/50 shadow-xl h-full overflow-y-auto">
      <div className="flex flex-col items-center text-center">
        <Avatar src={avatar} alt={name} sx={{ width: 96, height: 96, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {name[0]}
        </Avatar>
        <h2 className="mt-4 text-xl font-bold text-gray-900">{name}</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>

        <div className="w-full mt-8 space-y-3">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3 text-sm">
              <Zap size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <span className="text-gray-700 block mb-1">Model</span>
                <span className="font-semibold text-gray-900">{model}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-start gap-3 text-sm">
              <Github size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <span className="text-gray-700 block mb-1">Creator</span>
                <span className="font-semibold text-gray-900">{creator}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Globe size={18} className="text-green-600" />
              <span className="font-semibold text-green-700">Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
