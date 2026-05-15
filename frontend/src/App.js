import React, { useState } from 'react';
import LiveCamera from './components/LiveCamera';
import VideoUpload from './components/VideoUpload';
import DietPlanner from './components/DietPlanner';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [exerciseType, setExerciseType] = useState('squat');

  const exercises = [
    { id: 'squat', name: '🏋️ Squats' },
    { id: 'bicep_curl', name: '💪 Bicep Curls' },
    { id: 'lateral_raise', name: '🙆 Lateral Raises' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
      <nav className="bg-black bg-opacity-30 backdrop-blur-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">🏋️ AI Fitness Trainer</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'live' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              📹 Live
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'upload' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              📁 Upload
            </button>
            <button
              onClick={() => setActiveTab('diet')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'diet' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              🍽️ Diet
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {(activeTab === 'live' || activeTab === 'upload') && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3">Select Exercise:</h2>
            <div className="flex gap-3 flex-wrap">
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setExerciseType(ex.id)}
                  className={`px-6 py-3 rounded-xl font-bold transition ${
                    exerciseType === ex.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 scale-105'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <>
            <p className="text-gray-300 mb-4 text-center max-w-2xl mx-auto">
              Real-time pose detection with rep counting and form feedback. Allow camera access, then press Start.
            </p>
            <LiveCamera exerciseType={exerciseType} />
          </>
        )}
        {activeTab === 'upload' && <VideoUpload exerciseType={exerciseType} />}
        {activeTab === 'diet' && <DietPlanner />}
      </div>
    </div>
  );
}

export default App;

