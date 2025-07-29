const { chromium } = require('playwright');

async function takeScreenshot() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to localhost:3000
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    
    await page.screenshot({ 
      path: filename, 
      fullPage: true 
    });
    
    console.log(`Screenshot saved as: ${filename}`);
    
    await browser.close();
  } catch (error) {
    console.error('Error taking screenshot:', error.message);
    process.exit(1);
  }
}

takeScreenshot();