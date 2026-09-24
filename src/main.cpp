#include <Arduino.h>
#include <DHT20.h>
#include <Wire.h>

const uint8_t sdaPin = 4;
const uint8_t sclPin = 5;
DHT20 dht20;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("DHT20 test started");

  Wire.begin(sdaPin, sclPin);
  Wire.setClock(400000);

  Serial.print("I2C scan: ");
  bool found = false;
  for (uint8_t address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("0x");
      Serial.print(address, HEX);
      Serial.print(" ");
      found = true;
    }
  }
  if (!found) {
    Serial.print("no device found");
  }
  Serial.println();

  if (dht20.begin()) {
    Serial.println("DHT20 initialized");
  } else {
    Serial.println("DHT20 initialization failed");
  }
}

void loop() {
  int status = dht20.read();

  if (status == DHT20_OK) {
    Serial.print("Temperature: ");
    Serial.print(dht20.getTemperature(), 1);
    Serial.print(" C, Humidity: ");
    Serial.print(dht20.getHumidity(), 1);
    Serial.println(" %");
  } else {
    Serial.print("DHT20 read failed. Status: ");
    Serial.println(status);
  }

  delay(2000);
}