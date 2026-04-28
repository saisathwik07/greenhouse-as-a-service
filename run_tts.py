from flask import Flask
from tts_api import tts_api

app = Flask(__name__)
app.register_blueprint(tts_api)

if __name__ == '__main__':
    app.run(debug=True)