import React, { useState } from 'react';
import { api } from '../services/api';

const VideoUpload = ({ exerciseType }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('exercise_type', exerciseType);

    try {
      const response = await api.uploadVideo(formData);
      setResult(response.data);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">📹 Upload Exercise Video</h2>

      <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center mb-4">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="hidden"
          id="video-upload"
        />
        <label htmlFor="video-upload" className="cursor-pointer">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-lg">{file ? file.name : 'Click to select video'}</p>
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-bold"
      >
        {loading ? '⏳ Analyzing...' : '🚀 Analyze Form'}
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-400">Total Reps</p>
              <p className="text-3xl font-bold text-green-400">{result.analysis.total_reps}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-400">Form Score</p>
              <p className="text-3xl font-bold text-yellow-400">{result.analysis.form_score}/10</p>
            </div>
          </div>

          <div className="bg-blue-900 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-3">🤖 AI Feedback</h3>
            <p className="whitespace-pre-line">{result.ai_feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;


