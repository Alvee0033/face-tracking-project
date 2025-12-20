from flask import Flask, jsonify, request
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

# In-memory storage for session data
sessions = []

@app.route('/api/session/start', methods=['POST'])
def start_session():
    session_id = int(time.time())
    sessions.append({
        "id": session_id,
        "start_time": time.time(),
        "data": []
    })
    return jsonify({"status": "success", "session_id": session_id})

@app.route('/api/session/log', methods=['POST'])
def log_data():
    data = request.json
    # Here you could save attention scores to a database
    print(f"Received log: {data}")
    return jsonify({"status": "logged"})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify({
        "total_sessions": len(sessions),
        "last_session_score": 85.5 # Example
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
