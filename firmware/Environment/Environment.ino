#include <esp_now.h>
#include <WiFi.h>

#define POT_PIN 34
#define BTN_SIGNAL 21
#define BTN_PEDESTRIAN 22

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

void sendEvent(int source, int event, int priority) {
  packet.sourceType = source;
  packet.eventType  = event;
  packet.priority   = priority;

  esp_now_send(receiverAddress, (uint8_t *)&packet, sizeof(packet));
}

void setup() {
  Serial.begin(115200);

  pinMode(POT_PIN, INPUT);
  pinMode(BTN_SIGNAL, INPUT_PULLUP);
  pinMode(BTN_PEDESTRIAN, INPUT_PULLUP);

  WiFi.mode(WIFI_STA);
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

  if (potValue > 3200)
    risk = 0;
  else if (potValue > 2200)
    risk = 1;
  else if (potValue > 1000)
    risk = 2;
  else
    risk = 3;

  if (risk != lastDistanceRisk) {
    sendEvent(1, 1, risk);
    lastDistanceRisk = risk;
  }

  // ----- V2I Override -----
  if (digitalRead(BTN_SIGNAL) == LOW) {
    sendEvent(2, 3, 2);
    delay(400);
  }

  // ----- V2P Override -----
  if (digitalRead(BTN_PEDESTRIAN) == LOW) {
    sendEvent(3, 4, 3);
    delay(400);
  }

  delay(60);
}
