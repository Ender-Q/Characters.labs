import { useState } from 'react';
import { X, Plus, Sparkles, Save } from 'lucide-react';

const ARCHETYPES = ['hero', 'mentor', 'trickster', 'sage', 'rebel', 'guardian', 'explorer', 'creator', 'custom'];
const DIALOGUE_STYLES = ['casual', 'formal', 'poetic', 'witty', 'dramatic', 'whimsical', 'stoic'];
const DIALOGUE_TONES = ['warm', 'stern', 'playful', 'melancholic', 'cheerful', 'mysterious', 'sarcastic'];
const RELATIONSHIP_TYPES = ['friend', 'rival', 'mentor', 'family', 'ally', 'enemy', 'love_interest', 'other'];
const OUTPUT_SIZES = ['small', 'medium', 'large', 'custom'];

const ATTR_LABELS: Record<string, string> = {
  intelligence: 'Intelligence',
  empathy: 'Empathy',
  humor: 'Humor',
  creativity: 'Creativity',
  wisdom: 'Wisdom',
  charisma: 'Charisma'
};

const DEFAULT_ATTRS = { intelligence: 50, empathy: 50, humor: 50, creativity: 50, wisdom: 50, charisma: 50 };

export function CharacterCreator({ onClose, onCreated }: { onClose: () => void; onCreated: (char: any) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [greeting, setGreeting] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [background, setBackground] = useState('');
  const [archetype, setArchetype] = useState('custom');
  const [dialogueStyle, setDialogueStyle] = useState('casual');
  const [tone, setTone] = useState('warm');
  const [catchphraseInput, setCatchphraseInput] = useState('');
  const [catchphrases, setCatchphrases] = useState<string[]>([]);
  const [speechPattern, setSpeechPattern] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [mood, setMood] = useState('');
  const [relationships, setRelationships] = useState<Array<{ target_name: string; type: string; description: string }>>([]);
  const [relName, setRelName] = useState('');
  const [relType, setRelType] = useState('friend');
  const [relDesc, setRelDesc] = useState('');
  const [attrs, setAttrs] = useState(DEFAULT_ATTRS);
  const [outputSize, setOutputSize] = useState('medium');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [maxTokens, setMaxTokens] = useState(500);
  const [temperature, setTemperature] = useState(0.8);
  const [saving, setSaving] = useState(false);

  const addTrait = () => {
    const t = traitInput.trim();
    if (t && !traits.includes(t)) { setTraits([...traits, t]); setTraitInput(''); }
  };

  const removeTrait = (t: string) => setTraits(traits.filter(x => x !== t));

  const addCatchphrase = () => {
    const c = catchphraseInput.trim();
    if (c && !catchphrases.includes(c)) { setCatchphrases([...catchphrases, c]); setCatchphraseInput(''); }
  };

  const removeCatchphrase = (c: string) => setCatchphrases(catchphrases.filter(x => x !== c));

  const addRelationship = () => {
    if (!relName.trim()) return;
    setRelationships([...relationships, { target_name: relName.trim(), type: relType, description: relDesc.trim() }]);
    setRelName(''); setRelDesc('');
  };

  const removeRelationship = (i: number) => setRelationships(relationships.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !greeting.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        greeting: greeting.trim(),
        avatar_url: avatarUrl.trim(),
        personality: { traits, background, archetype },
        dialogue: { style: dialogueStyle, tone, catchphrases, speech_pattern: speechPattern },
        visual: { art_style: artStyle, color_palette: colorPalette.split(',').map(s => s.trim()).filter(Boolean), mood, custom_params: {} },
        relationships,
        attributes: attrs,
        output: {
          size: outputSize,
          custom_width: outputSize === 'custom' && customWidth ? parseInt(customWidth) : null,
          custom_height: outputSize === 'custom' && customHeight ? parseInt(customHeight) : null,
          max_tokens: maxTokens,
          temperature
        }
      };

      const response = await fetch('/api/v2/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const char = await response.json();
        onCreated({
          id: char._id,
          _v2: true,
          name: char.name,
          description: char.description,
          personality: char.personality?.traits?.join(', ') || 'friendly and engaging',
          greeting: char.greeting,
          avatar_url: char.avatar_url,
          lorebook: '[]',
          output: char.output
        });
        onClose();
      } else {
        const err = await response.json();
        alert('Save failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTagInput = (value: string, onChange: (v: string) => void, onAdd: () => void, tags: string[], onRemove: (t: string) => void, placeholder: string) => (
    <div>
      <div className="flex gap-2 mb-1">
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={placeholder} />
        <button type="button" onClick={onAdd} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Add</button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
              {t}
              <button type="button" onClick={() => onRemove(t)} className="hover:text-red-500">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create Character</h2>
              <p className="text-xs text-gray-500">Descriptions are metadata — never processed as instructions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Character name" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Description * <span className="text-xs text-gray-400">(metadata only)</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Who is this character? This is stored as metadata and never used as an AI instruction." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Greeting *</label>
                <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="First message your character says..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Avatar URL</label>
                <input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
              </div>
            </div>
          </section>

          {/* Personality */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Personality</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Traits</label>
                {renderTagInput(traitInput, setTraitInput, addTrait, traits, removeTrait, 'e.g. brave, witty...')}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Background Story</label>
                <textarea value={background} onChange={e => setBackground(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Character backstory and history..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Archetype</label>
                <select value={archetype} onChange={e => setArchetype(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                  {ARCHETYPES.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Dialogue */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Dialogue Style</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Style</label>
                <select value={dialogueStyle} onChange={e => setDialogueStyle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                  {DIALOGUE_STYLES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                  {DIALOGUE_TONES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Catchphrases</label>
                {renderTagInput(catchphraseInput, setCatchphraseInput, addCatchphrase, catchphrases, removeCatchphrase, 'e.g. By the power of...')}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Speech Pattern</label>
                <textarea value={speechPattern} onChange={e => setSpeechPattern(e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="How does the character speak? (formal, uses slang, stutters, etc.)" />
              </div>
            </div>
          </section>

          {/* Visual */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Visual Style</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Art Style</label>
                <input type="text" value={artStyle} onChange={e => setArtStyle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="anime, realistic, pixel..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Color Palette (hex, comma-separated)</label>
                <input type="text" value={colorPalette} onChange={e => setColorPalette(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="#FF6B6B, #4ECDC4..." />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Mood</label>
                <input type="text" value={mood} onChange={e => setMood(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="dark, cheerful, mysterious..." />
              </div>
            </div>
          </section>

          {/* Relationships */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Relationships</h3>
            <div className="space-y-2 mb-3">
              {relationships.map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                  <span className="font-medium">{r.target_name}</span>
                  <span className="text-gray-400">—</span>
                  <span className="text-gray-500 capitalize">{r.type}</span>
                  {r.description && <><span className="text-gray-400">·</span><span className="text-gray-400 text-xs">{r.description}</span></>}
                  <button type="button" onClick={() => removeRelationship(i)} className="ml-auto text-gray-400 hover:text-red-500">&times;</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input type="text" value={relName} onChange={e => setRelName(e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Character name" />
              </div>
              <select value={relType} onChange={e => setRelType(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <button type="button" onClick={addRelationship} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus size={16} /></button>
            </div>
          </section>

          {/* Attributes */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Attributes</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(attrs).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{ATTR_LABELS[key] || key}</span>
                    <span className="text-blue-600 font-medium">{val}</span>
                  </div>
                  <input type="range" min="0" max="100" value={val}
                    onChange={e => setAttrs({ ...attrs, [key]: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
              ))}
            </div>
          </section>

          {/* Output Preferences */}
          <section className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Output Preferences</h3>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Generation config</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Response Size</label>
                <div className="flex gap-2">
                  {OUTPUT_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => setOutputSize(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${outputSize === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s === 'custom' ? 'Custom' : s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Max Tokens</label>
                  <input type="range" min="100" max="2000" step="100" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} className="w-full accent-blue-600" />
                  <span className="text-xs text-gray-400">{maxTokens}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Temperature</label>
                  <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full accent-blue-600" />
                  <span className="text-xs text-gray-400">{temperature.toFixed(1)}</span>
                </div>
              </div>
              {outputSize === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Width (px)</label>
                    <input type="number" value={customWidth} onChange={e => setCustomWidth(e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" placeholder="800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Height (px)</label>
                    <input type="number" value={customHeight} onChange={e => setCustomHeight(e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" placeholder="600" />
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Metadata Notice:</strong> All character descriptions, personality traits, and background story are stored as metadata only.
            They are never processed as AI generation instructions. Only the greeting, name, and output preferences affect AI behavior.
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !description.trim() || !greeting.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Character'}
          </button>
        </div>
      </div>
    </div>
  );
}
