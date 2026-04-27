from flask import Flask
from config import DevelopmentConfig, ProductionConfig
from .extensions import db
from .models import Subscriber, ContactMessage, Volunteer
import os

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    if os.environ.get('FLASK_ENV') == 'production':
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    db.init_app(app)

    with app.app_context():
        from .routes.main import main_bp
        from .routes.forms import forms_bp
        app.register_blueprint(main_bp)
        app.register_blueprint(forms_bp)
        db.create_all()

    return app
