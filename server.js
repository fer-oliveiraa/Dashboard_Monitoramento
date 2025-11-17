const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));


// Definir os limites para os alertas
const thresholds = {
  cpu: 80, 
  ram: 75, 
  rps: 1500, 
  responseTime: 100, 
};

// Valores iniciais das métricas
let serverMetrics = {
  cpu: 40,
  ram: 30,
  rps: 500,
  responseTime: 20,
};


// Variável para contar os usuários online
let connectedUsers = 0;

// Quando um novo usuário conectar
io.on('connection', (socket) => {
  connectedUsers++;
  console.log(`Um usuário conectou. Total: ${connectedUsers}`);
  io.emit('userCountUpdate', connectedUsers);

  // Quando o usuário desconectar
  socket.on('disconnect', () => {
    connectedUsers--;
    console.log(`Um usuário desconectou. Total: ${connectedUsers}`);
    io.emit('userCountUpdate', connectedUsers);
  });
});

// Função que simula as métricas do servidor
function simulateMetrics() {
  const { cpu, ram, rps, responseTime } = serverMetrics;

// Lógica para variar os números
  serverMetrics.cpu = Math.min(100, Math.max(0, cpu + (Math.random() * 10 - 5)));
  serverMetrics.ram = Math.min(100, Math.max(0, ram + (Math.random() * 8 - 4)));
  serverMetrics.rps = Math.max(100, rps + (Math.random() * 200 - 100));
  serverMetrics.responseTime = Math.max(10, responseTime + (Math.random() * 10 - 5));

 
  const alerts = [];
  if (serverMetrics.cpu > thresholds.cpu) {
    alerts.push({
      metric: 'CPU',
      value: serverMetrics.cpu.toFixed(2),
      threshold: thresholds.cpu,
    });
  }
  if (serverMetrics.ram > thresholds.ram) {
    alerts.push({
      metric: 'RAM',
      value: serverMetrics.ram.toFixed(2),
      threshold: thresholds.ram,
    });
  }
  if (serverMetrics.rps > thresholds.rps) {
    alerts.push({
      metric: 'RPS',
      value: serverMetrics.rps.toFixed(0),
      threshold: thresholds.rps,
    });
  }
  if (serverMetrics.responseTime > thresholds.responseTime) {
    alerts.push({
      metric: 'Tempo de Resposta',
      value: serverMetrics.responseTime.toFixed(2),
      threshold: thresholds.responseTime,
    });
  }

  const timestamp = new Date().toISOString();
  const data = {
    metrics: {
      cpu: serverMetrics.cpu,
      ram: serverMetrics.ram,
      rps: serverMetrics.rps,
      responseTime: serverMetrics.responseTime,
    },
    alerts: alerts, 
    timestamp: timestamp,
  };

// Enviar os dados (métricas e alertas) para todo mundo
  io.emit('metricsUpdate', data);
}
setInterval(simulateMetrics, 2000);

// Função que simula a geração de logs
function simulateLogs() {
  const logTypes = ['INFO', 'WARNING', 'ERROR'];
  const messages = [
    'User 123 requested GET /api/users',
    'Database connection established',
    'Failed login attempt from IP 192.168.1.100',
    'Missing API key for request',
    'Service health check OK',
    'Cache cleared successfully',
    'High memory usage detected',
  ];

  const type = logTypes[Math.floor(Math.random() * logTypes.length)];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp: timestamp,
    level: type,
    message: message,
  };

 
  io.emit('logEntry', logEntry);
}

setInterval(simulateLogs, 3000 + Math.random() * 4000);


server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse o dashboard em http://localhost:${PORT}`);
});