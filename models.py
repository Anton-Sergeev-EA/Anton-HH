from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200),
                              nullable=False)  # Увеличил длину для хэшей
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    applications = db.relationship('Application', backref='author', lazy=True,
                                   cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    company_name = db.Column(db.String(200), nullable=False)
    position = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(50), default="Не просмотрен работодателем")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime("%Y-%m-%d %H:%M:%S"),
            'company': self.company_name,
            'position': self.position,
            'status': self.status
        }
    
    def __repr__(self):
        return f'<Application {self.company_name} - {self.position}>'
    