const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public/logo.png');
const outputDir = path.join(__dirname, 'public/assets');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generate() {
  try {
    // 16x16
    await sharp(inputPath)
      .resize(16, 16)
      .toFile(path.join(outputDir, 'favicon-16x16.png'));
    console.log('favicon-16x16.png generated');

    // 32x32
    await sharp(inputPath)
      .resize(32, 32)
      .toFile(path.join(outputDir, 'favicon-32x32.png'));
    console.log('favicon-32x32.png generated');

    // 180x180
    await sharp(inputPath)
      .resize(180, 180)
      .toFile(path.join(outputDir, 'favicon-180x180.png'));
    console.log('favicon-180x180.png generated');

    // apple-touch-icon.png (usually same as 180x180)
    await sharp(inputPath)
      .resize(180, 180)
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('apple-touch-icon.png generated');

    // Generate favicon.ico from 32x32 png
    const buf = await pngToIco.default(path.join(outputDir, 'favicon-32x32.png'));
    fs.writeFileSync(path.join(outputDir, 'favicon.ico'), buf);
    console.log('favicon.ico generated');
  } catch (err) {
    console.error('Error generating favicons:', err);
  }
}

generate();
