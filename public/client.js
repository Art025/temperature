const socket = io();

const temperatureValue = document.getElementById('temperatureValue');
const humidityValue = document.getElementById('humidityValue');
const fanSwitch = document.getElementById('fanSwitch');
const fanState = document.getElementById('fanState');
const fanStatus = document.getElementById('fanStatus');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

const history = {
  temperature: [],
  humidity: [],
};

const MAX_POINTS = 30;

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

function pushHistory(type, value) {
  if (!Number.isFinite(value)) return;

  history[type].push({
    value,
    time: Date.now(),
  });

  if (history[type].length > MAX_POINTS) {
    history[type].shift();
  }
}

function updateDisplay(payload) {
  if (!payload) return;

  if (payload.temperature !== undefined && payload.temperature !== null) {
    temperatureValue.textContent = formatValue(payload.temperature, '°C');
    pushHistory('temperature', payload.temperature);
  }

  if (payload.humidity !== undefined && payload.humidity !== null) {
    humidityValue.textContent = formatValue(payload.humidity, '%');
    pushHistory('humidity', payload.humidity);
  }
}

function drawGridAndAxes() {
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 24, right: 24, bottom: 42, left: 54 };

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
  ctx.lineWidth = 1;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const tickValue = 100 - (i * 100) / 5;
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${tickValue.toFixed(0)}%`, padding.left - 8, y + 4);
  }

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i += 1) {
    const x = padding.left + (chartWidth / 4) * i;
    const label = `${i + 1}`;
    ctx.fillText(label, x, height - 18);
  }
}

function drawLineSeries(series, color, yMin, yMax, label) {
  if (series.length < 2) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 24, right: 24, bottom: 42, left: 54 };
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
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, padding.left + 6, padding.top + 12);
}

function renderChart() {
  const allValues = [...history.temperature, ...history.humidity].map((item) => item.value);

  if (allValues.length === 0) {
    drawGridAndAxes();
    return;
  }

  const minValue = Math.min(...allValues, 0) - 5;
  const maxValue = Math.max(...allValues, 100) + 5;

  drawGridAndAxes();
  drawLineSeries(history.temperature, '#f97316', minValue, maxValue, '温度');
  drawLineSeries(history.humidity, '#0ea5e9', minValue, maxValue, '湿度');
}

socket.on('init', (payload) => {
  if (payload && payload.temperature !== null) {
    updateDisplay({ temperature: payload.temperature });
  }
  if (payload && payload.humidity !== null) {
    updateDisplay({ humidity: payload.humidity });
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
