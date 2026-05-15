import cv2
import mediapipe as mp
from .pose_detector import PoseDetector


class BicepCurlAnalyzer:
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
            shoulder = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_SHOULDER, frame.shape
            )
            elbow = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_ELBOW, frame.shape
            )
            wrist = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_WRIST, frame.shape
            )
            hip = self.detector.get_landmark_coords(
                results, self.mp_pose.PoseLandmark.LEFT_HIP, frame.shape
            )

            arm_angle = self.detector.calculate_angle(shoulder, elbow, wrist)
            elbow_body_angle = self.detector.calculate_angle(hip, shoulder, elbow)

            if arm_angle > 160:
                self.stage = "down"
                self.form_status = "Ready"

            if arm_angle < 30 and self.stage == "down":
                self.stage = "up"
                self.counter += 1

                if elbow_body_angle < 25:
                    self.form_status = "Perfect"
                    self.feedback = "Great curl!"
                else:
                    self.form_status = "Needs Practice"
                    self.feedback = "Keep elbows close to body"

            if elbow_body_angle > 30:
                self.form_status = "Needs Practice"
                self.feedback = "Don't swing! Keep elbow stable"

            frame = self.detector.draw_landmarks(frame, results)
            self._draw_overlay(frame, arm_angle)

            return frame, {
                'reps': self.counter,
                'form': self.form_status,
                'arm_angle': int(arm_angle),
                'feedback': self.feedback
            }

        return frame, {
            'reps': self.counter,
            'form': 'No Pose Detected',
            'arm_angle': 0,
            'feedback': 'Position yourself in front of camera'
        }

    def _draw_overlay(self, frame, arm_angle):
        cv2.putText(frame, f'REPS: {self.counter}', (15, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        color = (0, 255, 255) if self.form_status == "Perfect" else (0, 0, 255)
        cv2.putText(frame, f'FORM: {self.form_status}', (15, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        cv2.putText(frame, f'Arm Angle: {int(arm_angle)}', (15, 150),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 2)

    def reset(self):
        self.counter = 0
        self.stage = None
        self.feedback = "Get Ready"
        self.form_status = "Ready"
