import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LayoutGrid, RotateCw } from 'lucide-react';
import { Flashcard, AppConfig, ViewMode, DEFAULT_CONFIG } from './types';
import { Dashboard } from './components/Dashboard';
import { FlashcardReview } from './components/FlashcardReview';
import { Settings } from './components/Settings';
import { Modal } from './components/Modal';

const STORAGE_KEY = 'memocurve_data';
const CONFIG_KEY = 'memocurve_config';

const App: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCards = localStorage.getItem(STORAGE_KEY);
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (e) {
        console.error("Failed to parse cards", e);
      }
    }
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const handleAddCard = (card: Flashcard) => {
    setCards(prev => [...prev, card]);
  };

  const handleUpdateCard = (updatedCard: Flashcard) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
  };

  const handleDeleteCards = (ids: string[]) => {
    setCards(prev => prev.filter(c => !ids.includes(c.id)));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setViewMode(ViewMode.DASHBOARD)}>
              <div className="bg-indigo-600 p-2 rounded-lg mr-3">
                <RotateCw className="text-white h-5 w-5" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">MemoCurve</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {viewMode === ViewMode.REVIEW && (
                 <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="text-slate-500 hover:text-indigo-600 font-medium text-sm">
                    Back to Dashboard
                 </button>
              )}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                title="Configuration"
              >
                <SettingsIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50">
        {viewMode === ViewMode.DASHBOARD && (
          <Dashboard 
            cards={cards}
            onAddCard={handleAddCard}
            onDeleteCards={handleDeleteCards}
            onStartReview={() => setViewMode(ViewMode.REVIEW)}
            onUpdateCard={handleUpdateCard}
          />
        )}

        {viewMode === ViewMode.REVIEW && (
          <FlashcardReview 
            cards={cards}
            config={config}
            onUpdateCard={handleUpdateCard}
            onExit={() => setViewMode(ViewMode.DASHBOARD)}
          />
        )}
      </main>

      {/* Settings Modal */}
      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        title="App Configuration"
      >
        <Settings 
          config={config} 
          onSave={setConfig} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </Modal>
    </div>
  );
};

export default App;
