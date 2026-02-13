# EVARE – V2X Cooperative Safety Prototype  
## Technical Context Document

---

## 1. Project Overview

EVARE is a cooperative Vehicle-to-Everything (V2X) safety prototype built using two ESP32 boards communicating via ESP-NOW (offline peer-to-peer protocol).

The system simulates:

- V2V (Vehicle-to-Vehicle) distance-based collision risk
- V2I (Vehicle-to-Infrastructure) red signal alert
- V2P (Vehicle-to-Pedestrian) critical pedestrian alert

The prototype demonstrates:

- Real-time risk evaluation
- Multi-source hazard processing
- Alert prioritization
- Human-Machine Interface (HMI) feedback
- Offline low-latency wireless communication

There is no internet or cloud dependency.

---

## 2. System Architecture

### 2.1 Environment Node (ESP32 #1)

Represents the external world.

#### Inputs:
- Potentiometer → Simulates distance between two vehicles (V2V)
- Button 1 → Red traffic signal (V2I)
- Button 2 → Pedestrian crossing (V2P)

#### Responsibilities:
- Converts analog distance to risk levels
- Sends structured V2X packets via ESP-NOW
- Overrides distance risk when infrastructure or pedestrian events occur

---

### 2.2 Vehicle Node (ESP32 #2)

Represents the moving EV.

#### Responsibilities:
- Receives V2X packets via ESP-NOW
- Applies risk prioritization logic
- Activates visual and audio alerts:
  - Green LED → Safe
  - Yellow LED → Medium Risk
  - Red LED → High / Critical Risk
  - Buzzer → Severity-based beeping

This node simulates the EV’s safety processing unit.

---

## 3. Communication Protocol

### Wireless Protocol
ESP-NOW (Peer-to-peer, low latency, no router required)

### Packet Structure

```cpp
typedef struct {
  int sourceType;   // 1 = V2V, 2 = V2I, 3 = V2P
  int eventType;    // Specific event identifier
  int priority;     // 0 = Safe, 1 = Medium, 2 = High, 3 = Critical
} V2XPacket;
---

## 4. Risk Model

### 4.1 Distance-Based V2V (Potentiometer)

Analog range: **0–4095**

| ADC Value     | Risk Level | Meaning   |
|---------------|------------|-----------|
| > 3200        | 0          | Safe      |
| 2200–3200     | 1          | Medium    |
| 1000–2200     | 2          | High      |
| < 1000        | 3          | Critical  |

Distance risk updates continuously in real time.

---

### 4.2 V2I Override (Red Signal)

When the Red Signal button is pressed:

sourceType = 2
priority = 2

This overrides the current distance risk for approximately 3 seconds.

---

### 4.3 V2P Override (Pedestrian)

When the Pedestrian button is pressed:

EVARE_ALERT:SAFE
EVARE_ALERT:MEDIUM:DISTANCE
EVARE_ALERT:HIGH:RED_SIGNAL
EVARE_ALERT:CRITICAL:PEDESTRIAN


### Recommended UI Mapping

| Risk      | UI Background  |
|-----------|----------------|
| SAFE      | Green          |
| MEDIUM    | Yellow         |
| HIGH      | Red            |
| CRITICAL  | Flashing Red   |

---

## 8. Demo Flow

1. Turn potentiometer → Distance decreases  
   → UI transitions: Green → Yellow → Red  

2. Press Pedestrian Button  
   → Immediate Critical override  

3. After timeout  
   → System returns to distance state  

4. Press Red Signal Button  
   → High risk override  

This demonstrates cooperative multi-source hazard processing.

---

## 9. What This Prototype Demonstrates

EVARE showcases a cooperative safety layer for electric vehicles by integrating:

- Intent sharing (V2V)
- Infrastructure alerts (V2I)
- Pedestrian hazard detection (V2P)
- Real-time risk prioritization
- Human-machine interface escalation
- Offline wireless safety communication

It simulates how modern EVs process V2X information to enhance road safety.

---

## 10. Future Expansion Possibilities

- Display real-time distance value
- Time-to-collision (TTC) calculation
- Auto braking motor control
- Event logging history
- Latency measurement display
- Multi-vehicle scaling

---

**End of Context Document**
