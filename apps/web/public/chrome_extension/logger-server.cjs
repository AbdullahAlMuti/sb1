const http = require('http');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'debug-logs.txt');

// Clear log file on startup
fs.writeFileSync(logFile, '--- LOG SERVER STARTED ---\n');

const server = http.createServer((req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const timestamp = new Date().toISOString();
                const logLine = `[${timestamp}] ${data.message}\n`;
                console.log(logLine.trim());
                fs.appendFileSync(logFile, logLine);
            } catch (e) {
                console.error("Failed to parse log:", e);
            }
            res.writeHead(200);
            res.end('OK');
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(4005, () => {
    console.log('Log server listening on port 4005. Writing to ' + logFile);
});
