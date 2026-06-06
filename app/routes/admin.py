from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, Response
from functools import wraps
from datetime import datetime
import csv, io, requests, os
from ..extensions import db
from ..models import Subscriber, ContactMessage, Volunteer, JobOpening, SiteContent, TeamMember
import os

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated

# ---- Auth ----

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == os.environ.get('ADMIN_PASSWORD', 'admin123'):
            session['admin_logged_in'] = True
            return redirect(url_for('admin.dashboard'))
        return render_template('admin/login.html', error='Invalid password')
    return render_template('admin/login.html')

@admin_bp.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin.login'))

# ---- Dashboard ----

@admin_bp.route('/')
@login_required
def dashboard():
    stats = {
        'subscribers': Subscriber.query.count(),
        'messages': ContactMessage.query.count(),
        'volunteers': Volunteer.query.count(),
        'openings': JobOpening.query.filter_by(is_active=True).count(),
        'team': TeamMember.query.filter_by(is_active=True).count(),
        'content_items': SiteContent.query.count(),
    }
    recent_messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).limit(5).all()
    recent_volunteers = Volunteer.query.order_by(Volunteer.created_at.desc()).limit(5).all()
    return render_template('admin/dashboard.html', stats=stats, recent_messages=recent_messages, recent_volunteers=recent_volunteers)

# ---- Subscribers ----

@admin_bp.route('/subscribers')
@login_required
def subscribers():
    q = request.args.get('q', '').strip()
    query = Subscriber.query
    if q:
        query = query.filter(
            db.or_(Subscriber.name.ilike(f'%{q}%'), Subscriber.email.ilike(f'%{q}%'))
        )
    items = query.order_by(Subscriber.created_at.desc()).all()
    return render_template('admin/subscribers.html', items=items, q=q)

@admin_bp.route('/subscribers/export')
@login_required
def subscribers_export():
    q = request.args.get('q', '').strip()
    query = Subscriber.query
    if q:
        query = query.filter(
            db.or_(Subscriber.name.ilike(f'%{q}%'), Subscriber.email.ilike(f'%{q}%'))
        )
    items = query.order_by(Subscriber.created_at.desc()).all()
    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(['ID', 'Name', 'Email', 'Date'])
    for item in items:
        w.writerow([item.id, item.name, item.email, item.created_at.strftime('%Y-%m-%d %H:%M') if item.created_at else ''])
    return Response(output.getvalue(), mimetype='text/csv', headers={'Content-Disposition': 'attachment; filename=subscribers.csv'})

# ---- Messages ----

@admin_bp.route('/messages')
@login_required
def messages():
    q = request.args.get('q', '').strip()
    query = ContactMessage.query
    if q:
        query = query.filter(
            db.or_(ContactMessage.name.ilike(f'%{q}%'), ContactMessage.email.ilike(f'%{q}%'), ContactMessage.message.ilike(f'%{q}%'))
        )
    items = query.order_by(ContactMessage.created_at.desc()).all()
    return render_template('admin/messages.html', items=items, q=q)

@admin_bp.route('/messages/<int:id>/delete', methods=['POST'])
@login_required
def message_delete(id):
    msg = db.session.get(ContactMessage, id)
    if msg:
        db.session.delete(msg)
        db.session.commit()
    return redirect(url_for('admin.messages'))

@admin_bp.route('/messages/export')
@login_required
def messages_export():
    q = request.args.get('q', '').strip()
    query = ContactMessage.query
    if q:
        query = query.filter(
            db.or_(ContactMessage.name.ilike(f'%{q}%'), ContactMessage.email.ilike(f'%{q}%'), ContactMessage.message.ilike(f'%{q}%'))
        )
    items = query.order_by(ContactMessage.created_at.desc()).all()
    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(['ID', 'Name', 'Email', 'Topic', 'Message', 'Date'])
    for item in items:
        w.writerow([item.id, item.name, item.email, item.topic, item.message, item.created_at.strftime('%Y-%m-%d %H:%M') if item.created_at else ''])
    return Response(output.getvalue(), mimetype='text/csv', headers={'Content-Disposition': 'attachment; filename=messages.csv'})

# ---- Volunteers ----

@admin_bp.route('/volunteers')
@login_required
def volunteers():
    q = request.args.get('q', '').strip()
    query = Volunteer.query
    if q:
        query = query.filter(
            db.or_(Volunteer.name.ilike(f'%{q}%'), Volunteer.email.ilike(f'%{q}%'), Volunteer.skills.ilike(f'%{q}%'))
        )
    items = query.order_by(Volunteer.created_at.desc()).all()
    return render_template('admin/volunteers.html', items=items, q=q)

@admin_bp.route('/volunteers/export')
@login_required
def volunteers_export():
    q = request.args.get('q', '').strip()
    query = Volunteer.query
    if q:
        query = query.filter(
            db.or_(Volunteer.name.ilike(f'%{q}%'), Volunteer.email.ilike(f'%{q}%'), Volunteer.skills.ilike(f'%{q}%'))
        )
    items = query.order_by(Volunteer.created_at.desc()).all()
    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(['ID', 'Name', 'Email', 'Skills', 'Message', 'Date'])
    for item in items:
        w.writerow([item.id, item.name, item.email, item.skills, item.message, item.created_at.strftime('%Y-%m-%d %H:%M') if item.created_at else ''])
    return Response(output.getvalue(), mimetype='text/csv', headers={'Content-Disposition': 'attachment; filename=volunteers.csv'})

