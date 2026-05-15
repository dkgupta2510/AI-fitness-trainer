from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import base64
import os
import json
from dotenv import load_dotenv

from models.database import db, User, Workout, DietPlan
from exercises.squat_analyzer import SquatAnalyzer
from exercises.bicep_curl_analyzer import BicepCurlAnalyzer
from exercises.lateral_raise_analyzer import LateralRaiseAnalyzer
from ai.diet_planner import DietPlanner
from ai.form_advisor import FormAdvisor
from utils.video_processor import VideoProcessor

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///fitness.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fitness-secret-key')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

db.init_app(app)

analyzers = {
    'squat': SquatAnalyzer(),
    'bicep_curl': BicepCurlAnalyzer(),
    'lateral_raise': LateralRaiseAnalyzer()
}

diet_planner = DietPlanner()
form_advisor = FormAdvisor()
video_processor = VideoProcessor()

with app.app_context():
    db.create_all()


@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.json
        user = User(
            username=data['username'],
            email=data['email'],
            age=data.get('age'),
            weight=data.get('weight'),
            height=data.get('height'),
            goal=data.get('goal'),
            diet_preference=data.get('diet_preference')
        )
        db.session.add(user)
        db.session.commit()
        return jsonify(user.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


def _reset_analyzer(exercise_type):
    if exercise_type not in analyzers:
        return None
    analyzers[exercise_type].reset()
    return {
        'reps': 0,
        'form': 'Ready',
        'feedback': 'Get ready!',
        'knee_angle': 0,
        'arm_angle': 0,
        'shoulder_angle': 0,
    }


@app.route('/api/exercise/reset', methods=['POST'])
def reset_exercise():
    data = request.get_json(silent=True) or {}
    exercise_type = data.get('exercise_type', 'squat')
    stats = _reset_analyzer(exercise_type)
    if stats is None:
        return jsonify({'error': 'Invalid exercise'}), 400
    return jsonify({'message': 'Counter reset', 'stats': stats}), 200


@app.route('/api/exercise/analyze-frame', methods=['POST'])
def analyze_frame():
    try:
        data = request.json
        exercise_type = data.get('exercise_type', 'squat')
        image_data = data.get('image')

        img_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        analyzer = analyzers.get(exercise_type)
        if not analyzer:
            return jsonify({'error': 'Invalid exercise'}), 400

        processed_frame, stats = analyzer.analyze(frame)

        _, buffer = cv2.imencode('.jpg', processed_frame)
        encoded_frame = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'image': f'data:image/jpeg;base64,{encoded_frame}',
            'stats': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'message': 'Connected to fitness server'})


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('reset_exercise')
def handle_reset_exercise(data):
    data = data or {}
    exercise_type = data.get('exercise_type', 'squat')
    stats = _reset_analyzer(exercise_type)
    if stats is None:
        emit('error', {'message': 'Invalid exercise'})
        return
    emit('exercise_reset', {'stats': stats, 'exercise_type': exercise_type})


@socketio.on('frame')
def handle_frame(data):
    try:
        data = data or {}
        exercise_type = data.get('exercise_type', 'squat')
        image_data = data.get('image')

        if not image_data or ',' not in image_data:
            emit('error', {'message': 'Invalid frame data'})
            return

        img_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            emit('error', {'message': 'Could not decode camera frame'})
            return

        frame = cv2.flip(frame, 1)

        analyzer = analyzers.get(exercise_type)
        if not analyzer:
            emit('error', {'message': 'Invalid exercise'})
            return

        processed_frame, stats = analyzer.analyze(frame)

        _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        encoded_frame = base64.b64encode(buffer).decode('utf-8')

        emit('processed_frame', {
            'image': f'data:image/jpeg;base64,{encoded_frame}',
            'stats': stats
        })
    except Exception as e:
        emit('error', {'message': str(e)})


@app.route('/api/video/upload', methods=['POST'])
def upload_video():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file'}), 400

        video = request.files['video']
        exercise_type = request.form.get('exercise_type', 'squat')

        if video.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        filename = secure_filename(video.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        video.save(filepath)

        analysis = video_processor.process_video(filepath, exercise_type)

        if 'error' in analysis:
            return jsonify(analysis), 500

        ai_feedback = form_advisor.analyze_video_form(exercise_type, analysis)

        os.remove(filepath)

        return jsonify({
            'analysis': analysis,
            'ai_feedback': ai_feedback
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/diet/generate', methods=['POST'])
def generate_diet():
    try:
        data = request.json
        plan = diet_planner.generate_diet_plan(data)

        if 'error' in plan:
            return jsonify(plan), 500

        user_id = data.get('user_id')
        if user_id:
            diet_plan = DietPlan(
                user_id=user_id,
                diet_type=data.get('diet_type'),
                plan_data=json.dumps(plan),
                total_calories=plan.get('totals', {}).get('calories', 0),
                total_protein=plan.get('totals', {}).get('protein', 0),
                total_carbs=plan.get('totals', {}).get('carbs', 0),
                total_fat=plan.get('totals', {}).get('fat', 0),
                total_fiber=plan.get('totals', {}).get('fiber', 0)
            )
            db.session.add(diet_plan)
            db.session.commit()

        return jsonify(plan)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/workouts', methods=['POST'])
def save_workout():
    try:
        data = request.json
        workout = Workout(
            user_id=data['user_id'],
            exercise_type=data['exercise_type'],
            reps=data.get('reps', 0),
            correct_reps=data.get('correct_reps', 0),
            form_score=data.get('form_score'),
            duration=data.get('duration'),
            feedback=data.get('feedback')
        )
        db.session.add(workout)
        db.session.commit()
        return jsonify(workout.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/workouts/<int:user_id>', methods=['GET'])
def get_workouts(user_id):
    workouts = Workout.query.filter_by(user_id=user_id)\
        .order_by(Workout.created_at.desc()).limit(20).all()
    return jsonify([w.to_dict() for w in workouts])


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, host='0.0.0.0', allow_unsafe_werkzeug=True)
