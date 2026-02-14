EVARE V2X Cooperative System – Master Context File

============================================ 1. SYSTEM OVERVIEW
============================================

Project Name: EVARE – Vehicle-to-Everything Cooperative Safety Prototype

Architecture: - 3 × ESP32 Dev Modules - ESP-NOW communication
(peer-to-peer, offline) - Star topology recommended (Infrastructure as
coordinator)

System Simulates: - V2V (Vehicle-to-Vehicle) - V2I
(Vehicle-to-Infrastructure) - Cooperative Safety Logic - Motor-based
vehicle behavior - Risk prioritization engine

============================================ 2. HARDWARE CONFIGURATION
============================================

  --------------------------------------------
  ESP32 #1 – Vehicle A Node
  --------------------------------------------
  Components: - DC Motor - Motor Driver (L298N
  or equivalent) - Brake Button - Indicator
  Button - Status LEDs - Buzzer

  Responsibilities: - Broadcast speed,
  acceleration, brake status, intent - Receive
  other vehicle data - Perform collision
  prediction - Execute PWM motor control
  decisions
  --------------------------------------------

ESP32 #2 – Vehicle B Node

Components: - DC Motor - Motor Driver - LEDs - Buzzer

Responsibilities: - Receive Vehicle A state - Calculate TTC
(Time-To-Collision) - Execute Cooperative Adaptive Cruise Control -
Execute emergency brake reaction - Lane change cooperation

  --------------------------------
  ESP32 #3 – Infrastructure Node
  --------------------------------

Components: - Buttons (School Zone, Hazard, Emergency Mode) - LEDs
(Status Display)

Responsibilities: - Broadcast infrastructure overrides - School zone
speed limit - Intersection negotiation manager - Emergency vehicle
broadcast

============================================ 3. MOTOR CONTROL
ARCHITECTURE ============================================

Speed Variable: - Represented via PWM (0–255)

Acceleration: - Calculated as delta speed over time

Braking: - Sudden negative acceleration threshold triggers EEBL
broadcast

Motor Logic: - Soft reduction for medium risk - Immediate stop for
critical risk

============================================ 4. V2V CORE DATA STRUCTURE
(Basic Safety Message Simulation)
============================================

Each vehicle continuously broadcasts:

{ vehicleID speed acceleration brakeStatus turnSignal laneID timestamp }

Broadcast Frequency: - 5–10 Hz (recommended)

============================================ 5. RISK CALCULATION MODEL
============================================

Time-To-Collision (TTC):

TTC = distance / relative_speed

Threshold Example: - TTC > 4 sec → SAFE - 2–4 sec → WARNING - <2 sec →
CRITICAL

Distance: - Simulated via potentiometer or logical variable

Relative Speed: - speed_self - speed_other

============================================ 6. IMPLEMENTED / PLANNED
FEATURES ============================================

CRITICAL SAFETY: 1. Emergency Electronic Brake Light (EEBL) 2. Forward
Collision Warning (TTC-based) 3. Chain Reaction Braking 4. Head-On
Collision Alert

PREVENTIVE: 5. Lane Change Assist 6. Overtaking Intent Broadcast 7.
Hazard Broadcast 8. Speed Harmonization

COOPERATIVE DRIVING: 9. Cooperative Adaptive Cruise Control (CACC) 10.
Platooning 11. Merge Assist 12. Intersection Negotiation

INFRASTRUCTURE: 13. School Zone Speed Cap 14. Emergency Vehicle Priority
15. Road Hazard Override

============================================ 7. EVENT PRIORITIZATION
ENGINE ============================================

Priority Levels: 0 – Safe 1 – Medium 2 – High 3 – Critical

Priority Hierarchy: Infrastructure Override > Emergency Brake > TTC
Warning > Intent Sharing

Highest priority event controls motor output.

============================================ 8. COMMUNICATION STRUCTURE
(ESP-NOW) ============================================

Each ESP32 must: - Register MAC addresses of peers - Send structured
packets - Implement acknowledgment handling

Topology: Infrastructure → Vehicles Vehicles ↔ Vehicles

============================================ 9. LIVE DASHBOARD
REQUIREMENTS ============================================

Dashboard must display:

For Each Vehicle: - MAC Address - Current Speed - Acceleration - Brake
Status - Turn Signal Status - Risk Level - TTC Value - Active Event -
Priority Level

For Infrastructure: - Active Overrides - School Zone Mode - Emergency
Mode - Intersection Status

Live Update Requirements: - Real-time WebSocket or Serial-to-Web
bridge - Color-coded risk levels - Flashing indicators for critical
alerts

============================================ 10. FUTURE EXPANSION
============================================

-   Multi-vehicle scaling (more ESP nodes)
-   Latency measurement display
-   Event logging
-   Graph plotting of speed vs time
-   Risk trend visualization

============================================ END OF MASTER CONTEXT
============================================
