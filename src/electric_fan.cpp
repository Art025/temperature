#include <Arduino.h>
#include <Ticker.h>

namespace {
constexpr uint8_t fanPin = 13;
Ticker fanTimer;

void toggleFan() {
	digitalWrite(fanPin, !digitalRead(fanPin));
}

void setFan(bool enabled) {
	digitalWrite(fanPin, enabled ? HIGH : LOW);
}

struct FanController {
	FanController() {
		pinMode(fanPin, OUTPUT);
		digitalWrite(fanPin, LOW);
		fanTimer.attach(5.0f, toggleFan);
	}
};

FanController fanController;
}

void setFanFromMqtt(bool enabled) {
	fanTimer.detach();
	setFan(enabled);
}
