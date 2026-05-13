import { useState, useEffect } from 'react';
import { Brain, Zap, Sparkles, Rocket, ChevronDown, Check } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '⚡': Zap,
  '🎭': Sparkles,
  '🧠': Brain,
  '🚀': Rocket
};

interface Model {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ currentModel, onModelChange, disabled }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/models');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([
        { id: 'softlaunch', name: 'Soft Launch', description: 'Best for Roleplay', icon: '🎭', features: ['consistent', 'memory'] },
        { id: 'pipsqueak', name: 'PipSqueak', description: 'Fast & Efficient', icon: '⚡', features: ['fast'] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = models.find(m => m.id === currentModel) || models[0];
  const IconComponent = selectedModel ? iconMap[selectedModel.icon] || Sparkles : Sparkles;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${
          disabled 
            ? 'bg-gray-100 cursor-not-allowed opacity-50 border-gray-200 text-gray-500' 
            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300'
        }`}
      >
        <IconComponent size={16} className="text-blue-600" />
        <span>{selectedModel?.name || 'Select Model'}</span>
        {!disabled && <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-20 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Select Model</div>
              {models.map((model) => {
                const ModelIcon = iconMap[model.icon] || Sparkles;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                      model.id === currentModel 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${model.id === currentModel ? 'bg-blue-600' : 'bg-gray-100'}`}>
                      <ModelIcon size={16} className={model.id === currentModel ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{model.name}</span>
                        {model.id === currentModel && <Check size={14} className="text-blue-600" />}
                        {model.id === 'softlaunch' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Best</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{model.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}