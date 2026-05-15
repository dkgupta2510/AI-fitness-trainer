from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    age = db.Column(db.Integer)
    weight = db.Column(db.Float)
    height = db.Column(db.Float)
    goal = db.Column(db.String(50))
    diet_preference = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    workouts = db.relationship('Workout', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'age': self.age,
            'weight': self.weight,
            'height': self.height,
            'goal': self.goal,
            'diet_preference': self.diet_preference
        }


class Workout(db.Model):
    __tablename__ = 'workouts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    exercise_type = db.Column(db.String(50), nullable=False)
    reps = db.Column(db.Integer, default=0)
    correct_reps = db.Column(db.Integer, default=0)
    form_score = db.Column(db.Float)
    duration = db.Column(db.Integer)
    feedback = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'exercise_type': self.exercise_type,
            'reps': self.reps,
            'correct_reps': self.correct_reps,
            'form_score': self.form_score,
            'duration': self.duration,
            'feedback': self.feedback,
            'created_at': self.created_at.isoformat()
        }


class DietPlan(db.Model):
    __tablename__ = 'diet_plans'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    diet_type = db.Column(db.String(20))
    plan_data = db.Column(db.Text)
    total_calories = db.Column(db.Float)
    total_protein = db.Column(db.Float)
    total_carbs = db.Column(db.Float)
    total_fat = db.Column(db.Float)
    total_fiber = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'diet_type': self.diet_type,
            'plan_data': self.plan_data,
            'total_calories': self.total_calories,
            'total_protein': self.total_protein,
            'total_carbs': self.total_carbs,
            'total_fat': self.total_fat,
            'total_fiber': self.total_fiber,
            'created_at': self.created_at.isoformat()
        }
