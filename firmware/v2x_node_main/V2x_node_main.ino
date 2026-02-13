void setup() {
  Serial.begin(115200);
}

void loop() {
  int potValue = analogRead(A0);
  int mappedValue = map(potValue, 0, 1023, 0, 100);

  Serial.print("POT_VAL:");
  Serial.println(mappedValue); // Must be println for Python's readline()
  delay(50); // Send data at 20Hz for smooth simulation
}