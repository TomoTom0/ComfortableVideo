const puppeteer = require('puppeteer');
const path = require('path');
(async()=>{
  const extensionPath = path.resolve(process.cwd(), 'dist');
  const chromePath = process.env.CHROME || process.env.CHROMIUM || puppeteer.executablePath();
  console.log('Using extensionPath=', extensionPath);
  console.log('Using chromePath=', chromePath);
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: {width: 1280, height: 800}
  });
  try{
    await new Promise(r=>setTimeout(r,2000));
    const targets = await browser.targets();
    const extTargets = targets.filter(t=>t.url() && t.url().startsWith('chrome-extension://'));
    if(extTargets.length===0){
      console.error('No extension target found');
      return;
    }
    // choose first extension target (service_worker)
    const t = extTargets[0];
    console.log('Attaching to', t.type(), t.url());
    const session = await t.createCDPSession();
    await session.send('Runtime.enable');
    session.on('Runtime.consoleAPICalled', evt=>{
      try{ const args = (evt.args||[]).map(a=>a.value||a.description).join(' '); console.log('BG_CONSOLE:', args); }catch(e){}
    });
    session.on('Runtime.exceptionThrown', evt=>{ console.log('BG_EXCEPTION:', JSON.stringify(evt)); });

    const expr = `(function(){
      try{
        const info = {
          url: location.href || null,
          hasCreateContextMenus: typeof createContextMenus === 'function',
          hasToggleHandler: (typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.onMessage),
          globals: Object.getOwnPropertyNames(self).slice(0,80)
        };
        info;
      }catch(e){ return {error: String(e)}; }
    })()`;

    const res = await session.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    console.log('EVALUATE RESULT:', JSON.stringify(res.result.value, null, 2));
    // keep open briefly to capture console
    await new Promise(r=>setTimeout(r,2000));
  }catch(e){
    console.error('ERR', e);
  }finally{
    await browser.close();
    console.log('Browser closed');
  }
})();

