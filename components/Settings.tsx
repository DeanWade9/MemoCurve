import React from 'react';
import { AppConfig } from '../types';
import { Save } from 'lucide-react';

interface SettingsProps {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ config, onSave, onClose }) => {
  const [localConfig, setLocalConfig] = React.useState<AppConfig>(config);

  const handleFieldToggle = (side: 'frontFields' | 'backFields', field: string) => {
    setLocalConfig(prev => {
      const current = prev[side] as string[];
      if (current.includes(field)) {
        return { ...prev, [side]: current.filter(f => f !== field) };
      } else {
        return { ...prev, [side]: [...current, field] };
      }
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <div className="p-4 space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-800 mb-4">Flashcard Appearance</h3>
        
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Front Side Fields</h4>
                <div className="space-y-2">
                    {['content', 'meaning', 'example', 'aiQuestion'].map(field => (
                         <label key={`front-${field}`} className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={localConfig.frontFields.includes(field as any)}
                                onChange={() => handleFieldToggle('frontFields', field)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="capitalize text-slate-700">{field === 'aiQuestion' ? 'AI Question' : field}</span>
                         </label>
                    ))}
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Back Side Fields</h4>
                <div className="space-y-2">
                    {['content', 'meaning', 'example'].map(field => (
                         <label key={`back-${field}`} className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={localConfig.backFields.includes(field as any)}
                                onChange={() => handleFieldToggle('backFields', field)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="capitalize text-slate-700">{field}</span>
                         </label>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 mb-4">Review Logic</h3>
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-600">Effective Review Duration (seconds)</label>
                <input 
                    type="number" 
                    min={1} 
                    max={60} 
                    value={localConfig.reviewDurationTrigger}
                    onChange={(e) => setLocalConfig({...localConfig, reviewDurationTrigger: parseInt(e.target.value) || 10})}
                    className="border border-slate-300 rounded px-3 py-2 w-full md:w-1/3"
                />
                <p className="text-xs text-slate-400">Time required looking at a card to count as a review.</p>
            </div>
        </div>
      </div>

      <div className="opacity-50 pointer-events-none grayscale">
        <h3 className="text-lg font-medium text-slate-800 mb-4 flex justify-between">
            Mobile Notifications 
            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">Reserved for Mobile</span>
        </h3>
        <div className="flex gap-4">
            {['None', 'Push', 'SMS', 'Email'].map(method => (
                <label key={method} className="flex items-center gap-2">
                    <input type="radio" name="notification" checked={localConfig.reminderMethod === method} readOnly />
                    <span>{method}</span>
                </label>
            ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
            <Save size={18} /> Save Configuration
        </button>
      </div>
    </div>
  );
};
