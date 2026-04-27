from flask import Flask
from config import DevelopmentConfig, ProductionConfig
from .extensions import db
from .models import Subscriber, ContactMessage, Volunteer, JobOpening
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
        from .routes.admin import admin_bp
        app.register_blueprint(main_bp)
        app.register_blueprint(forms_bp)
        app.register_blueprint(admin_bp)
        db.create_all()
        # Seed admin defaults if needed
        from .models import JobOpening
        if JobOpening.query.count() == 0:
            pass

    return app
