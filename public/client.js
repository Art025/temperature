const socket = io();

const temperatureValue = document.getElementById('temperatureValue');
const humidityValue = document.getElementById('humidityValue');
const fanSwitch = document.getElementById('fanSwitch');
const fanState = document.getElementById('fanState');
const fanStatus = document.getElementById('fanStatus');
const chartSummary = document.getElementById('chartSummary');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

const history = {
  temperature: [],
  humidity: [],
};

const MAX_POINTS = 300;

function updateFanState(state) {
  const isOn = state === 'ON';
  fanSwitch.checked = isOn;
  fanState.textContent = isOn ? 'ON' : 'OFF';
}

fanSwitch.addEventListener('change', async () => {
  const state = fanSwitch.checked ? 'ON' : 'OFF';
  fanSwitch.disabled = true;
  fanStatus.textContent = '送信中...';

  try {
    const response = await fetch('/api/fan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });

    if (!response.ok) {
      throw new Error('fan command failed');
    }

    updateFanState(state);
    fanStatus.textContent = '送信完了';
  } catch (_error) {
    updateFanState(state === 'ON' ? 'OFF' : 'ON');
    fanStatus.textContent = '送信失敗';
  } finally {
    fanSwitch.disabled = false;
  }
});

function formatValue(value, unit) {
  if (value === null || Number.isNaN(value)) {
    return `--.- ${unit}`;
  }
  return `${value.toFixed(1)} ${unit}`;
}

function pushHistory(type, value, time = Date.now()) {
  if (!Number.isFinite(value)) return;

  history[type].push({
    value,
    time,
  });

  if (history[type].length > MAX_POINTS) {
    history[type].shift();
  }
}

function updateDisplay(payload, recordHistory = true) {
  if (!payload) return;

  if (payload.temperature !== undefined && payload.temperature !== null) {
    temperatureValue.textContent = formatValue(payload.temperature, '°C');
    if (recordHistory) pushHistory('temperature', payload.temperature);
  }

  if (payload.humidity !== undefined && payload.humidity !== null) {
    humidityValue.textContent = formatValue(payload.humidity, '%');
    if (recordHistory) pushHistory('humidity', payload.humidity);
  }
}

function getChartBounds() {
  return {
    width: canvas.clientWidth,
    height: canvas.clientHeight || 360,
    padding: { top: 28, right: 58, bottom: 48, left: 62 },
  };
}

function prepareCanvas() {
  const bounds = getChartBounds();
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(bounds.width * pixelRatio));
  canvas.height = Math.floor(bounds.height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return bounds;
}

function drawGridAndAxes(bounds, temperatureMin, temperatureMax) {
  const { width, height, padding } = bounds;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 1;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const temperatureTick = temperatureMax - ((temperatureMax - temperatureMin) * i) / 5;
    const humidityTick = 100 - (i * 100) / 5;
    ctx.fillStyle = '#c2410c';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${temperatureTick.toFixed(1)}°`, padding.left - 8, y + 4);
    ctx.fillStyle = '#0369a1';
    ctx.textAlign = 'left';
    ctx.fillText(`${humidityTick.toFixed(0)}%`, width - padding.right + 8, y + 4);
  }

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const records = [...history.temperature, ...history.humidity].sort((first, second) => first.time - second.time);
  for (let i = 0; i <= 4; i += 1) {
    const x = padding.left + (chartWidth / 4) * i;
    const recordIndex = Math.round((records.length - 1) * (i / 4));
    const record = records[recordIndex];
    const label = record ? new Date(record.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    ctx.fillText(label, x, height - 18);
  }
}

function drawLineSeries(series, color, yMin, yMax, bounds) {
  if (series.length < 2) return;

  const { width, height, padding } = bounds;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.beginPath();
  series.forEach((point, index) => {
    const x = padding.left + (index / Math.max(series.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((point.value - yMin) / Math.max(yMax - yMin, 1)) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function renderChart() {
  const temperatureValues = history.temperature.map((item) => item.value);
  const temperatureMin = temperatureValues.length ? Math.floor(Math.min(...temperatureValues) - 1) : 0;
  const temperatureMax = temperatureValues.length ? Math.ceil(Math.max(...temperatureValues) + 1) : 40;
  const bounds = prepareCanvas();
  const totalRecords = history.temperature.length + history.humidity.length;
  chartSummary.textContent = totalRecords
    ? `${totalRecords}件の測定データを表示中`
    : '測定データを待っています';

  if (totalRecords === 0) {
    drawGridAndAxes(bounds, temperatureMin, temperatureMax);
    return;
  }

  drawGridAndAxes(bounds, temperatureMin, temperatureMax);
  drawLineSeries(history.temperature, '#ea580c', temperatureMin, temperatureMax, bounds);
  drawLineSeries(history.humidity, '#0284c7', 0, 100, bounds);
}

socket.on('init', (payload) => {
  history.temperature.length = 0;
  history.humidity.length = 0;
  if (payload && Array.isArray(payload.history)) {
    payload.history.forEach((record) => {
      const type = record.topic.endsWith('/temperature') ? 'temperature' : 'humidity';
      pushHistory(type, record.value, Date.parse(record.timestamp));
    });
  }
  if (payload && payload.temperature !== null) {
    updateDisplay({ temperature: payload.temperature }, false);
  }
  if (payload && payload.humidity !== null) {
    updateDisplay({ humidity: payload.humidity }, false);
  }
  if (payload && payload.fan) {
    updateFanState(payload.fan);
  }
  renderChart();
});

socket.on('fan-state', updateFanState);

socket.on('sensor-data', (data) => {
  const { topic, value } = data;
  if (topic.endsWith('/temperature')) {
    updateDisplay({ temperature: value });
  }
  if (topic.endsWith('/humidity')) {
    updateDisplay({ humidity: value });
  }
  renderChart();
});

renderChart();
window.addEventListener('resize', renderChart);
