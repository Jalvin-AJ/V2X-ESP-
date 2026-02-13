const int potPin = A0; // Pin connected to the wiper

void setup() {
  // Use 115200 to ensure low latency for your 3D dashboard
  Serial.begin(115200); 
  pinMode(potPin, INPUT);
}

void loop() {
  // Read the potentiometer value (0 - 1023)
  int val = analogRead(potPin);
  val = map(val, 0, 1023, 0, 101);
  // Format the data so Flask can easily parse it
  Serial.print("POT_VAL:");
  Serial.println(val);
  
  delay(50); // 20 updates per second for smooth car movement
}