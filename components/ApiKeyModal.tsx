import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSubmit: (apiKey: string) => void;
  error?: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit, error }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-cyan-500/30">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-white mb-2">Enter Your Gemini API Key</h2>
          <p className="text-gray-400 mb-6">
            To use the Time Traveler, please provide your own API key. Your key is saved securely in your browser's local storage.
          </p>
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-cyan-300 text-sm font-bold mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Enter your key here"
              required
              aria-describedby="error-message"
            />
             {error && <p id="error-message" className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-cyan-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-cyan-400 transition-colors duration-300 disabled:bg-gray-600"
            disabled={!apiKey.trim()}
          >
            Start Traveling
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Don't have a key?{' '}
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Get one from Google AI Studio
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
