import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:5000';
const FRAME_INTERVAL_MS = 120;

const INITIAL_STATS = {
  reps: 0,
  form: 'Ready',
  feedback: 'Allow camera access when prompted',
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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

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

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
    setStats((s) => ({
      ...s,
      feedback: isActive ? s.feedback : 'Camera on — press Start live tracking',
    }));
  }, [isActive]);

  const handleCameraError = useCallback((error) => {
    console.error('Camera error:', error);
    const message =
      error?.name === 'NotAllowedError'
        ? 'Camera blocked. Click the lock icon in the address bar and allow Camera, then refresh.'
        : error?.name === 'NotFoundError'
          ? 'No camera found. Connect a webcam or enable it in Windows Settings.'
          : `Camera error: ${error?.message || 'Could not access camera'}`;
    setCameraError(message);
    setCameraReady(false);
    setStats((s) => ({ ...s, feedback: message }));
  }, []);

  useEffect(() => {
    const socket = io(API_BASE, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
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
      return;
    }
    resetExercise();
  }, [exerciseType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive || resetting || !connected || !cameraReady) return undefined;

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

      const imageSrc = webcamRef.current.getScreenshot();
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
  }, [isActive, exerciseType, resetting, connected, cameraReady]);

  const handleStartStop = () => {
    if (!cameraReady) {
      setStats((s) => ({
        ...s,
        feedback: cameraError || 'Waiting for camera — allow access in the browser',
      }));
      return;
    }

    if (isActive) {
      setIsActive(false);
      setProcessedImage(null);
      setStats((s) => ({ ...s, feedback: 'Paused. Press Start to resume.' }));
    } else {
      if (!connected) {
        setStats((s) => ({
          ...s,
          feedback: 'Backend offline — run: python app.py in the backend folder',
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

  const angle = stats.knee_angle || stats.arm_angle || stats.shoulder_angle || 0;
  const showSkeletonOverlay = isActive && processedImage;

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Live Workout</h2>
          <p className="text-sm text-gray-400 mt-1">{EXERCISE_HINTS[exerciseType]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              cameraReady ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cameraReady ? 'bg-green-400' : 'bg-gray-400'
              }`}
            />
            {cameraReady ? 'Camera on' : 'Camera starting…'}
          </span>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}
            />
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
          <div
            className="relative bg-black rounded-xl overflow-hidden w-full"
            style={{ minHeight: '360px', aspectRatio: '16 / 9' }}
          >
            {/* Live camera — always mounted and visible */}
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored
              screenshotFormat="image/jpeg"
              screenshotQuality={0.8}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
              className="absolute inset-0 w-full h-full object-cover z-0"
              videoConstraints={{ facingMode: 'user' }}
            />

            {/* Skeleton overlay when tracking */}
            {showSkeletonOverlay && (
              <img
                src={processedImage}
                alt="Pose tracking overlay"
                className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
              />
            )}

            {/* Loading camera */}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-white font-medium">Starting camera…</p>
                <p className="text-gray-400 text-sm mt-1">Allow camera access if prompted</p>
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                <p className="text-4xl mb-3">📷</p>
                <p className="text-red-300 font-semibold mb-2">Camera not available</p>
                <p className="text-gray-300 text-sm max-w-md">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {/* HUD when tracking */}
            {isActive && cameraReady && (
              <>
                <div className="absolute top-3 left-3 right-3 flex justify-between pointer-events-none z-20">
                  <div className="bg-black/75 backdrop-blur px-4 py-2 rounded-lg">
                    <span className="text-xs text-gray-400 uppercase">Reps</span>
                    <p className="text-3xl font-bold text-green-400">{stats.reps}</p>
                  </div>
                  <div className={`bg-black/75 backdrop-blur px-4 py-2 rounded-lg ${formColor}`}>
                    <span className="text-xs text-gray-400 uppercase">Form</span>
                    <p className="text-lg font-bold">{stats.form}</p>
                  </div>
                </div>
                {stats.feedback && (
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10 pointer-events-none">
                    <p className="text-lg md:text-xl font-bold text-white text-center">
                      {stats.feedback}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {!isActive && cameraReady && (
            <p className="mt-3 text-center text-gray-300 text-sm">
              Your camera is live above. Press <strong className="text-white">Start live tracking</strong> for pose detection and rep counting.
            </p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleStartStop}
              disabled={resetting || !cameraReady}
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
              <p className="font-bold mb-1">Backend required for tracking</p>
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
