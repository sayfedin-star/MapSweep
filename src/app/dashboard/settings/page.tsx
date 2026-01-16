'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, X, Save, RotateCcw } from 'lucide-react';

// Original default stop words
const ORIGINAL_STOP_WORDS = [
  // Grammar
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "in", "is", "it", "of", "on", "or", "that", "the", "to", "with", "was", "will",
  // Recipe generic
  "recipe", "recipes", "easy", "best", "simple", "quick", "perfect", "homemade", "delicious", "tasty", "amazing", "ultimate", "classic"
];

export default function SettingsPage() {
  const [stopWords, setStopWords] = useState<string[]>([]);
  const [customWords, setCustomWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/stop-words');
      if (res.ok) {
        const data = await res.json();
        setStopWords(data.stopWords || ORIGINAL_STOP_WORDS);
        setCustomWords(data.customWords || []);
      } else {
        // Use defaults if no settings saved yet
        setStopWords(ORIGINAL_STOP_WORDS);
        setCustomWords([]);
      }
    } catch (error) {
      console.error(error);
      setStopWords(ORIGINAL_STOP_WORDS);
      setCustomWords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/settings/stop-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopWords, customWords })
      });
      if (res.ok) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error(error);
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomWord = () => {
    const word = newWord.trim().toLowerCase();
    if (word && !customWords.includes(word) && !stopWords.includes(word)) {
      setCustomWords([...customWords, word]);
      setNewWord('');
    }
  };

  const removeCustomWord = (word: string) => {
    setCustomWords(customWords.filter(w => w !== word));
  };

  const removeStopWord = (word: string) => {
    setStopWords(stopWords.filter(w => w !== word));
  };

  const addStopWord = (word: string) => {
    if (!stopWords.includes(word)) {
      setStopWords([...stopWords, word]);
    }
  };

  const resetToDefaults = () => {
    setStopWords(ORIGINAL_STOP_WORDS);
    setCustomWords([]);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Settings size={28} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Configure global analysis settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-md ${saveMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {saveMessage}
        </div>
      )}

      {/* Stop Words Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Excluded Common Words</h2>
        <p className="text-sm text-gray-500 mb-6">
          These words are filtered out from Topic Analysis across all domains. You can remove words from the default list or add custom exclusions.
        </p>

        {/* Default Stop Words */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Default Stop Words ({stopWords.length})</h3>
            <span className="text-xs text-gray-400">Click X to remove from defaults</span>
          </div>
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            {stopWords.map((word, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white border rounded-full text-gray-700 hover:bg-gray-100 group">
                {word}
                <button 
                  onClick={() => removeStopWord(word)} 
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Add back removed defaults */}
        {ORIGINAL_STOP_WORDS.filter(w => !stopWords.includes(w)).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Removed Defaults (click to restore)</h3>
            <div className="flex flex-wrap gap-2">
              {ORIGINAL_STOP_WORDS.filter(w => !stopWords.includes(w)).map((word, i) => (
                <button 
                  key={i}
                  onClick={() => addStopWord(word)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 border border-dashed rounded-full text-gray-500 hover:bg-gray-200"
                >
                  <Plus size={14} />
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Words */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Stop Words ({customWords.length})</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {customWords.length === 0 ? (
              <span className="text-sm text-gray-400 italic">No custom words added</span>
            ) : (
              customWords.map((word, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 border border-indigo-200 rounded-full text-indigo-700">
                  {word}
                  <button onClick={() => removeCustomWord(word)} className="text-indigo-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomWord()}
              placeholder="Add custom word to exclude..."
              className="flex-1 px-4 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={addCustomWord}
              disabled={!newWord.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={16} />
              Add Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
