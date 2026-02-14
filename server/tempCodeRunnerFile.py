import serial
import threading
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'v2x_secret'
# Force threading mode to ensure compatibility with standard threading.Thread
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# --- SERIAL SETUP ---
try:
    # Update 'COM4' to your Arduino Uno's port from the IDE
    # Ensure baudrate is 115200 for low-latency simulation
    ser = serial.Serial('COM8', 115200, timeout=1) 
    print("SUCCESS: Connected to Arduino on COM8") # DEBUG 
except Exception as e:
    ser = None
    print(f"Hardware not found, running in Software-Only mode: {e}")
import time

def listen_to_arduino():
    while True:
        if ser and ser.in_waiting > 0:
            try:
                # Use a timeout-safe read
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line.startswith("POT_VAL:"):
                    parts = line.split(":")
                    if len(parts) > 1:
                        speed_val = int(parts[1])
                        # Broadcast to all connected clients
                        socketio.emit('v2x_update', {'event': 'speed_change', 'value': speed_val})
            except Exception as e:
                print(f"Serial Error: {e}")
        time.sleep(0.01) # 10ms sleep to save CPU cycles


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
    # host='0.0.0.0' is perfect for testing on multiple devices
    # use_reloader=False prevents the serial port from being opened twice
    socketio.run(app, port=5000, debug=True, use_reloader=False)