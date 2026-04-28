from flask import Flask, g
from config import DevelopmentConfig, ProductionConfig
from .extensions import db
from .models import Subscriber, ContactMessage, Volunteer, JobOpening, SiteContent, TeamMember, Testimonial
import os

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    if os.environ.get('FLASK_ENV') == 'production':
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    db.init_app(app)

    @app.before_request
    def load_site_content():
        g.content = {c.content_key: c.value for c in SiteContent.query.all()}

    with app.app_context():
        from .routes.main import main_bp
        from .routes.forms import forms_bp
        from .routes.admin import admin_bp
        app.register_blueprint(main_bp)
        app.register_blueprint(forms_bp)
        app.register_blueprint(admin_bp)
        db.create_all()
        _seed_defaults()

    return app

def _seed_defaults():
    if SiteContent.query.count() > 0:
        return

    defaults = {
        'global.footer_tagline': 'Driving social impact through innovative programs.',
        'global.copyright': '© 2026 Equiva. All rights reserved.',
        'contact.email': 'info@equivaafrica.org',
        'contact.phone_1': '+234 703 274 3619',
        'contact.phone_2': '+234 806 166 4368',
        'contact.address': 'Abuja, Nigeria',
    }
    for key, val in defaults.items():
        db.session.add(SiteContent(content_key=key, value=val))

    team = [
        TeamMember(name='Oluwafeyikemi Adeniyi', title='Managing Director, Equiva Africa',
                   description='Leads strategic direction and programme operations across the continent.',
                   photo_path='images/team/feyikemi.jpeg', sort_order=1),
        TeamMember(name='Roli Akpolo', title='Managing Director, Equiva Africa',
                   description='Oversees partnerships, resource mobilisation, and advocacy strategy.',
                   photo_path='images/team/rolli.jpeg', sort_order=2),
    ]
    db.session.add_all(team)

    testimonials = [
        Testimonial(quote_text='Equiva helped us scale our impact. Our programmes are more effective, and we reach more communities than we ever thought possible.',
                    author_name='Dr. Kwame Asante', author_title='Health Director, Accra',
                    page_context='about', sort_order=1),
        Testimonial(quote_text='Equiva doesn\'t just deliver a report and leave. They stay, they train our people, and they make sure the systems actually work.',
                    author_name='Dr. Kwame Asante', author_title='Health Director, Accra',
                    page_context='what-we-do', sort_order=1),
        Testimonial(quote_text='Equiva helped us scale our impact. Our programs are more effective, and we reach more communities.',
                    author_name='Dr. Kwame Asante', author_title='Health Director, Accra',
                    page_context='home', sort_order=1),
        Testimonial(quote_text='Equiva doesn\'t just deliver a report and leave. They stay, they train our people, and they make sure the systems actually work.',
                    author_name='Dr. Kwame Asante', author_title='Health Director, Accra',
                    page_context='partner-with-us', sort_order=1),
    ]
    db.session.add_all(testimonials)
    db.session.commit()
