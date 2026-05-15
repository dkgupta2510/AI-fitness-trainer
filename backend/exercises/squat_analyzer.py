import cv2
import mediapipe as mp
from .pose_detector import PoseDetector


class SquatAnalyzer:
    def __init__(self):
        self.detector = PoseDetector()
        self.mp_pose = mp.solutions.pose
        self.counter = 0
        self.stage = None
        self.feedback = "Get Ready"
        self.form_status = "No Pose Detected"

    def analyze(self, frame):
        results = self.detector.detect_pose(frame)

        if results.pose_landmarks:
            hip = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_HIP, frame.shape
            )
            knee = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_KNEE, frame.shape
            )
            ankle = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_ANKLE, frame.shape
            )
            shoulder = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_SHOULDER, frame.shape
            )

            knee_angle = self.detector.calculate_angle(hip, knee, ankle)
            back_angle = self.detector.calculate_angle(shoulder, hip, knee)

            if knee_angle > 160:
                self.stage = "up"
                self.form_status = "Stand Tall"

            if knee_angle < 90 and self.stage == "up":
                self.stage = "down"
                self.counter += 1

                if back_angle < 45:
                    self.form_status = "Perfect"
                    self.feedback = "Great squat!"
                elif back_angle < 60:
                    self.form_status = "Good"
                    self.feedback = "Keep your back straight"
                else:
                    self.form_status = "Needs Practice"
                    self.feedback = "Lean less forward"

            if self.stage == "down":
                if knee_angle > 100:
                    self.form_status = "Needs Practice"
                    self.feedback = "Go deeper"
                elif knee_angle < 70:
                    self.form_status = "Needs Practice"
                    self.feedback = "Don't go too low"
                else:
                    self.form_status = "Perfect"
                    self.feedback = "Perfect depth!"

            frame = self.detector.draw_landmarks(frame, results)
            self._draw_overlay(frame, knee_angle)

            return frame, {
                'reps': self.counter,
                'form': self.form_status,
                'knee_angle': int(knee_angle),
                'feedback': self.feedback
            }

        return frame, {
            'reps': self.counter,
            'form': 'No Pose Detected',
            'knee_angle': 0,
            'feedback': 'Position yourself in front of camera'
        }

    def _draw_overlay(self, frame, knee_angle):
        cv2.putText(frame, f'REPS: {self.counter}', (15, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        color = (0, 255, 255) if self.form_status == "Perfect" else (0, 0, 255)
        cv2.putText(frame, f'FORM: {self.form_status}', (15, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        cv2.putText(frame, f'Knee Angle: {int(knee_angle)}', (15, 150),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 2)

    def reset(self):
        self.counter = 0
        self.stage = None
        self.feedback = "Get Ready"
        self.form_status = "Ready"
