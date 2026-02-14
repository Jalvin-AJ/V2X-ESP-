#include <esp_now.h>
#include <WiFi.h>

#define POT_PIN 34
#define BTN_SIGNAL 21
#define BTN_PEDESTRIAN 22
#define MOTOR_ARM 27

// ----- MOTOR PINS -----
#define IN1 13
#define IN2 18
#define IN3 32
#define IN4 33
#define ENA 19
#define ENB 23

// ---- MAC ADDRESSES ----

// Vehicle ESP MAC
uint8_t vehicleAddress[] = { 
  0xF8, 0xB3, 0xB7, 0x29, 0xE8, 0xF4
};

// Gateway ESP MAC
uint8_t gatewayAddress[] = { 
  0x88, 0x57, 0x21, 0x78, 0x84, 0x4C
};

typedef struct {
  int sourceType;
  int eventType;
  int priority;
} V2XPacket;

V2XPacket packet;
int lastDistanceRisk = -1;

// ---------- SEND TO BOTH ----------
void sendEvent(int source, int event, int priority) {

  packet.sourceType = source;
  packet.eventType  = event;
  packet.priority   = priority;

  esp_now_send(vehicleAddress, (uint8_t *)&packet, sizeof(packet));
  esp_now_send(gatewayAddress, (uint8_t *)&packet, sizeof(packet));
}

// ---------- MOTOR ----------
void moveForward(int speed) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  ledcWrite(ENA, speed);
  ledcWrite(ENB, speed);
}

void stopMotors() {
  ledcWrite(ENA, 0);
  ledcWrite(ENB, 0);
}

void setup() {

  Serial.begin(115200);

  pinMode(POT_PIN, INPUT);
  pinMode(BTN_SIGNAL, INPUT_PULLUP);
  pinMode(BTN_PEDESTRIAN, INPUT_PULLUP);
  pinMode(MOTOR_ARM, INPUT_PULLUP);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  WiFi.setTxPower(WIFI_POWER_19_5dBm);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW Init Failed");
    return;
  }

  esp_now_peer_info_t peerInfo = {};
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  // Add Vehicle peer
  memcpy(peerInfo.peer_addr, vehicleAddress, 6);
  esp_now_add_peer(&peerInfo);

  // Add Gateway peer
  memcpy(peerInfo.peer_addr, gatewayAddress, 6);
  esp_now_add_peer(&peerInfo);

  Serial.println("Environment Ready");
}

void loop() {

  // ----- Distance Risk -----
  int potValue = analogRead(POT_PIN);
  int risk;

  if (potValue > 3200)      risk = 0;
  else if (potValue > 2200) risk = 1;
  else if (potValue > 1000) risk = 2;
  else                      risk = 3;

  if (risk != lastDistanceRisk) {
    sendEvent(1, 1, risk);
    lastDistanceRisk = risk;
  }

  // ----- Motor Control -----
  bool motorEnabled = (digitalRead(MOTOR_ARM) == LOW);

  if (motorEnabled) {
    if      (risk == 0) moveForward(220);
    else if (risk == 1) moveForward(150);
    else if (risk == 2) moveForward(80);
    else                stopMotors();
  } else {
    stopMotors();
  }

  // ----- Overrides -----
  static unsigned long lastButtonTime = 0;

  if (millis() - lastButtonTime > 250) {

    if (digitalRead(BTN_SIGNAL) == LOW) {
      sendEvent(2, 3, 2);
      lastButtonTime = millis();
    }

    if (digitalRead(BTN_PEDESTRIAN) == LOW) {
      sendEvent(3, 4, 3);
      lastButtonTime = millis();
    }
  }
}
