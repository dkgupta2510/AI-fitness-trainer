import React, { useState } from 'react';
import { api } from '../services/api';

const DietPlanner = () => {
  const [formData, setFormData] = useState({
    diet_type: 'veg',
    goal: 'maintenance',
    weight: 70,
    height: 170,
    age: 25,
    gender: 'male',
    activity_level: 'moderate',
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const response = await api.generateDiet(formData);
      const data = response.data;

      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Could not reach server. Start the backend: python app.py';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-900 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">AI Diet Planner</h2>
        <p className="text-sm text-gray-400 mb-4">
          Powered by Groq. Requires <code className="text-purple-300">GROQ_API_KEY</code> in backend/.env
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Diet Type</label>
              <select
                value={formData.diet_type}
                onChange={(e) => setFormData({ ...formData, diet_type: e.target.value })}
                className="w-full p-2 bg-gray-800 rounded text-white"
              >
                <option value="vegan">Vegan</option>
                <option value="veg">Vegetarian</option>
                <option value="eggitarian">Eggitarian</option>
                <option value="nonveg">Non-Veg</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Goal</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full p-2 bg-gray-800 rounded text-white"
              >
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Weight (kg)</label>
              <input
                type="number"
                min="30"
                max="300"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseFloat(e.target.value) || 70 })
                }
                className="w-full p-2 bg-gray-800 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Height (cm)</label>
              <input
                type="number"
                min="100"
                max="250"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: parseFloat(e.target.value) || 170 })
                }
                className="w-full p-2 bg-gray-800 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Age</label>
              <input
                type="number"
                min="10"
                max="100"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: parseInt(e.target.value, 10) || 25 })
                }
                className="w-full p-2 bg-gray-800 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full p-2 bg-gray-800 rounded text-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-1">Activity Level</label>
              <select
                value={formData.activity_level}
                onChange={(e) =>
                  setFormData({ ...formData, activity_level: e.target.value })
                }
                className="w-full p-2 bg-gray-800 rounded text-white"
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-90 disabled:opacity-50 rounded-lg font-bold"
          >
            {loading ? 'Generating plan…' : 'Generate Diet Plan'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 text-white max-h-screen overflow-y-auto">
        {loading && (
          <div className="text-center mt-20">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Building your meal plan…</p>
            <p className="text-gray-500 text-sm mt-2">This may take 10–30 seconds</p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-8 p-4 bg-red-900/50 border border-red-600 rounded-xl">
            <p className="font-bold text-red-200 mb-2">Could not generate plan</p>
            <p className="text-sm text-red-100">{error}</p>
            <p className="text-xs text-gray-400 mt-3">
              Fix: add <code>GROQ_API_KEY=gsk_...</code> to backend/.env and restart python app.py
            </p>
          </div>
        )}

        {plan && !loading && (
          <div>
            {plan.notice && (
              <div className="mb-4 p-3 bg-amber-900/60 border border-amber-600 rounded-lg text-sm text-amber-100">
                {plan.notice}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
              <div className="bg-gray-800 p-2 rounded">BMR: {plan.bmr}</div>
              <div className="bg-gray-800 p-2 rounded">TDEE: {plan.tdee}</div>
              <div className="bg-gray-800 p-2 rounded">Target: {plan.target_calories} kcal</div>
            </div>

            <h3 className="text-xl font-bold mb-4">Daily Macros</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-red-600 p-3 rounded-lg">
                <p className="text-xs">Calories</p>
                <p className="text-xl font-bold">{plan.totals?.calories} kcal</p>
              </div>
              <div className="bg-blue-600 p-3 rounded-lg">
                <p className="text-xs">Protein</p>
                <p className="text-xl font-bold">{plan.totals?.protein}g</p>
              </div>
              <div className="bg-yellow-600 p-3 rounded-lg">
                <p className="text-xs">Carbs</p>
                <p className="text-xl font-bold">{plan.totals?.carbs}g</p>
              </div>
              <div className="bg-purple-600 p-3 rounded-lg">
                <p className="text-xs">Fat</p>
                <p className="text-xl font-bold">{plan.totals?.fat}g</p>
              </div>
              <div className="bg-green-600 p-3 rounded-lg col-span-2">
                <p className="text-xs">Fiber</p>
                <p className="text-xl font-bold">{plan.totals?.fiber}g</p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-3">Meals</h3>
            {plan.meals &&
              Object.entries(plan.meals).map(([mealType, meal]) => (
                <div key={mealType} className="bg-gray-800 p-4 rounded-lg mb-3">
                  <h4 className="font-bold capitalize text-lg text-cyan-400">{mealType}</h4>
                  <p className="font-semibold">{meal.name}</p>
                  <ul className="text-sm text-gray-300 mt-2">
                    {meal.items?.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <span className="bg-red-700 px-2 py-1 rounded">{meal.calories} kcal</span>
                    <span className="bg-blue-700 px-2 py-1 rounded">P: {meal.protein}g</span>
                    <span className="bg-yellow-700 px-2 py-1 rounded">C: {meal.carbs}g</span>
                    <span className="bg-purple-700 px-2 py-1 rounded">F: {meal.fat}g</span>
                  </div>
                </div>
              ))}

            {plan.tips && (
              <div className="bg-blue-900 p-4 rounded-lg mt-4">
                <h4 className="font-bold mb-2">Tips</h4>
                {plan.tips.map((tip, i) => (
                  <p key={i} className="text-sm">
                    • {tip}
                  </p>
                ))}
              </div>
            )}

            {plan.water_intake && (
              <p className="mt-4 text-cyan-300 text-sm">Water: {plan.water_intake}</p>
            )}
          </div>
        )}

        {!plan && !loading && !error && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-5xl mb-4">🍽️</p>
            <p>Fill in the form and generate your diet plan</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DietPlanner;
