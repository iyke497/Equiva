from flask import Flask, g
from config import DevelopmentConfig, ProductionConfig
from .extensions import db, migrate
from .models import Subscriber, ContactMessage, Volunteer, JobOpening, SiteContent, TeamMember
import os

def build_css_overrides(content):
    rules = []
    for key, value in content.items():
        if key.startswith('spacing.'):
            var_name = '--' + key[8:].replace('_', '-')
            rules.append('  %s: %s;' % (var_name, value))
        elif key.startswith('radius.'):
            var_name = '--' + key[7:].replace('_', '-')
            rules.append('  %s: %s;' % (var_name, value))
        elif key.startswith('shadows.'):
            var_name = '--' + key[8:].replace('_', '-')
            rules.append('  %s: %s;' % (var_name, value))
    if rules:
        return ':root {\n' + '\n'.join(rules) + '\n}'
    return ''

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
        g.css_overrides = build_css_overrides(g.content)

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
        'index.hero.subtitle': 'Equiva weaves together community insights, strategic partnerships, and evidence\u2011based programs to create lasting social change.',
        'index.cta.badge': 'Limited Availability',
        'index.cta.title': 'Ready to drive meaningful change?',
        'index.cta.desc': 'Join our community of change\u2011makers and get early access to our programs. We\'ll reach out within 48 hours to discuss how we can collaborate.',
        'index.cta.button': 'Reserve your spot',

        'about.hero.badge': 'Who We Are',
        'about.hero.title': 'Equity. Value. <span class="hero-accent">Impact.</span>',
        'about.hero.subtitle': 'Equity for Health and Education Initiative is a charitable, non\u2011governmental organisation dedicated to advancing equity in every sphere of life, ensuring that every person, especially women and vulnerable communities, has fair access to quality healthcare, education, and socioeconomic opportunities.',
        'about.cta.badge': 'Let\'s Work Together',
        'about.cta.title': 'Partner with us to create lasting change',
        'about.cta.desc': 'Whether you\'re a policy\u2011maker, donor, community leader, or advocate, you can be part of a movement that expands equity in life for millions.',
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
        'partner.cta.desc': 'Your partnership can unlock life\u2011changing impacts. Together, we can build a future where equity in life is not an aspiration but a reality, where systems protect the vulnerable, empower women, and ensure every community can thrive.',
        'partner.cta.button': 'Start the conversation',
    }

    image_defaults = {
        'images.logo_light': '/static/images/equiva-light.svg',
        'images.logo_dark': '/static/images/equiva-dark.svg',
        'images.favicon_light': '/static/images/favicon-light.ico',
        'images.favicon_dark': '/static/images/favicon-dark.ico',
        'images.hero_home': '/static/images/landing/img-3-baby.jpg',
        'images.hero_about': '/static/images/about/img-3.jpg',
        'images.hero_what_we_do': '/static/images/workwedo/img-1-market-women.jpg',
        'images.hero_partner': '/static/images/partners/img-1-hands.jpg',
        'images.hero_join': '/static/images/join/img-1-happy-kids.jpg',
        'images.about_mission_1': '/static/images/about/mission-card-1.jpg',
        'images.about_mission_2': '/static/images/about/mission-card-2.webp',
        'images.about_vision_1': '/static/images/about/vision-card-1.jpg',
        'images.about_vision_2': '/static/images/about/vision-card-2.jpg',
        'images.about_values': '/static/images/about/img-2-our-values.png',
        'images.home_visual': '/static/images/landing/img-4-impact.jpg',
        'images.about_visual': '/static/images/about/img-4-white-paper.jpg',
        'images.what_we_do_visual': '/static/images/workwedo/img-2-delivery.jpg',
        'images.partner_visual': '/static/images/partners/img-2-achieve.jpg',
    }

    color_defaults = {
        'colors.green_core': '#5cb810',
        'colors.green_light': '#45cb0b',
        'colors.green_muted': '#7fd14e',
        'colors.green_mid_dark': '#399639',
        'colors.green_deep': '#2d7a2d',
        'colors.green_darkest': '#1e521e',
        'colors.accent_royal': '#3e55b3',
        'colors.accent_sky': '#1ea2c6',
        'colors.accent_pink': '#ec367d',
        'colors.white': '#ffffff',
        'colors.gold_primary': '#fcb212',
        'colors.gold_amber': '#fa741e',
        'colors.gold_dark': '#d95e0e',
        'colors.gold_warm_bg': '#fef5e9',
        'colors.text_primary': '#252117',
        'colors.text_navy': '#3e55b3',
        'colors.text_dark': '#1A1A1A',
        'colors.text_charcoal': '#212B36',
        'colors.grey_body': '#5E5E5E',
        'colors.grey_muted': '#9CA3AF',
        'colors.grey_disabled': '#C8C8C8',
        'colors.border_standard': '#F4F4F4',
        'colors.border_light': '#EDEEEF',
        'colors.bg_white': '#FFFDF9',
        'colors.bg_offwhite': '#F8F5EF',
        'colors.bg_light': '#F3F0E9',
        'colors.bg_card': '#F6F7F7',
        'colors.status_error': '#E22034',
        'colors.status_success': '#07BC0C',
        'colors.green_tint_100': '#f4fbf0',
        'colors.green_tint_200': '#eaf6df',
        'colors.green_tint_300': '#ddf0cc',
    }

    spacing_defaults = {
        'spacing.space_2': '2px',
        'spacing.space_4': '4px',
        'spacing.space_8': '8px',
        'spacing.space_10': '10px',
        'spacing.space_12': '12px',
        'spacing.space_16': '16px',
        'spacing.space_20': '20px',
        'spacing.space_24': '24px',
        'spacing.space_32': '32px',
        'spacing.space_48': '48px',
        'spacing.space_64': '64px',
        'spacing.space_96': '96px',
    }

    radius_defaults = {
        'radius.radius_sm': '6px',
        'radius.radius_md': '8px',
        'radius.radius_lg': '12px',
        'radius.radius_xl': '16px',
        'radius.radius_2xl': '24px',
    }

    shadow_defaults = {
        'shadows.shadow_sm': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'shadows.shadow_md': '0 8px 25px rgba(0, 0, 0, 0.08)',
        'shadows.shadow_lg': '0 12px 40px rgba(0, 0, 0, 0.12)',
    }

    for key, val in {**global_defaults, **hero_cta_defaults, **image_defaults, **color_defaults, **spacing_defaults, **radius_defaults, **shadow_defaults}.items():
        if not SiteContent.query.filter_by(content_key=key).first():
            db.session.add(SiteContent(content_key=key, value=val))

    if not seeded:
        team = [
            TeamMember(name='Oluwafeyikemi Adeniyi', title='Managing Director, Equiva Africa',
                       description='Leads strategic direction and programme operations across the continent.',
                       photo_path='https://i.ibb.co/4ZQDs43C/Feyikemi-potrait.jpg', sort_order=1),
            TeamMember(name='Roli Akpolo', title='Managing Director, Equiva Africa',
                       description='Oversees partnerships, resource mobilisation, and advocacy strategy.',
                       photo_path='https://i.ibb.co/twFjzY2v/Roli-potrait.jpg', sort_order=2),
        ]
        db.session.add_all(team)

    db.session.commit()
