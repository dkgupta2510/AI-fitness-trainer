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
    activity_level: 'moderate'
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.generateDiet(formData);
      setPlan(response.data);
    } catch (error) {
      alert('Failed to generate plan');
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-900 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">🍽️ AI Diet Planner</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Diet Type</label>
              <select
                value={formData.diet_type}
                onChange={(e) => setFormData({...formData, diet_type: e.target.value})}
                className="w-full p-2 bg-gray-800 rounded"
              >
                <option value="vegan">🌱 Vegan</option>
                <option value="veg">🥗 Vegetarian</option>
                <option value="eggitarian">🥚 Eggitarian</option>
                <option value="nonveg">🍗 Non-Veg</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Goal</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({...formData, goal: e.target.value})}
                className="w-full p-2 bg-gray-800 rounded"
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
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                className="w-full p-2 bg-gray-800 rounded"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Height (cm)</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                className="w-full p-2 bg-gray-800 rounded"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                className="w-full p-2 bg-gray-800 rounded"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                className="w-full p-2 bg-gray-800 rounded"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-1">Activity Level</label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData({...formData, activity_level: e.target.value})}
                className="w-full p-2 bg-gray-800 rounded"
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
            className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-bold"
          >
            {loading ? '⏳ Generating...' : '🍽️ Generate Diet Plan'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 text-white max-h-screen overflow-y-auto">
        {plan ? (
          <div>
            <h3 className="text-xl font-bold mb-4">📊 Daily Macros</h3>
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

            <h3 className="text-xl font-bold mb-3">🍽️ Meals</h3>
            {plan.meals && Object.entries(plan.meals).map(([mealType, meal]) => (
              <div key={mealType} className="bg-gray-800 p-4 rounded-lg mb-3">
                <h4 className="font-bold capitalize text-lg text-cyan-400">{mealType}</h4>
                <p className="font-semibold">{meal.name}</p>
                <ul className="text-sm text-gray-300 mt-2">
                  {meal.items?.map((item, i) => <li key={i}>• {item}</li>)}
                </ul>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="bg-red-700 px-2 py-1 rounded">{meal.calories} kcal</span>
                  <span className="bg-blue-700 px-2 py-1 rounded">P: {meal.protein}g</span>
                  <span className="bg-yellow-700 px-2 py-1 rounded">C: {meal.carbs}g</span>
                  <span className="bg-purple-700 px-2 py-1 rounded">F: {meal.fat}g</span>
                </div>
              </div>
            ))}

            {plan.tips && (
              <div className="bg-blue-900 p-4 rounded-lg mt-4">
                <h4 className="font-bold mb-2">💡 Tips</h4>
                {plan.tips.map((tip, i) => (
                  <p key={i} className="text-sm">• {tip}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            <div className="text-6xl mb-4">🍽️</div>
            <p>Fill in the form to generate your AI diet plan</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DietPlanner;