# ---- Job Openings CRUD ----

@admin_bp.route('/openings')
@login_required
def openings():
    items = JobOpening.query.order_by(JobOpening.created_at.desc()).all()
    return render_template('admin/openings.html', items=items)

@admin_bp.route('/openings/create', methods=['GET', 'POST'])
@login_required
def opening_create():
    if request.method == 'POST':
        opening = JobOpening(
            title=request.form['title'],
            location=request.form.get('location', ''),
            type=request.form.get('type', ''),
            description=request.form.get('description', ''),
            is_active=request.form.get('is_active') == 'on'
        )
        db.session.add(opening)
        db.session.commit()
        return redirect(url_for('admin.openings'))
    return render_template('admin/opening_form.html', opening=None)

@admin_bp.route('/openings/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def opening_edit(id):
    opening = db.session.get(JobOpening, id)
    if not opening:
        return redirect(url_for('admin.openings'))
    if request.method == 'POST':
        opening.title = request.form['title']
        opening.location = request.form.get('location', '')
        opening.type = request.form.get('type', '')
        opening.description = request.form.get('description', '')
        opening.is_active = request.form.get('is_active') == 'on'
        db.session.commit()
        return redirect(url_for('admin.openings'))
    return render_template('admin/opening_form.html', opening=opening)

@admin_bp.route('/openings/<int:id>/delete', methods=['POST'])
@login_required
def opening_delete(id):
    opening = db.session.get(JobOpening, id)
    if opening:
        db.session.delete(opening)
        db.session.commit()
    return redirect(url_for('admin.openings'))

# ---- Site Content ----

@admin_bp.route('/site-content', methods=['GET', 'POST'])
@login_required
def site_content():
    if request.method == 'POST':
        for key, value in request.form.items():
            if key.startswith('ck_'):
                actual_key = key[3:]
                item = SiteContent.query.filter_by(content_key=actual_key).first()
                if item:
                    item.value = value
                else:
                    db.session.add(SiteContent(content_key=actual_key, value=value))
        db.session.commit()
        return redirect(url_for('admin.site_content'))

    items = SiteContent.query.order_by(SiteContent.content_key).all()
    return render_template('admin/site_content.html', items=items)

@admin_bp.route('/upload-image', methods=['POST'])
@login_required
def upload_image():
    content_key = request.form.get('key', '')
    image_file = request.files.get('image')

    if not content_key or not image_file:
        return redirect(url_for('admin.site_content'))

    api_key = os.environ.get('IMGBB_API_KEY', '')
    if not api_key:
        return redirect(url_for('admin.site_content'))

    try:
        resp = requests.post(
            'https://api.imgbb.com/1/upload',
            data={'key': api_key},
            files={'image': (image_file.filename, image_file.stream, image_file.content_type)},
            timeout=30
        )
        data = resp.json()
        if data.get('success'):
            image_url = data['data']['url']
            item = SiteContent.query.filter_by(content_key=content_key).first()
            if item:
                item.value = image_url
            else:
                db.session.add(SiteContent(content_key=content_key, value=image_url))
            db.session.commit()
            return redirect(url_for('admin.site_content', _anchor='tab-images'))
    except Exception:
        pass

    return redirect(url_for('admin.site_content'))

# ---- Team Members ----

@admin_bp.route('/team')
@login_required
def team():
    items = TeamMember.query.order_by(TeamMember.sort_order).all()
    return render_template('admin/team.html', items=items)

@admin_bp.route('/team/create', methods=['GET', 'POST'])
@login_required
def team_create():
    if request.method == 'POST':
        member = TeamMember(
            name=request.form['name'],
            title=request.form.get('title', ''),
            description=request.form.get('description', ''),
            photo_path=request.form.get('photo_path', ''),
            sort_order=int(request.form.get('sort_order', 0)),
            is_active=request.form.get('is_active') == 'on'
        )
        db.session.add(member)
        db.session.commit()
        return redirect(url_for('admin.team'))
    return render_template('admin/team_form.html', member=None)

@admin_bp.route('/team/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def team_edit(id):
    member = db.session.get(TeamMember, id)
    if not member:
        return redirect(url_for('admin.team'))
    if request.method == 'POST':
        member.name = request.form['name']
        member.title = request.form.get('title', '')
        member.description = request.form.get('description', '')
        member.photo_path = request.form.get('photo_path', '')
        member.sort_order = int(request.form.get('sort_order', 0))
        member.is_active = request.form.get('is_active') == 'on'
        db.session.commit()
        return redirect(url_for('admin.team'))
    return render_template('admin/team_form.html', member=member)

@admin_bp.route('/team/<int:id>/delete', methods=['POST'])
@login_required
def team_delete(id):
    member = db.session.get(TeamMember, id)
    if member:
        db.session.delete(member)
        db.session.commit()
    return redirect(url_for('admin.team'))

