import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const api = {
  createUser: (data) => axios.post(`${API_URL}/users`, data),
  getUser: (id) => axios.get(`${API_URL}/users/${id}`),

  resetExercise: (exercise_type) => axios.post(`${API_URL}/exercise/reset`, { exercise_type }),
  analyzeFrame: (data) => axios.post(`${API_URL}/exercise/analyze-frame`, data),

  uploadVideo: (formData) => axios.post(`${API_URL}/video/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  generateDiet: (data) =>
    axios.post(`${API_URL}/diet/generate`, data, { timeout: 90000 }),

  saveWorkout: (data) => axios.post(`${API_URL}/workouts`, data),
  getWorkouts: (userId) => axios.get(`${API_URL}/workouts/${userId}`),
};


