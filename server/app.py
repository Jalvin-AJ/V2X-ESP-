from flask import Flask, render_template
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    # Flask looks into the 'templates' folder for this file
    return render_template('index.html')
@app.route('/simulate-brake')
def simulate_brake():
    # This manually triggers the 'braking' event just like the Serial bridge
    socketio.emit('v2x_update', {'event': 'braking', 'value': True})
    return "Simulation Signal Sent!"
@socketio.on('manual_move_request')
def handle_manual_move(data):
    distance_to_move = data['distance']
    
    # Logic check: If moving this distance puts us past the lead car
    # We can trigger an alert instead of just moving
    if distance_to_move > 150: 
        emit('v2x_update', {'event': 'AEB_ACTIVE'}) # Trigger the brake alert
    else:
        # Broadcast the verified distance back to the JS code
        emit('apply_distance_shift', {'amount': distance_to_move}, broadcast=True)
if __name__ == '__main__':
    # '0.0.0.0' allows other devices (like your phone) to see the site too
    socketio.run(app, debug=True, port=5000)

