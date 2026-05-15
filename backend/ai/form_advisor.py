from .llm_client import chat


class FormAdvisor:
    def analyze_video_form(self, exercise_type, stats):
        total_reps = stats.get('total_reps', 0)
        correct_reps = stats.get('correct_reps', 0)
        avg_angle = stats.get('avg_angle', 0)
        issues = stats.get('issues', [])

        prompt = f"""You are an expert fitness trainer analyzing a {exercise_type} video.

Video Analysis Data:
- Total Reps Detected: {total_reps}
- Reps with Good Form: {correct_reps}
- Average Joint Angle: {avg_angle}°
- Detected Issues: {', '.join(issues) if issues else 'None'}

Provide professional feedback in this format:

**Form Score:** [X/10]

**What You Did Well:**
- Point 1
- Point 2

**Areas to Improve:**
- Point 1 with specific tip
- Point 2 with specific tip

**Action Steps:**
1. Specific drill or exercise
2. Specific drill or exercise
3. Specific drill or exercise

Keep it encouraging, specific, and actionable. Maximum 250 words."""

        try:
            return chat(prompt, max_tokens=500)
        except Exception as e:
            return f"Error generating feedback: {str(e)}"
