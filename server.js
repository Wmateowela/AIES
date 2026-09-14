// Local static file server for the Aies BookShop app.
// Fixes the "Unsafe attempt to load URL file:///..." console error and
// makes Google/Firebase modules behave correctly by serving over http://
// instead of file://.
//
// Usage:  node server.js   (or double-click server.bat)
// Then open: http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
    let urlPath;
    try {
        urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch (e) {
        res.writeHead(400); res.end('Bad Request'); return;
    }
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.normalize(path.join(ROOT, urlPath));
    // Prevent path traversal outside the project folder
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found: ' + urlPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log('  Aies BookShop running at:  http://localhost:' + PORT);
    console.log('  Press Ctrl+C to stop the server.');
    console.log('--------------------------------------------------');

    // Auto-open the browser (Windows/macOS/Linux)
    const opener = process.platform === 'win32'
        ? 'start "" http://localhost:' + PORT
        : process.platform === 'darwin'
            ? 'open http://localhost:' + PORT
            : 'xdg-open http://localhost:' + PORT;
    try {
        require('child_process').exec(opener);
    } catch (e) { /* browser open is optional */ }
});