const MAX_DATA_POINTS = 30; 
const MAX_LOG_ENTRIES = 100; 
const MAX_ALERT_ENTRIES = 50; 


const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const userCount = document.getElementById('user-count');

const cpuValue = document.getElementById('cpu-value');
const ramValue = document.getElementById('ram-value');
const rpsValue = document.getElementById('rps-value');
const responseValue = document.getElementById('response-value');

const metricCardCPU = document.getElementById('metric-cpu');
const metricCardRAM = document.getElementById('metric-ram');
const metricCardRPS = document.getElementById('metric-rps');
const metricCardResponse = document.getElementById('metric-response');

//  Pegar os containers de log e alerta
const logsContainer = document.getElementById('logs-container');
const alertsContainer = document.getElementById('alerts-container');


const socket = io();

// Funções para formatar a hora
function formatTime(isoString) {
    try {
        return new Date(isoString).toLocaleTimeString('pt-BR');
    } catch (error) {
        console.error("Error formatting date:", isoString, error);
        return "00:00:00";
    }
}

function formatDateTime(isoString) {
    try {
        return new Date(isoString).toLocaleString('pt-BR');
    } catch (error) {
        return "--/--/---- --:--:--";
    }
}

// Função para colocar dados novos no gráfico e tirar os antigos
function addDataToChart(chart, label, data) {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset, index) => {
        dataset.data.push(data[index]);
    });

   
    if (chart.data.labels.length > MAX_DATA_POINTS) {
        chart.data.labels.shift();
        chart.data.datasets.forEach((dataset) => {
            dataset.data.shift();
        });
    }
    chart.update('none'); 
}

// Configuração dos gráficos
function createChartConfig() {
    return {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    ticks: {
                        maxTicksLimit: 8
                    }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 100 
                }
            },
            animation: false, 
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    };
}

// Criar o gráfico 1 (CPU e RAM)
const usageConfig = createChartConfig();
usageConfig.data.datasets.push(
    {
        label: 'CPU (%)',
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.3
    },
    {
        label: 'RAM (%)',
        data: [],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.3
    }
);
usageConfig.options.scales.y.suggestedMax = 100; 

const usageChart = new Chart(
    document.getElementById('usageChart'),
    usageConfig
);

// Criar o gráfico 2 (RPS e Resposta)
const requestsConfig = createChartConfig();
requestsConfig.data.datasets.push(
    {
        label: 'RPS (req/s)',
        data: [],
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        fill: true,
        tension: 0.3,
        yAxisID: 'yRps' 
    },
    {
        label: 'Tempo Resposta (ms)',
        data: [],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
        tension: 0.3,
        yAxisID: 'yResponseTime' 
    }
);


requestsConfig.options.scales.yRps = {
    type: 'linear',
    display: true,
    position: 'left',
    beginAtZero: true,
    title: {
        display: true,
        text: 'RPS'
    }
};
requestsConfig.options.scales.yResponseTime = {
    type: 'linear',
    display: true,
    position: 'right',
    beginAtZero: true,
    title: {
        display: true,
        text: 'ms'
    },
    grid: {
        drawOnChartArea: false, 
    },
};
delete requestsConfig.options.scales.y;

const requestsChart = new Chart(
    document.getElementById('requestsChart'),
    requestsConfig
);



socket.on('connect', () => {
    console.log('Conectado ao servidor Socket.io');
    statusIndicator.classList.remove('disconnected');
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Conectado';
});

socket.on('disconnect', () => {
    console.log('Desconectado do servidor Socket.io');
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusText.textContent = 'Desconectado';
});


socket.on('userCountUpdate', (count) => {
    console.log(`Usuários online: ${count}`);
    userCount.textContent = count;
});


socket.on('metricsUpdate', (data) => {
    const { metrics, alerts, timestamp } = data;
    const time = new Date(timestamp); 

    
    cpuValue.textContent = metrics.cpu.toFixed(1);
    ramValue.textContent = metrics.ram.toFixed(1);
    rpsValue.textContent = metrics.rps.toFixed(0);
    responseValue.textContent = metrics.responseTime.toFixed(1);
    
   
    addDataToChart(usageChart, time, [metrics.cpu, metrics.ram]);
    addDataToChart(requestsChart, time, [metrics.rps, metrics.responseTime]);
    
   
    metricCardCPU.classList.remove('alert');
    metricCardRAM.classList.remove('alert');
    metricCardRPS.classList.remove('alert');
    metricCardResponse.classList.remove('alert');
    
    if (alerts.length > 0) {
        alerts.forEach(alert => {
            console.warn(`ALERTA: ${alert.metric} atingiu ${alert.value} (limite: ${alert.threshold})`);
            
          
            if (alert.metric === 'CPU') metricCardCPU.classList.add('alert');
            if (alert.metric === 'RAM') metricCardRAM.classList.add('alert');
            if (alert.metric === 'RPS') metricCardRPS.classList.add('alert');
            if (alert.metric === 'Tempo de Resposta') metricCardResponse.classList.add('alert');

            
            const alertEntry = document.createElement('div');
            alertEntry.classList.add('alert-entry');
            
            const alertTimestamp = `<span class="timestamp">${formatDateTime(timestamp)}</span>`;
            const alertMessage = `<span class="message"><strong>ALERTA:</strong> ${alert.metric} atingiu ${alert.value} (limite: ${alert.threshold})</span>`;
            alertEntry.innerHTML = `${alertTimestamp}${alertMessage}`;
            
            
            alertsContainer.prepend(alertEntry);
            
            
            if (alertsContainer.children.length > MAX_ALERT_ENTRIES) {
                alertsContainer.removeChild(alertsContainer.lastChild);
            }
        });
    }
});


socket.on('logEntry', (log) => {
    const logEntry = document.createElement('div');
    
    logEntry.classList.add('log-entry', log.level); 
    
    const timestamp = `<span class="timestamp">[${formatTime(log.timestamp)}]</span>`;
    const level = `<span class="level">[${log.level}]</span>`;
    const message = `<span class="message">${log.message}</span>`;
    
    logEntry.innerHTML = `${timestamp} ${level} ${message}`;
    
   
    const isScrolledToBottom = logsContainer.scrollHeight - logsContainer.clientHeight <= logsContainer.scrollTop + 10; // 10px de margem

    logsContainer.appendChild(logEntry);
    
    
    if (logsContainer.children.length > MAX_LOG_ENTRIES) {
        logsContainer.removeChild(logsContainer.firstChild);
    }

   
    if (isScrolledToBottom) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
});