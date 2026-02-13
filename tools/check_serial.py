import serial
import time
import sys

def check_serial(port='COM8', baudrate=115200):
    print(f"Attempting to connect to {port} at {baudrate} baud...")
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        print(f"Successfully connected to {port}!")
        print("Waiting for data (press Ctrl+C to stop)...")
        
        while True:
            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        print(f"RECEIVED: {line}")
                except Exception as e:
                    print(f"Read Error: {e}")
            time.sleep(0.01)
            
    except serial.SerialException as e:
        print(f"Error opening port {port}: {e}")
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Port closed.")

if __name__ == "__main__":
    port = sys.argv[1] if len(sys.argv) > 1 else 'COM8'
    check_serial(port)
