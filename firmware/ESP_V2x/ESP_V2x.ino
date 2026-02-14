#include <esp_now.h>
#include <WiFi.h>

#define RED_LED 25
#define YELLOW_LED 26
#define GREEN_LED 27
#define BUZZER 14

// ----- MOTOR -----
#define IN1 13
#define IN2 18
#define IN3 32
#define IN4 33
#define ENA 19
#define ENB 23

typedef struct {
  int sourceType;
  int eventType;
  int priority;
} V2XPacket;

int distanceRisk = 0;
int activeRisk = 0;

unsigned long overrideStart = 0;
bool overrideActive = false;

unsigned long lastBlinkTime = 0;
bool outputState = false;

const unsigned long mediumInterval   = 600;
const unsigned long highInterval     = 200;
const unsigned long criticalInterval = 80;
const unsigned long overrideDuration = 3000;

// ----- MOTOR -----
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

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {

  V2XPacket packet;
  memcpy(&packet, incomingData, sizeof(packet));

  if (packet.sourceType == 1) {
    distanceRisk = packet.priority;
    if (!overrideActive)
      activeRisk = distanceRisk;
  }
  else {
    activeRisk = packet.priority;
    overrideActive = true;
    overrideStart = millis();
  }

  lastBlinkTime = 0;
  outputState = false;
}

void setup() {

  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_now_init();
  esp_now_register_recv_cb(OnDataRecv);
}

void loop() {

  unsigned long currentTime = millis();

  if (overrideActive && currentTime - overrideStart > overrideDuration) {
    overrideActive = false;
    activeRisk = distanceRisk;
  }

  // ----- MOTOR MAPPING -----
  if      (activeRisk == 0) moveForward(220);
  else if (activeRisk == 1) moveForward(150);
  else if (activeRisk == 2) moveForward(80);
  else                      stopMotors();

  // ----- ORIGINAL LED LOGIC -----
  if (activeRisk == 0) {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(BUZZER, LOW);
    digitalWrite(GREEN_LED, HIGH);
  }

  else {

    digitalWrite(GREEN_LED, LOW);

    unsigned long interval = mediumInterval;
    if (activeRisk == 2) interval = highInterval;
    if (activeRisk == 3) interval = criticalInterval;

    if (currentTime - lastBlinkTime > interval) {
      lastBlinkTime = currentTime;
      outputState = !outputState;
    }

    digitalWrite(BUZZER, outputState);

    if (activeRisk == 1) digitalWrite(YELLOW_LED, outputState);
    else {
      digitalWrite(YELLOW_LED, LOW);
      digitalWrite(RED_LED, outputState);
    }
  }
}
