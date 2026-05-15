import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:5000';
const FRAME_INTERVAL_MS = 120;

const INITIAL_STATS = {
  reps: 0,
  form: 'Ready',
  feedback: 'Press Start to begin live tracking',
  knee_angle: 0,
  arm_angle: 0,
  shoulder_angle: 0,
};

const EXERCISE_HINTS = {
  squat: 'Face the camera sideways. Go down until knees bend ~90°, then stand.',
  bicep_curl: 'Face the camera. Keep elbows still, curl arms up and down.',
  lateral_raise: 'Face the camera. Raise arms to shoulder height, slight bend in elbows.',
};

const LiveCamera = ({ exerciseType }) => {
  const webcamRef = useRef(null);
  const socketRef = useRef(null);
  const ignoreFramesUntilRef = useRef(0);
  const frameBusyRef = useRef(false);
  const lastFrameSentRef = useRef(0);
  const isFirstExerciseRef = useRef(true);

  const [processedImage, setProcessedImage] = useState(null);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [isActive, setIsActive] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [connected, setConnected] = useState(false);

  const applyResetStats = useCallback((nextStats) => {
    setStats({ ...INITIAL_STATS, ...nextStats });
    setProcessedImage(null);
    ignoreFramesUntilRef.current = Date.now() + 400;
    frameBusyRef.current = false;
  }, []);

  const resetExercise = useCallback(async () => {
    setResetting(true);
    setIsActive(false);
    applyResetStats({ feedback: 'Resetting...' });

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('reset_exercise', { exercise_type: exerciseType });
        setTimeout(() => setResetting(false), 1500);
      } else {
        const res = await fetch(`${API_BASE}/api/exercise/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercise_type: exerciseType }),
        });
        const data = await res.json();
        applyResetStats(data.stats || INITIAL_STATS);
        setResetting(false);
      }
    } catch (error) {
      console.error('Reset failed:', error);
      applyResetStats({ feedback: 'Reset failed — start the backend (python app.py)' });
      setResetting(false);
    }
  }, [exerciseType, applyResetStats]);

  useEffect(() => {
    const socket = io(API_BASE, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('Live tracking connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      frameBusyRef.current = false;
    });

    socket.on('processed_frame', (data) => {
      frameBusyRef.current = false;
      if (Date.now() < ignoreFramesUntilRef.current) return;
      setProcessedImage(data.image);
      setStats(data.stats);
    });

    socket.on('exercise_reset', (data) => {
      if (data.exercise_type && data.exercise_type !== exerciseType) return;
      applyResetStats(data.stats || INITIAL_STATS);
      setResetting(false);
    });

    socket.on('error', (data) => {
      console.error('Server error:', data);
      frameBusyRef.current = false;
      setResetting(false);
    });

    return () => socket.disconnect();
  }, [exerciseType, applyResetStats]);

  useEffect(() => {
    if (isFirstExerciseRef.current) {
      isFirstExerciseRef.current = false;
      setStats({
        ...INITIAL_STATS,
        feedback: 'Press Start to begin live tracking',
      });
      return;
    }
    resetExercise();
  }, [exerciseType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive || resetting || !connected) return undefined;

    const sendFrame = () => {
      const now = Date.now();
      if (
        frameBusyRef.current ||
        now - lastFrameSentRef.current < FRAME_INTERVAL_MS ||
        !webcamRef.current ||
        !socketRef.current?.connected
      ) {
        return;
      }

      const imageSrc = webcamRef.current.getScreenshot({
        width: 640,
        height: 480,
      });

      if (!imageSrc) return;

      frameBusyRef.current = true;
      lastFrameSentRef.current = now;
      socketRef.current.emit('frame', {
        image: imageSrc,
        exercise_type: exerciseType,
      });
    };

    const interval = setInterval(sendFrame, 50);
    return () => clearInterval(interval);
  }, [isActive, exerciseType, resetting, connected]);

  const handleStartStop = () => {
    if (isActive) {
      setIsActive(false);
      setProcessedImage(null);
      setStats((s) => ({ ...s, feedback: 'Paused. Press Start to resume.' }));
    } else {
      if (!connected) {
        setStats((s) => ({
          ...s,
          feedback: 'Waiting for server… Run: python app.py in backend folder',
        }));
        return;
      }
      frameBusyRef.current = false;
      setProcessedImage(null);
      setStats({ ...INITIAL_STATS, feedback: 'Tracking started — move into frame!' });
      setIsActive(true);
    }
  };

  const formColor =
    stats.form === 'Perfect'
      ? 'text-green-400'
      : stats.form === 'Good'
        ? 'text-yellow-400'
        : stats.form === 'Ready'
          ? 'text-cyan-400'
          : 'text-red-400';

  const angle =
    stats.knee_angle || stats.arm_angle || stats.shoulder_angle || 0;

  const showProcessed = isActive && processedImage;

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Live Workout</h2>
          <p className="text-sm text-gray-400 mt-1">{EXERCISE_HINTS[exerciseType]}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Server connected' : 'Server offline'}
          </span>
          {isActive && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-900 text-red-200 animate-pulse">
              LIVE
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video mirror-video">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.75}
              className={`w-full h-full object-cover ${showProcessed ? 'invisible absolute inset-0' : ''}`}
              videoConstraints={{
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
              }}
            />
            {showProcessed && (
              <img
                src={processedImage}
                alt="Live pose tracking"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center p-6">
                <p className="text-4xl mb-3">📹</p>
                <p className="text-lg font-semibold text-white">Camera ready</p>
                <p className="text-sm text-gray-300 mt-2 max-w-md">
                  Click <strong>Start Live Tracking</strong> to see your skeleton, rep count, and form feedback in real time.
                </p>
              </div>
            )}

            {isActive && (
              <div className="absolute top-3 left-3 right-3 flex justify-between pointer-events-none">
                <div className="bg-black/75 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-xs text-gray-400 uppercase">Reps</span>
                  <p className="text-3xl font-bold text-green-400">{stats.reps}</p>
                </div>
                <div className={`bg-black/75 backdrop-blur px-4 py-2 rounded-lg ${formColor}`}>
                  <span className="text-xs text-gray-400 uppercase">Form</span>
                  <p className="text-lg font-bold">{stats.form}</p>
                </div>
              </div>
            )}

            {isActive && stats.feedback && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                <p className="text-xl md:text-2xl font-bold text-white text-center drop-shadow-lg">
                  {stats.feedback}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleStartStop}
              disabled={resetting}
              className={`flex-1 py-3 rounded-lg font-bold transition disabled:opacity-50 ${
                isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              {isActive ? 'Stop tracking' : 'Start live tracking'}
            </button>
            <button
              type="button"
              onClick={resetExercise}
              disabled={resetting}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-bold"
            >
              {resetting ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
            <h3 className="text-sm font-semibold opacity-80">REPS</h3>
            <p className="text-6xl font-bold">{stats.reps}</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 font-semibold">FORM</h3>
            <p className={`text-3xl font-bold ${formColor}`}>{stats.form}</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 font-semibold">JOINT ANGLE</h3>
            <p className="text-3xl font-bold text-cyan-400">{angle}°</p>
          </div>

          <div className="bg-blue-600 rounded-xl p-6 text-white min-h-[120px]">
            <h3 className="text-sm font-semibold opacity-80">LIVE FEEDBACK</h3>
            <p className="text-lg font-medium mt-2 leading-snug">{stats.feedback}</p>
          </div>

          {!connected && (
            <div className="bg-amber-900/80 border border-amber-600 rounded-xl p-4 text-amber-100 text-sm">
              <p className="font-bold mb-1">Backend required</p>
              <p>In a terminal run:</p>
              <code className="block mt-2 bg-black/40 p-2 rounded text-xs">
                cd backend → venv\Scripts\activate → python app.py
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCamera;
