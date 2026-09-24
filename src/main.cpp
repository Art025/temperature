#include <Arduino.h>
#include <DHT20.h>
#include <Wire.h>

const uint8_t sdaPin = 4;
const uint8_t sclPin = 5;
DHT20 dht20;

void setup() {
  Serial.begin(115200);
  Wire.begin(sdaPin, sclPin);

  if (!dht20.begin()) {
    Serial.println("DHT20 initialization failed.");
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