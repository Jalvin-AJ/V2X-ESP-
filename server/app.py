import serial
import threading
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'v2x_secret'
# Use eventlet or gevent for better performance with Serial threads
socketio = SocketIO(app, cors_allowed_origins="*")

# --- SERIAL SETUP ---
try:
    # Update 'COM4' to your Arduino Uno's port from the IDE
    # Ensure baudrate is 115200 for low-latency simulation
    ser = serial.Serial('COM4', 9600, timeout=1) 
except Exception as e:
    ser = None
    print(f"Hardware not found, running in Software-Only mode: {e}")

# --- BACKGROUND THREAD FOR ARDUINO ---
def listen_to_arduino():
    """Reads potentiometer data from Arduino and bridges it to the 3D Dashboard."""
    while True:
        if ser and ser.in_waiting > 0:
            try:
                line = ser.readline().decode('utf-8').strip()
                if line.startswith("POT_VAL:"):
                    # Extract the 0-100 value
                    speed_val = int(line.split(":")[1])
                    # Send to the 3D engine (main.js)
                    socketio.emit('v2x_update', {'event': 'speed_change', 'value': speed_val})
            except Exception as e:
                print(f"Serial Error: {e}")

# Start the thread before running the app
threading.Thread(target=listen_to_arduino, daemon=True).start()

# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulate-brake')
def simulate_brake():
    socketio.emit('v2x_update', {'event': 'braking', 'value': True})
    return "Simulation Signal Sent!"

# --- SOCKET EVENTS ---
@socketio.on('manual_move_request')
def handle_manual_move(data):
    distance_to_move = float(data['distance'])
    
    # Logic check: If moving this distance is dangerous (Safety Protocol)
    if distance_to_move > 150: 
        # Trigger the red HUD alert
        emit('v2x_update', {'event': 'AEB_ACTIVE'}, broadcast=True) 
    else:
        # Move the 3D environment forward
        emit('apply_distance_shift', {'amount': distance_to_move}, broadcast=True)

if __name__ == '__main__':
    # host='0.0.0.0' lets you view the dashboard on your phone if on the same Wi-Fi
    socketio.run(app, debug=True, port=5000)