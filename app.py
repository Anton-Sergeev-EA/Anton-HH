from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, \
    current_user
from models import db, User, Application
from config import Config
import logging
import os

app = Flask(__name__)
app.config.from_object(Config)

# Инициализация расширений
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите для доступа к этой странице.'

# Настройка логирования
logging.basicConfig(level=logging.INFO)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def init_db():
    """Инициализация базы данных"""
    with app.app_context():
        db.create_all()
        logging.info("База данных инициализирована")


@app.route('/')
def index():
    if current_user.is_authenticated:
        return render_template('index.html', username=current_user.username)
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        action = data.get('action', 'login')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Заполните все поля'})
        
        if action == 'register':
            # Регистрация
            if User.query.filter_by(username=username).first():
                return jsonify({'success': False,
                                'message': 'Пользователь уже существует'})
            
            new_user = User(username=username, email=f"{username}@example.com")
            new_user.set_password(password)
            
            try:
                db.session.add(new_user)
                db.session.commit()
                login_user(new_user)
                return jsonify(
                    {'success': True, 'message': 'Регистрация успешна!'})
            except Exception as e:
                db.session.rollback()
                logging.error(f"Ошибка при регистрации: {str(e)}")
                return jsonify(
                    {'success': False, 'message': 'Ошибка при регистрации'})
        
        else:
            # Вход
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                login_user(user)
                return jsonify({'success': True, 'message': 'Вход выполнен!'})
            else:
                return jsonify({'success': False,
                                'message': 'Неверное имя пользователя или пароль'})
    
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.route('/api/applications', methods=['GET'])
@login_required
def get_applications_api():
    try:
        applications = Application.query.filter_by(
            user_id=current_user.id).order_by(Application.date.desc()).all()
        return jsonify([app.to_dict() for app in applications])
    except Exception as e:
        logging.error(f"Ошибка при получении откликов: {str(e)}")
        return jsonify([])


@app.route('/api/applications', methods=['POST'])
@login_required
def add_application():
    data = request.get_json()
    company_name = data.get('company', '').strip()
    position = data.get('position', '').strip()
    
    if not company_name or not position:
        return jsonify({'success': False, 'message': 'Заполните все поля'})
    
    try:
        # Проверка на дубликат для текущего пользователя
        existing_application = Application.query.filter_by(
            user_id=current_user.id,
            company_name=company_name
        ).first()
        
        if existing_application:
            return jsonify({
                'success': False,
                'message': 'Вы уже отправляли отклик в эту компанию!'
            })
        
        # Создание нового отклика
        new_application = Application(
            company_name=company_name,
            position=position,
            user_id=current_user.id
        )
        
        db.session.add(new_application)
        db.session.commit()
        return jsonify(
            {'success': True, 'message': 'Отклик успешно добавлен!'})
    
    except Exception as e:
        logging.error(f"Ошибка при сохранении: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Ошибка при сохранении'})


@app.route('/api/applications/<int:app_id>', methods=['DELETE'])
@login_required
def delete_application(app_id):
    try:
        application = Application.query.filter_by(id=app_id,
                                                  user_id=current_user.id).first()
        
        if not application:
            return jsonify({'success': False, 'message': 'Отклик не найден'})
        
        db.session.delete(application)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Отклик удален'})
    
    except Exception as e:
        logging.error(f"Ошибка при удалении: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Ошибка при удалении'})


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
    