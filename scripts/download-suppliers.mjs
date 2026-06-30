import fs from 'fs';
import path from 'path';
import https from 'https';

const LOGO_DIR = path.resolve('apps/marketing/public/logos');

const TO_DOWNLOAD = [
  {
    name: 'banggood.ico',
    url: 'https://www.banggood.com/favicon.ico'
  },
  {
    name: 'cjdropshipping.ico',
    url: 'https://cjdropshipping.com/favicon.ico'
  },
  {
    name: 'mercury.svg',
    url: 'https://www.vectorlogo.zone/logos/mercury/mercury-icon.svg'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      rejectUnauthorized: false // Bypasses self-signed certificate errors if any
    };
    https.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  for (const item of TO_DOWNLOAD) {
    const dest = path.join(LOGO_DIR, item.name);
    console.log(`Downloading ${item.name} from ${item.url}...`);
    try {
      await download(item.url, dest);
      console.log(`✅ Saved ${item.name} (${fs.statSync(dest).size} bytes)`);
    } catch (e) {
      console.error(`❌ Error ${item.name}:`, e.message);
    }
  }
}

main();
