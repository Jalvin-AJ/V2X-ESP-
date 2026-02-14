#include <esp_now.h>
#include <WiFi.h>

typedef struct {
  int sourceType;
  int eventType;
  int priority;
} V2XPacket;

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {

  V2XPacket packet;
  memcpy(&packet, incomingData, sizeof(packet));

  Serial.print("EVARE:");

  // Risk mapping
  if (packet.priority == 0) Serial.print("SAFE");
  else if (packet.priority == 1) Serial.print("MEDIUM");
  else if (packet.priority == 2) Serial.print("HIGH");
  else if (packet.priority == 3) Serial.print("CRITICAL");

  Serial.print(":");

  // Event mapping
  if (packet.sourceType == 1) Serial.println("DISTANCE");
  else if (packet.sourceType == 2) Serial.println("RED_SIGNAL");
  else if (packet.sourceType == 3) Serial.println("PEDESTRIAN");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  esp_now_init();
  esp_now_register_recv_cb(OnDataRecv);

  Serial.println("Gateway Ready");
}

void loop() {}
