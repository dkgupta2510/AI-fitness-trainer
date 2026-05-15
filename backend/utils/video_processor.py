import cv2
from exercises.squat_analyzer import SquatAnalyzer
from exercises.bicep_curl_analyzer import BicepCurlAnalyzer
from exercises.lateral_raise_analyzer import LateralRaiseAnalyzer


class VideoProcessor:
    def __init__(self):
        self.analyzers = {
            'squat': SquatAnalyzer,
            'bicep_curl': BicepCurlAnalyzer,
            'lateral_raise': LateralRaiseAnalyzer
        }

    def process_video(self, video_path, exercise_type):
        if exercise_type not in self.analyzers:
            return {'error': 'Invalid exercise type'}

        analyzer = self.analyzers[exercise_type]()

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            return {'error': 'Could not open video'}

        total_frames = 0
        good_form_frames = 0
        angles = []
        issues = set()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            _, stats = analyzer.analyze(frame)
            total_frames += 1

            if stats['form'] == 'Perfect':
                good_form_frames += 1
            elif stats['form'] == 'Needs Practice':
                issues.add(stats['feedback'])

            angle_key = next((k for k in stats.keys() if 'angle' in k), None)
            if angle_key and stats[angle_key] > 0:
                angles.append(stats[angle_key])

        cap.release()

        avg_angle = sum(angles) / len(angles) if angles else 0
        correct_reps = int(analyzer.counter * (good_form_frames / max(total_frames, 1)))

        return {
            'total_reps': analyzer.counter,
            'correct_reps': correct_reps,
            'avg_angle': round(avg_angle, 1),
            'issues': list(issues),
            'form_score': round((good_form_frames / max(total_frames, 1)) * 10, 1)
        }
