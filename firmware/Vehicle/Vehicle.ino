#include <esp_now.h>
#include <WiFi.h>

#define RED_LED 25
#define YELLOW_LED 26
#define GREEN_LED 27
#define BUZZER 14

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

void clearOutputs() {
  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BUZZER, LOW);
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

  WiFi.mode(WIFI_STA);
  esp_now_init();
  esp_now_register_recv_cb(OnDataRecv);
}

void loop() {

  unsigned long currentTime = millis();

  // End override
  if (overrideActive && currentTime - overrideStart > overrideDuration) {
    overrideActive = false;
    activeRisk = distanceRisk;
    lastBlinkTime = 0;
    outputState = false;
  }

  if (activeRisk == 0) {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(BUZZER, LOW);
    digitalWrite(GREEN_LED, HIGH);
  }

  else if (activeRisk == 1) {

    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, LOW);

    if (currentTime - lastBlinkTime > mediumInterval) {
      lastBlinkTime = currentTime;
      outputState = !outputState;
    }

    digitalWrite(YELLOW_LED, outputState);
    digitalWrite(BUZZER, outputState);
  }

  else if (activeRisk == 2) {

    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);

    if (currentTime - lastBlinkTime > highInterval) {
      lastBlinkTime = currentTime;
      outputState = !outputState;
    }

    digitalWrite(RED_LED, outputState);
    digitalWrite(BUZZER, outputState);
  }

  else if (activeRisk == 3) {

    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);

    if (currentTime - lastBlinkTime > criticalInterval) {
      lastBlinkTime = currentTime;
      outputState = !outputState;
    }

    digitalWrite(RED_LED, outputState);
    digitalWrite(BUZZER, outputState);
  }
}

