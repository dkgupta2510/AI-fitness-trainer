import json
from .llm_client import chat


class DietPlanner:
    def generate_diet_plan(self, user_data):
        diet_type = user_data.get('diet_type', 'veg')
        goal = user_data.get('goal', 'maintenance')
        weight = user_data.get('weight', 70)
        height = user_data.get('height', 170)
        age = user_data.get('age', 25)
        gender = user_data.get('gender', 'male')
        activity_level = user_data.get('activity_level', 'moderate')

        if gender == 'male':
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
        else:
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161

        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        }

        tdee = bmr * activity_multipliers.get(activity_level, 1.55)

        if goal == 'weight_loss':
            target_calories = tdee - 500
        elif goal == 'muscle_gain':
            target_calories = tdee + 300
        else:
            target_calories = tdee

        prompt = f"""Generate a detailed daily diet plan for a {gender}, age {age},
weight {weight}kg, height {height}cm with the following requirements:

- Diet Type: {diet_type} (vegan/veg/nonveg/eggitarian)
- Goal: {goal}
- Target Calories: {int(target_calories)} kcal
- Activity Level: {activity_level}

Provide ONLY valid JSON output (no markdown, no explanations) in this exact format:
{{
  "meals": {{
    "breakfast": {{
      "name": "meal name",
      "items": ["item1", "item2"],
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "fiber": 0
    }},
    "lunch": {{ same structure }},
    "snack": {{ same structure }},
    "dinner": {{ same structure }}
  }},
  "totals": {{
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  }},
  "tips": ["tip1", "tip2", "tip3"],
  "water_intake": "X liters"
}}

For {diet_type} diet, ensure all foods strictly follow:
- Vegan: No animal products at all
- Veg: No meat, fish, or eggs (dairy ok)
- Eggitarian: No meat or fish (eggs and dairy ok)
- Nonveg: All foods allowed"""

        try:
            response_text = chat(prompt, max_tokens=2000).strip()

            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            diet_plan = json.loads(response_text)
            diet_plan['target_calories'] = int(target_calories)
            diet_plan['bmr'] = int(bmr)
            diet_plan['tdee'] = int(tdee)

            return diet_plan
        except Exception as e:
            return {'error': str(e)}
