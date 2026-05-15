import json
from .llm_client import chat_json, get_api_key


class DietPlanner:
    def _calc_targets(self, user_data):
        diet_type = user_data.get('diet_type', 'veg')
        goal = user_data.get('goal', 'maintenance')
        weight = float(user_data.get('weight', 70))
        height = float(user_data.get('height', 170))
        age = int(user_data.get('age', 25))
        gender = user_data.get('gender', 'male')
        activity_level = user_data.get('activity_level', 'moderate')

        if gender == 'male':
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
        else:
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161

        multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9,
        }
        tdee = bmr * multipliers.get(activity_level, 1.55)

        if goal == 'weight_loss':
            target_calories = tdee - 500
        elif goal == 'muscle_gain':
            target_calories = tdee + 300
        else:
            target_calories = tdee

        return diet_type, goal, int(target_calories), int(bmr), int(tdee)

    def _local_plan(self, user_data, target_calories, bmr, tdee):
        diet_type = user_data.get('diet_type', 'veg')
        goal = user_data.get('goal', 'maintenance')

        templates = {
            'vegan': {
                'breakfast': ('Oatmeal with berries & almonds', ['Rolled oats', 'Banana', 'Almonds', 'Soy milk']),
                'lunch': ('Chickpea Buddha bowl', ['Chickpeas', 'Brown rice', 'Mixed veggies', 'Tahini']),
                'snack': ('Apple with peanut butter', ['Apple', 'Natural peanut butter']),
                'dinner': ('Lentil curry with quinoa', ['Red lentils', 'Quinoa', 'Spinach', 'Coconut milk']),
            },
            'veg': {
                'breakfast': ('Greek yogurt parfait', ['Greek yogurt', 'Granola', 'Honey', 'Berries']),
                'lunch': ('Paneer wrap', ['Whole wheat roti', 'Paneer', 'Salad', 'Mint chutney']),
                'snack': ('Mixed nuts & fruit', ['Walnuts', 'Orange']),
                'dinner': ('Dal khichdi with vegetables', ['Moong dal', 'Rice', 'Seasonal vegetables']),
            },
            'eggitarian': {
                'breakfast': ('Scrambled eggs & toast', ['Eggs', 'Whole grain bread', 'Tomato']),
                'lunch': ('Egg fried rice', ['Eggs', 'Brown rice', 'Peas', 'Carrots']),
                'snack': ('Cheese cubes & crackers', ['Cheese', 'Whole grain crackers']),
                'dinner': ('Vegetable omelette with salad', ['Eggs', 'Bell peppers', 'Green salad']),
            },
            'nonveg': {
                'breakfast': ('Egg omelette & toast', ['Eggs', 'Whole grain bread']),
                'lunch': ('Grilled chicken salad', ['Chicken breast', 'Mixed greens', 'Olive oil']),
                'snack': ('Protein shake', ['Whey or milk', 'Banana']),
                'dinner': ('Fish with roasted vegetables', ['Fish fillet', 'Broccoli', 'Sweet potato']),
            },
        }

        meals_data = templates.get(diet_type, templates['veg'])
        split = [0.25, 0.35, 0.10, 0.30]
        meal_keys = ['breakfast', 'lunch', 'snack', 'dinner']
        meals = {}
        totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0}

        for key, ratio in zip(meal_keys, split):
            name, items = meals_data[key]
            cals = int(target_calories * ratio)
            protein = int(cals * 0.25 / 4)
            carbs = int(cals * 0.45 / 4)
            fat = int(cals * 0.30 / 9)
            fiber = int(5 + ratio * 10)
            meals[key] = {
                'name': name,
                'items': items,
                'calories': cals,
                'protein': protein,
                'carbs': carbs,
                'fat': fat,
                'fiber': fiber,
            }
            totals['calories'] += cals
            totals['protein'] += protein
            totals['carbs'] += carbs
            totals['fat'] += fat
            totals['fiber'] += fiber

        tips = [
            f'Goal: {goal.replace("_", " ")} — target ~{target_calories} kcal/day',
            'Drink 2–3 liters of water daily',
            'Add GROQ_API_KEY in backend/.env for fully personalized AI meal plans',
        ]

        return {
            'meals': meals,
            'totals': totals,
            'tips': tips,
            'water_intake': '2.5 liters',
            'target_calories': target_calories,
            'bmr': bmr,
            'tdee': tdee,
            'source': 'local',
            'notice': 'Offline plan (set GROQ_API_KEY for AI-generated meals)',
        }

    def generate_diet_plan(self, user_data):
        user_data = user_data or {}
        diet_type, goal, target_calories, bmr, tdee = self._calc_targets(user_data)

        if not get_api_key():
            plan = self._local_plan(user_data, target_calories, bmr, tdee)
            return plan

        prompt = f"""Create a one-day diet plan as JSON for:
- Diet: {diet_type} (vegan/veg/nonveg/eggitarian — strict rules apply)
- Goal: {goal}
- Target calories: {target_calories} kcal
- BMR: {bmr}, TDEE: {tdee}

Return JSON with this exact structure:
{{
  "meals": {{
    "breakfast": {{"name": "...", "items": ["..."], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0}},
    "lunch": {{...}},
    "snack": {{...}},
    "dinner": {{...}}
  }},
  "totals": {{"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0}},
  "tips": ["tip1", "tip2", "tip3"],
  "water_intake": "2.5 liters"
}}

Totals must be close to {target_calories} kcal. Respect {diet_type} diet rules strictly."""

        try:
            diet_plan = chat_json(prompt, max_tokens=2500)
            diet_plan['target_calories'] = target_calories
            diet_plan['bmr'] = bmr
            diet_plan['tdee'] = tdee
            diet_plan['source'] = 'groq'
            return diet_plan
        except Exception as e:
            plan = self._local_plan(user_data, target_calories, bmr, tdee)
            plan['notice'] = f'AI unavailable ({e}). Showing calculated offline plan.'
            return plan
