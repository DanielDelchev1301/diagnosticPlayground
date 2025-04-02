const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const OBD_PORT = '/dev/ttyS0'; // Adjust for your OS (COM3 on Windows)

SerialPort.list().then(ports => {
    console.log('Available Ports:', ports);
}).catch(err => console.error('Error listing ports:', err));

const serial = new SerialPort({
    path: OBD_PORT,
    baudRate: 115200,
});

app.use(express.static('public')); // Serve frontend

serial.on('open', (data) => {
    console.log('OBD-II Connected');
    requestData(data); // Start requesting OBD data
});

// Function to request OBD-II data
function requestData(data) {
    console.log(data);
    // setInterval(() => {
    //     serial.write('010C\r'); // Request RPM
    //     serial.write('010D\r'); // Request Speed
    //     serial.write('0105\r'); // Request Coolant Temp
    // }, 2000); // Request every 2 seconds
}

// Handle data from OBD-II
serial.on('data', (data) => {
    const response = data.toString().trim();
    console.log('Raw OBD Data:', response);

    if (response.startsWith('41 0C')) {
        let rpmHex = response.split(' ').slice(2, 4).join('');
        let rpm = parseInt(rpmHex, 16) / 4;
        io.emit('update', { type: 'rpm', value: rpm });
    }

    if (response.startsWith('41 0D')) {
        let speedHex = response.split(' ')[2];
        let speed = parseInt(speedHex, 16);
        io.emit('update', { type: 'speed', value: speed });
    }

    if (response.startsWith('41 05')) {
        let tempHex = response.split(' ')[2];
        let temp = parseInt(tempHex, 16) - 40;
        io.emit('update', { type: 'coolant_temp', value: temp });
    }
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
