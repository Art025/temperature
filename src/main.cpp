#include <Arduino.h>
#include <DHT20.h>
#include "config.h"
#ifdef ESP8266
#include <ESP8266WiFi.h>
#else
#include <WiFi.h>
#endif
#include <PubSubClient.h>
#include <Wire.h>

const uint8_t sdaPin = 4;
const uint8_t sclPin = 5;
DHT20 dht20;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
bool mqttConnectionFailed = false;

void connectMqtt() {
  if (mqttClient.connected()) {
    return;
  }

  Serial.print("Connecting to MQTT broker...");
  if (mqttClient.connect(TEAM_ID)) {
    mqttConnectionFailed = false;
    Serial.println(" connected");
  } else {
    mqttConnectionFailed = true;
    Serial.print(" failed. State: ");
    Serial.println(mqttClient.state());
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("DHT20 and MQTT test started");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Wi-Fi connected. IP: ");
  Serial.println(WiFi.localIP());

  mqttClient.setServer(MQTT_SERVER, 1883);
  connectMqtt();

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
  connectMqtt();
  int status = dht20.read();

  if (status == DHT20_OK) {
    float temperature = dht20.getTemperature();
    float humidity = dht20.getHumidity();

    Serial.print("Temperature: ");
    Serial.print(temperature, 1);
    Serial.print(" C, Humidity: ");
    Serial.print(humidity, 1);
    Serial.println(" %");

    if (!mqttConnectionFailed && mqttClient.connected()) {
      String temperaturePayload = String(temperature, 1);
      String humidityPayload = String(humidity, 1);
      String temperatureTopic = String(TEAM_ID) + "/sensor/temperature";
      String humidityTopic = String(TEAM_ID) + "/sensor/humidity";

      bool temperaturePublished = mqttClient.publish(temperatureTopic.c_str(), temperaturePayload.c_str());
      bool humidityPublished = mqttClient.publish(humidityTopic.c_str(), humidityPayload.c_str());
      if (temperaturePublished && humidityPublished) {
        Serial.println("MQTT publish complete");
      } else {
        Serial.println("MQTT publish failed");
      }
    } else {
      Serial.println("MQTT is not connected. Publish skipped.");
    }
  } else {
    Serial.print("DHT20 read failed. Status: ");
    Serial.println(status);
  }

  delay(2000);
}