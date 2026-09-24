const express = require('express');
const http = require('http');
const mqtt = require('mqtt');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;
const teamId = 'TEAM_002';
const temperatureTopic = `${teamId}/sensor/temperature`;
const humidityTopic = `${teamId}/sensor/humidity`;
const brokerUrl = process.env.MQTT_BROKER || 'mqtt://mqtt.m5stack.com';

const latest = {
  temperature: null,
  humidity: null,
};

app.use(express.static('public'));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    teamId,
    temperatureTopic,
    humidityTopic,
    latest,
  });
});

io.on('connection', (socket) => {
  socket.emit('init', latest);
  socket.on('request-history', () => {
    socket.emit('init', latest);
  });
});

const mqttClient = mqtt.connect(brokerUrl);

mqttClient.on('connect', () => {
  console.log(`MQTT connected: ${brokerUrl}`);
  mqttClient.subscribe([temperatureTopic, humidityTopic], (err) => {
    if (err) {
      console.error('MQTT subscribe error:', err);
    } else {
      console.log(`Subscribed to ${temperatureTopic} and ${humidityTopic}`);
    }
  });
});

mqttClient.on('message', (topic, message) => {
  const value = Number(message.toString());
  if (!Number.isFinite(value)) {
    console.warn(`Invalid MQTT value on ${topic}: ${message.toString()}`);
    return;
  }

  if (topic === temperatureTopic) {
    latest.temperature = value;
  }

  if (topic === humidityTopic) {
    latest.humidity = value;
  }

  io.emit('sensor-data', {
    topic,
    value,
    timestamp: new Date().toISOString(),
  });
});

mqttClient.on('error', (err) => {
  console.error('MQTT error:', err);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Express server running at http://localhost:${port}`);
  console.log(`Listening for MQTT topic ${temperatureTopic} and ${humidityTopic}`);
});
