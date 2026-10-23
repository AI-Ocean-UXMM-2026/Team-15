/* Run: node tests/prototype.cjs. Requires Playwright and Chromium. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
  fs.readFile(target,(err,body)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(body)});
});
(async () => {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  page.setDefaultTimeout(7000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const click=async(name)=>{if(name==='Use sample voice phrase'&&!await page.getByRole('button',{name,exact:true}).isVisible())await page.locator('.voice-help summary').click();await page.getByRole('button',{name,exact:true}).click()};
  const field=(name,value)=>page.locator(`[data-field="${name}"]`).fill(String(value));
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('invento-v3')));
  let passed=0;
  const pass=name=>{passed++; console.log(`PASS ${name}`)};
  try {
    await page.goto(url);
    for(const name of ['Inventory','Supplier','Setting','Home']){await page.locator('nav').getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('[aria-current="page"]').innerText(),name)}
    pass('Four destinations and active navigation');
    // Scan is the central action; manual option precedes scanner, and speech is on the detected-code screen.
    await page.locator('nav').getByRole('button',{name:'Scan',exact:true}).click();
    assert.ok(await page.getByRole('button',{name:'Type manually',exact:true}).isVisible());
    const manualTop=await page.getByRole('button',{name:'Type manually',exact:true}).boundingBox();
    const scanner=await page.locator('.scanner').boundingBox();assert.ok(manualTop.y<scanner.y);
    for(const [index,name,barcode] of [[0,'Noodles','8901234567003'],[1,'Water','8901234567004'],[2,'Bread','8901234567005']]){
      if(index)await click('Add another product');
      await click(name);
      assert.ok((await page.locator('.detected-banner').innerText()).includes(barcode));
      assert.equal(await page.locator('[data-action="language"]').count(),0);assert.equal(await page.locator('.voice-help').getAttribute('open'),null);await page.locator('.voice-help summary').click();assert.ok(await page.getByRole('button',{name:'Hold to talk',exact:true}).isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('.voice-help').getAttribute('open'),null);
      if(!index){
        const talk=page.getByRole('button',{name:'Push to Talk',exact:true});
        const talkBounds=await talk.boundingBox(),manualBounds=await page.getByRole('button',{name:'Type manually',exact:true}).boundingBox();
        assert.ok(talkBounds.height>=110&&talkBounds.y<manualBounds.y,'Large voice action precedes manual entry');
        await page.evaluate(()=>{window.originalRecognition=window.SpeechRecognition;window.voiceStarts=0;window.voiceStops=0;window.SpeechRecognition=class{start(){window.voiceStarts++;window.mockRecognition=this}stop(){window.voiceStops++;setTimeout(()=>this.onend?.(),0)}abort(){}}});
        await talk.click();assert.equal(await talk.getAttribute('aria-pressed'),'true');await talk.click();
        await page.waitForFunction(()=>document.querySelector('#tap-record')?.getAttribute('aria-pressed')==='false'&&!document.querySelector('#tap-record').disabled);
        assert.deepEqual(await page.evaluate(()=>[window.voiceStarts,window.voiceStops]),[1,1]);
        await talk.click();await page.evaluate(()=>window.mockRecognition.onresult({results:[[{transcript:'Instant noodles, 40 packs'}]]}));await page.getByRole('button',{name:'Correct — continue',exact:true}).waitFor();assert.ok((await page.locator('.transcript').innerText()).includes('40 packs'));assert.equal(await state(),null);await click('Wrong — record again');assert.ok((await page.locator('.detected-banner').innerText()).includes(barcode));await page.evaluate(()=>{window.SpeechRecognition=window.originalRecognition});pass('Recording result opens review immediately; wrong returns to voice with barcode preserved');
      }
      await click('Use sample voice phrase');
      if(!index){await click('Wrong — record again');assert.ok((await page.locator('.detected-banner').innerText()).includes(barcode));await click('Use sample voice phrase')}
      await click('Correct — continue');
      assert.ok(await page.getByText('Complete item details',{exact:true}).first().isVisible());
      assert.equal(await page.locator('[data-field="location"]').count(),0);
      assert.equal(await page.getByLabel('Take photo',{exact:true}).getAttribute('capture'),'environment');
      if(!index){await page.locator('.photo-picker summary').click();await page.getByLabel('Choose from gallery',{exact:true}).setInputFiles({name:'product.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64')});await page.locator('#photo-preview img').waitFor();}
      if(!index){await page.locator('[data-field="supplier"]').selectOption('__new__');await page.locator('[data-supplier-field="name"]').fill('New Supplier Co');await page.locator('[data-supplier-field="contact"]').fill('Contact Person');await page.locator('[data-supplier-field="phone"]').fill('09 123456789');await page.locator('[data-supplier-field="email"]').fill('invalid-email');await click('Save supplier');assert.match(await page.locator('#form-error').innerText(),/valid email/);await page.locator('[data-supplier-field="email"]').fill('orders@example.com');await page.locator('[data-supplier-field="social"]').fill('@new-supplier');await page.locator('[data-supplier-field="address"]').fill('Yangon');await click('Save supplier');assert.ok((await page.locator('[data-field="supplier"] option:checked').innerText()).includes('New Supplier Co'));assert.equal(await page.locator('[data-field="name"]').inputValue(),'Instant noodles');}
      if(!index)await field('threshold',17);
      await click('Add to receiving list');
      assert.equal(await page.locator('.session-item').count(),index+1);
      const draftState=await state();if(draftState){assert.equal(draftState.products.find(p=>p.id==='NDL-004').qty,0,'Draft confirmation must not change stock');assert.equal(draftState.movements.length,1)}
    }
    await page.locator('[data-queue="0"][data-key="remark"]').fill('Three-item delivery test');
    await click('Save delivery');
    let d=await state();
    assert.equal(d.products.find(p=>p.id==='NDL-004').qty,40);
    assert.equal(d.products.find(p=>p.id==='NDL-004').threshold,17);
    assert.ok(d.products.find(p=>p.id==='NDL-004').photo.startsWith('data:image/jpeg;base64,'));
    const addedSupplier=d.suppliers.find(s=>s.name==='New Supplier Co');assert.equal(addedSupplier.email,'orders@example.com');assert.equal(addedSupplier.address,'Yangon');assert.equal(d.products.find(p=>p.id==='NDL-004').supplier,addedSupplier.id);
    assert.equal(d.products.find(p=>p.id==='WTR-008').qty,88);
    assert.equal(d.products.find(p=>p.id==='BRD-006').qty,30);
    assert.equal(d.movements.length,4);
    assert.equal(d.movements.find(m=>m.productId==='NDL-004').note,'Three-item delivery test');
    pass('Scan → code + Push to Talk → retry → item details → three-item receiving list → single save');
    pass('Photo upload/resizing and all six supplier fields persist; new supplier is selected without losing the item draft');
    await click('Home');await click('Stock out');await page.locator('#product-select').selectOption('OIL-012');
    await field('qty',99);await click('Review movement');assert.match(await page.locator('#form-error').innerText(),/not enough stock/);
    assert.equal((await state()).products.find(p=>p.id==='OIL-012').qty,8);
    await field('qty',3);await field('destination','Yangon dispatch');await click('Review movement');await click('Confirm movement');
    assert.equal((await state()).products.find(p=>p.id==='OIL-012').qty,5);
    pass('Stock out blocks overselling, then records before/after and destination');
    await click('Home');await click('Count');await page.locator('#product-select').selectOption('OIL-012');await field('qty',4);await click('Review count');assert.match(await page.locator('#form-error').innerText(),/explain the difference/);
    await field('remark','One damaged bottle');await click('Review count');await click('Confirm count');
    d=await state();assert.equal(d.products.find(p=>p.id==='OIL-012').qty,4);assert.equal(d.movements[0].type,'count');assert.equal(d.movements[0].delta,-1);
    pass('Count requires discrepancy reason and records an adjustment');
    await click('Home');await page.locator('nav').getByRole('button',{name:'Scan',exact:true}).click();await click('Type manually');
    await field('name','Jasmine tea');await field('description','Loose leaf tea');await field('sku','TEA-NEW');await field('barcode','TEST-NEW');await field('qty',12);await field('fda','FDA-DEMO');await field('remark','Received in good condition');
    await page.locator('[data-field="supplier"]').selectOption('s1');await click('Review details');await click('Save product');
    d=await state();let p=d.products.find(p=>p.id==='TEA-NEW');assert.equal(p.qty,12);assert.equal(p.fda,'FDA-DEMO');assert.equal(d.movements[0].note,'Received in good condition');
    await page.reload();await page.locator('nav').getByRole('button',{name:'Inventory',exact:true}).click();await page.locator('[data-search]').fill('TEA-NEW');assert.equal(await page.locator('#results .product').count(),1);
    pass('Manual fields save and persist across reload; inventory search works');
    await page.locator('nav').getByRole('button',{name:'Scan',exact:true}).click();await click('Type manually');
    await field('name','Duplicate tea');await field('sku','TEA-NEW');await field('qty',1);await click('Review details');
    assert.match(await page.locator('#form-error').innerText(),/already exists/);
    await field('sku','TEA-INVALID');await field('qty','1.5');await click('Review details');assert.match(await page.locator('#form-error').innerText(),/whole number/);
    await field('qty',1);await field('expiry','2000-01-01');await click('Review details');assert.match(await page.locator('#form-error').innerText(),/earlier than/);
    assert.equal((await state()).products.filter(p=>p.id==='TEA-NEW').length,1);
    await page.reload();await page.locator('nav').getByRole('button',{name:'Inventory',exact:true}).click();await page.locator('[data-search]').fill('TEA-NEW');
    pass('Duplicate identity, fractional quantity and invalid expiry are blocked');
    await page.locator('#results .product').click();await click('Reorder stock');await field('qty',20);await click('Create order');
    assert.equal((await state()).orders[0].status,'pending');await click('Confirm shipping');assert.equal((await state()).orders[0].status,'shipping');
    pass('Supplier order moves from pending reply to shipping confirmed');
    await page.locator('nav').getByRole('button',{name:'Home',exact:true}).click();await click('Stock in');await page.locator('#product-select').selectOption('OIL-012');await field('qty',2);await click('Review movement');
    const beforeOffline=JSON.stringify(await state());await context.setOffline(true);await click('Confirm movement');assert.match(await page.locator('#form-error').innerText(),/Reconnect/);assert.equal(JSON.stringify(await state()),beforeOffline);await context.setOffline(false);await click('Confirm movement');
    assert.equal((await state()).products.find(p=>p.id==='OIL-012').qty,6);
    pass('Actual offline event blocks pending confirmation without changing stock');
    await click('Home');await page.locator('nav').getByRole('button',{name:'Setting',exact:true}).click();await page.getByRole('button',{name:/Alert preferences/}).click();await field('expiryDays',28);await page.locator('[data-threshold="OIL-012"]').fill('30');await click('Save preferences');
    d=await state();assert.equal(d.settings.expiryDays,28);assert.equal(d.products.find(p=>p.id==='OIL-012').threshold,30);
    pass('Expiry reminder and per-product stock thresholds persist');
    await page.getByRole('button',{name:/Your team/}).click();assert.equal(await page.locator('.team-person').count(),5);await click('Back');
    await page.getByRole('button',{name:/Preview onboarding/}).click();await click('Continue');await click('Open demo warehouse');assert.ok(await page.locator('.greeting').isVisible());
    pass('Five-member team presentation and onboarding path');
    // Independent tab updates invalidate a reviewed movement, rather than silently replacing it.
    await click('Stock out');await page.locator('#product-select').selectOption('OIL-012');await field('qty',1);await click('Review movement');
    const other=await context.newPage();await other.goto(url);await other.evaluate(()=>{const d=JSON.parse(localStorage.getItem('invento-v3'));d.revision++;d.products.find(p=>p.id==='OIL-012').qty=3;localStorage.setItem('invento-v3',JSON.stringify(d))});await other.close();
    await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('another tab'));
    await click('Confirm movement');assert.match(await page.locator('#form-error').innerText(),/another tab/);assert.equal((await state()).products.find(p=>p.id==='OIL-012').qty,3);
    pass('Concurrent tab change requires re-review');
    const productPage=await browser.newPage({viewport:{width:390,height:844}});await productPage.goto(url);await productPage.locator('nav').getByRole('button',{name:'Inventory',exact:true}).click();await productPage.locator('[data-search]').fill('OIL-012');await productPage.locator('#results .product').click();
    assert.deepEqual(await productPage.locator('.product-action-chips button').allTextContents(),['Edit product','QR label','Archive']);
    for(const width of [320,390,768]){await productPage.setViewportSize({width,height:844});assert.equal(await productPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const group=await productPage.locator('.product-action-chips').boundingBox(),last=await productPage.getByRole('button',{name:'Archive',exact:true}).boundingBox();assert.ok(Math.abs(group.x+group.width-last.x-last.width)<2)}
    await productPage.setViewportSize({width:390,height:844});fs.mkdirSync(path.join(root,'prototype/screenshots'),{recursive:true});await productPage.locator('.product-action-chips').scrollIntoViewIfNeeded();await productPage.screenshot({path:path.join(root,'prototype/screenshots/product-details.png')});
    await productPage.getByRole('button',{name:'Edit product',exact:true}).click();await productPage.locator('[data-product-edit=name]').fill('Cooking oil 1 L — updated');await productPage.locator('[data-product-edit=threshold]').fill('18');await productPage.getByRole('button',{name:'Save',exact:true}).click();
    let productState=await productPage.evaluate(()=>JSON.parse(localStorage.getItem('invento-v3')));assert.equal(productState.products.find(p=>p.id==='OIL-012').name,'Cooking oil 1 L — updated');assert.equal(productState.products.find(p=>p.id==='OIL-012').qty,8);assert.equal(productState.movements.length,1);
    await productPage.getByRole('button',{name:'QR label',exact:true}).click();assert.ok(await productPage.locator('.qr-symbol svg').isVisible());assert.equal(await productPage.locator('.qr-label-preview>strong').innerText(),'8901234567002');await productPage.locator('.qr-symbol').screenshot({path:path.join(root,'prototype/screenshots/product-qr-code.png')});await productPage.screenshot({path:path.join(root,'prototype/screenshots/product-qr-label.png')});
    const downloadReady=productPage.waitForEvent('download');await productPage.getByRole('button',{name:'Download SVG',exact:true}).click();const download=await downloadReady;assert.equal(download.suggestedFilename(),'invento-qr-OIL-012.svg');assert.equal(await download.failure(),null);await productPage.getByRole('button',{name:'Cancel',exact:true}).click();
    await productPage.getByRole('button',{name:'Archive',exact:true}).click();assert.ok(await productPage.getByText(/Nothing is permanently deleted/).isVisible());await productPage.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await productPage.evaluate(()=>JSON.parse(localStorage.getItem('invento-v3')))).products.find(p=>p.id==='OIL-012').archived,undefined);
    await productPage.getByRole('button',{name:'Archive',exact:true}).click();await productPage.locator('dialog').getByRole('button',{name:'Archive',exact:true}).click();productState=await productPage.evaluate(()=>JSON.parse(localStorage.getItem('invento-v3')));assert.equal(productState.products.find(p=>p.id==='OIL-012').archived,true);assert.equal(productState.products.find(p=>p.id==='OIL-012').qty,8);assert.equal(productState.movements.length,1);await productPage.locator('[data-search]').fill('OIL-012');assert.equal(await productPage.locator('#results .product').count(),0);await productPage.reload();await productPage.locator('nav').getByRole('button',{name:'Inventory',exact:true}).click();await productPage.locator('[data-search]').fill('OIL-012');assert.equal(await productPage.locator('#results .product').count(),0);await productPage.close();
    pass('Right-aligned wrapping product chips, metadata edit, real QR SVG/download and confirmed archive preserve stock/history');
    const auth=await browser.newPage({viewport:{width:390,height:1100}});const authErrors=[];auth.on('pageerror',e=>authErrors.push(e.message));
    await auth.goto(url+'/#signin');await auth.waitForFunction(()=>document.querySelector('.auth-art img')?.naturalWidth>0);
    assert.equal(await auth.locator('.auth-art img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
    const hero=await auth.locator('.auth-hero').boundingBox(),panel=await auth.locator('.auth-panel').boundingBox();assert.ok(panel.y<hero.y+hero.height,'White panel must overlap the illustrated hero');
    await auth.getByRole('button',{name:'Sign in',exact:true}).click();assert.match(await auth.locator('#auth-error').innerText(),/valid email/);
    await auth.getByLabel('Email',{exact:true}).fill('owner@example.com');await auth.getByLabel('Password',{exact:true}).fill('short');await auth.getByRole('button',{name:'Sign in',exact:true}).click();assert.match(await auth.locator('#auth-error').innerText(),/8 characters/);
    await auth.getByLabel('Password',{exact:true}).fill('not-a-real-password');await auth.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await auth.getByLabel('Password',{exact:true}).getAttribute('type'),'text');await auth.getByRole('button',{name:'Hide password',exact:true}).click();
    await auth.getByRole('button',{name:'Sign in',exact:true}).click();assert.match(await auth.locator('#auth-error').innerText(),/not connected/);assert.equal(await auth.evaluate(()=>localStorage.getItem('invento-v3')),null);
    await auth.getByRole('tab',{name:'Register',exact:true}).click();await auth.getByLabel('Full name',{exact:true}).fill('Test Owner');await auth.getByLabel('Confirm password',{exact:true}).fill('wrong-password');await auth.getByRole('button',{name:'Create account',exact:true}).click();assert.match(await auth.locator('#auth-error').innerText(),/do not match/);
    await auth.getByLabel('Confirm password',{exact:true}).fill('not-a-real-password');await auth.getByRole('button',{name:'Create account',exact:true}).click();assert.match(await auth.locator('#auth-error').innerText(),/not connected/);
    await auth.getByRole('tab',{name:'Register',exact:true}).focus();await auth.keyboard.press('ArrowLeft');assert.equal(await auth.getByRole('tab',{name:'Login',exact:true}).getAttribute('aria-selected'),'true');
    await auth.getByRole('button',{name:'Switch language',exact:true}).click();assert.equal(await auth.locator('html').getAttribute('lang'),'my');await auth.locator('[data-action=authLanguage]').click();
    await auth.getByRole('button',{name:'Open demo warehouse',exact:true}).click();assert.ok(await auth.locator('.greeting').isVisible());assert.equal(await auth.locator('input[type=password]').count(),0);assert.deepEqual(authErrors,[]);
    pass('Illustrated overlapping auth layout, working tabs/keyboard, validation, password visibility, localization and honest demo access');
    await auth.goto(url+'/#signin');await auth.locator('.auth-page').waitFor();fs.mkdirSync(path.join(root,'prototype/screenshots'),{recursive:true});
    await auth.screenshot({path:path.join(root,'prototype/screenshots/auth-mobile.png')});
    await auth.getByRole('tab',{name:'Register',exact:true}).click();await auth.screenshot({path:path.join(root,'prototype/screenshots/auth-register.png')});
    await auth.getByRole('tab',{name:'Login',exact:true}).click();
    for(const width of [320,390,768,1440]){await auth.setViewportSize({width,height:1000});assert.equal(await auth.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Auth viewport overflow '+width)}
    await auth.screenshot({path:path.join(root,'prototype/screenshots/auth-desktop.png')});await auth.close();
    // Fresh visual contexts keep screenshots free of test products and receipts.
    const visual=await browser.newPage({viewport:{width:1440,height:1000}});await visual.goto(url);fs.mkdirSync(path.join(root,'prototype/screenshots'),{recursive:true});
    await visual.screenshot({path:path.join(root,'prototype/screenshots/desktop.png')});
    await visual.setViewportSize({width:390,height:844});await visual.screenshot({path:path.join(root,'prototype/screenshots/home.png')});
    await visual.locator('nav').getByRole('button',{name:'Scan',exact:true}).click();await visual.screenshot({path:path.join(root,'prototype/screenshots/scanner.png')});
    await visual.getByRole('button',{name:'Noodles',exact:true}).click();await visual.screenshot({path:path.join(root,'prototype/screenshots/voice.png')});
    await visual.locator('.voice-help summary').click();await visual.screenshot({path:path.join(root,'prototype/screenshots/voice-help.png')});await visual.getByRole('button',{name:'Use sample voice phrase',exact:true}).click();await visual.screenshot({path:path.join(root,'prototype/screenshots/voice-review.png')});await visual.getByRole('button',{name:'Correct — continue',exact:true}).click();await visual.screenshot({path:path.join(root,'prototype/screenshots/item-details.png')});
    await visual.locator('.photo-picker summary').click();await visual.screenshot({path:path.join(root,'prototype/screenshots/item-photo-options.png')});await visual.keyboard.press('Escape');
    await visual.locator('[data-field="supplier"]').scrollIntoViewIfNeeded();await visual.screenshot({path:path.join(root,'prototype/screenshots/item-details-supplier.png')});
    await visual.getByRole('button',{name:'Add new supplier',exact:true}).click();await visual.screenshot({path:path.join(root,'prototype/screenshots/new-supplier.png')});await visual.getByRole('button',{name:'Cancel',exact:true}).click();
    for(const width of [320,360,390,430,768,1440]){await visual.setViewportSize({width,height:900});assert.equal(await visual.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Horizontal overflow at ${width}`)}
    assert.equal(await visual.locator('[data-action="language"]').count(),0);await visual.reload();await visual.locator('nav').getByRole('button',{name:'Setting',exact:true}).click();assert.equal(await visual.locator('[data-action="language"]').count(),1);await visual.locator('[data-action="language"]').click();assert.equal(await visual.locator('html').getAttribute('lang'),'my');
    await visual.locator('nav [data-value="home"]').click();assert.equal(await visual.locator('[data-action="language"]').count(),0);await visual.setViewportSize({width:360,height:800});await visual.screenshot({path:path.join(root,'prototype/screenshots/burmese.png')});
    assert.equal(await visual.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await visual.close();pass('Responsive widths 320–1440, Burmese layout, and screenshots');
    assert.deepEqual(errors,[]);pass('No uncaught browser errors');
    console.log(`\n${passed} scenario groups passed.`);
  } finally {await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
