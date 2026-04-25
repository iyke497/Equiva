from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html", page_name="home")

@app.route("/about")
def about():
    return render_template("about.html", page_name="about")

@app.route("/what-we-do")
def what_we_do():
    return render_template("what-we-do.html", page_name="what_we_do")

@app.route("/contact")
def contact():
    return render_template("contact.html", page_name="contact")

@app.route("/join-us")
def join_us():
    return render_template("join-us.html", page_name="join_us")

@app.route("/partner-with-us")
def partner_with_us():
    return render_template("donor-pitch.html", page_name="partner_with_us")

if __name__ == "__main__":
    app.run(debug=True)