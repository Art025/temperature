#include <Arduino.h>

namespace {
constexpr uint8_t fanPin = 13;
constexpr float fanOnTemperature = 28.0f;
constexpr float fanOffTemperature = 26.0f;
bool fanEnabled = false;

void setFan(bool enabled) {
	fanEnabled = enabled;
	digitalWrite(fanPin, enabled ? HIGH : LOW);
}

struct FanController {
	FanController() {
		pinMode(fanPin, OUTPUT);
		setFan(false);
	}
};

FanController fanController;
}

void setFanFromMqtt(bool enabled) {
	setFan(enabled);
}

void setFanFromTemperature(float temperature) {
	if (!fanEnabled && temperature >= fanOnTemperature) {
		setFan(true);
	} else if (fanEnabled && temperature <= fanOffTemperature) {
		setFan(false);
	}
}
