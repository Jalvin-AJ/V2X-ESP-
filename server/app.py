import time
import threading
import serial
from flask import Flask, render_template
from flask_socketio import SocketIO

# ---------------- CONFIG ----------------
SERIAL_PORT = "COM3"      # <-- CHANGE IF NEEDED
BAUD_RATE = 115200

# ---------------- FLASK ----------------
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

ser = None
serial_connected = False
last_packet = None


# ---------------- SERIAL CONNECT ----------------
def connect_serial():
    global ser, serial_connected

    while not serial_connected:
        try:
            print(f"[INFO] Connecting to Gateway on {SERIAL_PORT}...")
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
            serial_connected = True
            print("[SUCCESS] Serial connected.")
        except:
            print("[ERROR] Serial connection failed. Retrying in 3 seconds...")
            time.sleep(3)


# ---------------- SERIAL READ LOOP ----------------
def read_serial_loop():
    global ser, serial_connected, last_packet

    connect_serial()

    while True:
        try:
            line = ser.readline().decode(errors="ignore").strip()

            if line.startswith("EVARE:"):

                # Prevent duplicate flooding
                if line == last_packet:
                    continue

                last_packet = line
                print("[DATA]", line)

                parts = line.split(":")
                if len(parts) == 3:
                    risk = parts[1]
                    event = parts[2]

                    socketio.emit("v2x_update", {
                        "risk": risk,
                        "event": event
                    })

        except Exception as e:
            print("[ERROR] Serial lost. Reconnecting...")
            serial_connected = False
            time.sleep(2)
            connect_serial()


# ---------------- ROUTES ----------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------- START THREAD ----------------
threading.Thread(target=read_serial_loop, daemon=True).start()


# ---------------- MAIN ----------------
if __name__ == "__main__":
    print("[INFO] EVARE Digital Twin Backend Starting...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, use_reloader=False)
