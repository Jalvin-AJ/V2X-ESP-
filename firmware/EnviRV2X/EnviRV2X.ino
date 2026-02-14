#include <esp_now.h>
#include <WiFi.h>

#define POT_PIN 34
#define BTN_SIGNAL 21
#define BTN_PEDESTRIAN 22
#define MOTOR_ARM 27   // <-- FIXED PIN

// ----- MOTOR PINS -----
#define IN1 13
#define IN2 18
#define IN3 32
#define IN4 33
#define ENA 19
#define ENB 23

uint8_t receiverAddress[] = { 
  0xF8, 0xB3, 0xB7, 0x29, 0xE8, 0xF4
};

typedef struct {
  int sourceType;
  int eventType;
  int priority;
} V2XPacket;

V2XPacket packet;

int lastDistanceRisk = -1;

// ---------- SEND EVENT ----------
void sendEvent(int source, int event, int priority) {
  packet.sourceType = source;
  packet.eventType  = event;
  packet.priority   = priority;

  esp_now_send(receiverAddress, (uint8_t *)&packet, sizeof(packet));
}

// ---------- MOTOR CONTROL ----------
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
  pinMode(MOTOR_ARM, INPUT_PULLUP);  // proper pull-up now works

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  WiFi.setTxPower(WIFI_POWER_19_5dBm);   // stronger signal

  esp_now_init();

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, receiverAddress, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);

  Serial.println("Environment Ready");
}

void loop() {

  // ----- V2V Distance -----
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

  // ----- MOTOR CONTROL VIA SWITCH -----
  bool motorEnabled = (digitalRead(MOTOR_ARM) == LOW);

  if (motorEnabled) {

    if      (risk == 0) moveForward(220);
    else if (risk == 1) moveForward(150);
    else if (risk == 2) moveForward(80);
    else                stopMotors();

  } else {
    stopMotors();
  }

  // ----- BUTTON OVERRIDES (NON-BLOCKING) -----
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
