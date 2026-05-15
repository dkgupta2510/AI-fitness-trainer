from anthropic import Anthropic
import os


class FormAdvisor:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if not api_key or api_key == 'your_anthropic_api_key_here':
                raise ValueError('Set ANTHROPIC_API_KEY in backend/.env')
            self._client = Anthropic(api_key=api_key)
        return self._client

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
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            return f"Error generating feedback: {str(e)}"
