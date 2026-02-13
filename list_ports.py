import serial.tools.list_ports
ports = serial.tools.list_ports.comports()
if not ports:
    print("No COM ports found.")
else:
    for port, desc, hwid in sorted(ports):
        print(f"{port}: {desc} [{hwid}]")
