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
    console.log('TOTAL TARGETS:', targets.length);
    targets.forEach((t,i)=>{
      try{ console.log(i, t.type(), t.url()); }catch(e){}
    });
    const extTargets = targets.filter(t=>t.url() && t.url().startsWith('chrome-extension://'));
    console.log('EXTENSION TARGET COUNT:', extTargets.length);
    for(const t of extTargets){
      console.log('--- EXT TARGET ---', t.type(), t.url());
      try{
        const session = await t.createCDPSession();
        await session.send('Runtime.enable');
        session.on('Runtime.consoleAPICalled', evt=>{
          try{
            const args = (evt.args||[]).map(a=>a.value || a.description).join(' ');
            console.log('EXT_CONSOLE', t.url(), args);
          }catch(e){}
        });
        session.on('Runtime.exceptionThrown', evt=>{
          console.log('EXT_EXCEPTION', t.url(), JSON.stringify(evt));
        });
      }catch(e){
        console.log('CDP attach failed for', t.url(), e.message);
      }
    }
    console.log('Capturing logs for 5s...');
    await new Promise(r=>setTimeout(r,5000));
  }catch(e){
    console.error('ERR', e);
  }finally{
    await browser.close();
    console.log('Browser closed');
  }
})();

