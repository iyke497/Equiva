from flask import Blueprint, render_template, g
from ..models import JobOpening, TeamMember

main_bp = Blueprint('main', __name__)

@main_bp.route("/")
def index():
    return render_template("index.html", page_name="home")

@main_bp.route("/about")
def about():
    team_members = TeamMember.query.filter_by(is_active=True).order_by(TeamMember.sort_order).all()
    return render_template("about.html", page_name="about", team_members=team_members)

@main_bp.route("/what-we-do")
def what_we_do():
    return render_template("what-we-do.html", page_name="what_we_do")

@main_bp.route("/contact", methods=['GET'])
def contact():
    return render_template("contact.html", page_name="contact")

@main_bp.route("/join-us")
def join_us():
    openings = JobOpening.query.filter_by(is_active=True).all()
    return render_template("join-us.html", page_name="join_us", openings=openings)

@main_bp.route("/partner-with-us")
def partner_with_us():
    return render_template("donor-pitch.html", page_name="partner_with_us")

@main_bp.route("/terms")
def terms():
    return render_template("terms.html", page_name="terms")

@main_bp.route("/privacy")
def privacy():
    return render_template("privacy.html", page_name="privacy")
