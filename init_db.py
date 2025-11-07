from app import app, db
from models import User

with app.app_context():
    # Создаем все таблицы
    db.create_all()
    print("База данных успешно создана!")