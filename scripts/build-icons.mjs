import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PawPrint } from 'lucide-react';
// Use the header's paw and gold background, with opaque edges for iOS.
const paw = renderToStaticMarkup(createElement(PawPrint, { x: 12, y: 12, width: 40, height: 40, color: '#24352c', strokeWidth: 1.8 }));
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f1c866"/>${paw}</svg>`;
await writeFile('public/favicon.svg', logo);
const browser = await chromium.launch({ channel: 'chrome' });
for (const [size, filename] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:#f1c866}body>svg{width:100vw;height:100vh;display:block}</style>${logo}`);
  await page.screenshot({ path: `public/${filename}` });
  await page.close();
}
await browser.close();
