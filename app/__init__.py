from flask import Flask, g
from config import DevelopmentConfig, ProductionConfig
from .extensions import db, migrate
from .models import Subscriber, ContactMessage, Volunteer, JobOpening, SiteContent, TeamMember
import os

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    if os.environ.get('FLASK_ENV') == 'production':
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    db.init_app(app)
    migrate.init_app(app, db)

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
        if not os.environ.get('SKIP_AUTO_TABLES'):
            db.create_all()
            _seed_defaults()

    return app

def _seed_defaults():
    seeded = SiteContent.query.count() > 0

    global_defaults = {
        'global.footer_tagline': 'Driving social impact through innovative programs.',
        'global.copyright': '© 2026 Equiva. All rights reserved.',
        'contact.email': 'info@equivaafrica.org',
        'contact.phone_1': '+234 703 274 3619',
        'contact.phone_2': '+234 806 166 4368',
        'contact.address': 'Abuja, Nigeria',
    }

    hero_cta_defaults = {
        'index.hero.badge': 'Empowering communities across Nigeria',
        'index.hero.title': 'Drive impact<br>with <span class="hero-accent">clarity</span>',
        'index.hero.subtitle': 'Equiva weaves together community insights, strategic partnerships, and evidence‑based programs to create lasting social change.',
        'index.cta.badge': 'Limited Availability',
        'index.cta.title': 'Ready to drive meaningful change?',
        'index.cta.desc': 'Join our community of change‑makers and get early access to our programs. We\'ll reach out within 48 hours to discuss how we can collaborate.',
        'index.cta.button': 'Reserve your spot',

        'about.hero.badge': 'Who We Are',
        'about.hero.title': 'Equity. Value. <span class="hero-accent">Impact.</span>',
        'about.hero.subtitle': 'Equity for Health and Education Initiative is a charitable, non‑governmental organisation dedicated to advancing equity in every sphere of life, ensuring that every person, especially women and vulnerable communities, has fair access to quality healthcare, education, and socioeconomic opportunities.',
        'about.cta.badge': 'Let\'s Work Together',
        'about.cta.title': 'Partner with us to create lasting change',
        'about.cta.desc': 'Whether you\'re a policy‑maker, donor, community leader, or advocate, you can be part of a movement that expands equity in life for millions.',
        'about.cta.button': 'Partner with us',

        'what-we-do.hero.badge': 'What We Do',
        'what-we-do.hero.title': 'Programs that turn <span class="hero-accent">intention</span> into impact',
        'what-we-do.hero.subtitle': 'From health systems to education, our work spans the sectors that matter most to communities, each program grounded in evidence and delivered with local partners.',
        'what-we-do.cta.badge': 'Let\'s Get Started',
        'what-we-do.cta.title': 'See what Equiva can do for your mission',
        'what-we-do.cta.desc': 'Every program starts with a conversation. Tell us about your goals and we\'ll outline how our expertise can help.',
        'what-we-do.cta.button': 'Start the conversation',

        'contact.hero.badge': 'Get in Touch',
        'contact.hero.title': 'Let\'s start a <span class="hero-accent">conversation</span>',
        'contact.hero.subtitle': 'Whether you\'re exploring a partnership, have a question about our work, or want to join the team, we\'re listening.',

        'join-us.hero.badge': 'Join Us',
        'join-us.hero.title': 'Do work that <span class="hero-accent">matters</span>',
        'join-us.hero.subtitle': 'Whether you\'re a policymaker, donor, community leader, or advocate, you can be part of a movement that expands equity in life for millions.',

        'partner.hero.badge': 'Partner With Us',
        'partner.hero.title': 'Your partnership. Our expertise.<br><span class="hero-accent">Lasting equity</span> for all.',
        'partner.hero.subtitle': 'Equiva = Equity + Value, fairness that sustains life. Every woman, child, and community deserves the chance to live with health, dignity, and opportunity.',
        'partner.cta.badge': 'Let\'s Work Together',
        'partner.cta.title': 'Deliver value for all',
        'partner.cta.desc': 'Your partnership can unlock life‑changing impacts. Together, we can build a future where equity in life is not an aspiration but a reality, where systems protect the vulnerable, empower women, and ensure every community can thrive.',
        'partner.cta.button': 'Start the conversation',

        'home.visual.image': '/static/images/landing/img-4-impact.jpg',
        'about.visual.image': '/static/images/about/img-4-white-paper.jpg',
        'what-we-do.visual.image': '/static/images/workwedo/img-2-delivery.jpg',
        'partner.visual.image': '/static/images/partners/img-2-achieve.jpg',
    }

    for key, val in {**global_defaults, **hero_cta_defaults}.items():
        if not SiteContent.query.filter_by(content_key=key).first():
            db.session.add(SiteContent(content_key=key, value=val))

    if not seeded:
        team = [
            TeamMember(name='Oluwafeyikemi Adeniyi', title='Managing Director, Equiva Africa',
                       description='Leads strategic direction and programme operations across the continent.',
                       photo_path='images/team/feyikemi.jpeg', sort_order=1),
            TeamMember(name='Roli Akpolo', title='Managing Director, Equiva Africa',
                       description='Oversees partnerships, resource mobilisation, and advocacy strategy.',
                       photo_path='images/team/rolli.jpeg', sort_order=2),
        ]
        db.session.add_all(team)

    db.session.commit()
