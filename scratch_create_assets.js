const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Minimal 1x1 transparent/solid PNG base64
const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngData);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), pngData);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), pngData);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), pngData);

console.log('Mock placeholder assets created successfully.');
