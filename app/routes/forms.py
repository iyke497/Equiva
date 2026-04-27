from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Subscriber, ContactMessage, Volunteer

forms_bp = Blueprint('forms', __name__)

@forms_bp.route("/subscribe", methods=['POST'])
def subscribe():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'message': 'Email is required'}), 400

    subscriber = Subscriber(
        name=data.get('name', ''),
        email=data['email'].strip()
    )
    db.session.add(subscriber)
    db.session.commit()

    return jsonify({'message': 'Welcome! You\'ve reserved your spot. We\'ll be in touch within 48 hours.'}), 201

@forms_bp.route("/contact", methods=['POST'])
def contact():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'message': 'Email is required'}), 400

    msg = ContactMessage(
        name=data.get('name', ''),
        email=data['email'].strip(),
        topic=data.get('topic', ''),
        message=data.get('message', '')
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify({'message': 'Message sent. We\'ll be in touch within 48 hours.'}), 201

@forms_bp.route("/volunteer", methods=['POST'])
def volunteer():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'message': 'Email is required'}), 400

    vol = Volunteer(
        name=data.get('name', ''),
        email=data['email'].strip(),
        skills=data.get('skills', ''),
        message=data.get('message', '')
    )
    db.session.add(vol)
    db.session.commit()

    return jsonify({'message': 'Thank you for your interest! We\'ll reach out within 48 hours.'}), 201
