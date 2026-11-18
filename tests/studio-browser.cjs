
const {chromium}=require(process.env.MT_PLAYWRIGHT || "playwright");
const assert=require("node:assert/strict");
const path=require("node:path");
const URL="http://127.0.0.1:4212";
const localeMatrix=["en","ru","hy","de","fr"];
async function checkUploadLabel(page) {
 const upload=page.locator(".artwork-drop");
 const contained=await upload.evaluate(button=>{
   const outer=button.getBoundingClientRect();
   return [...button.children].every(child=>{
     const inner=child.getBoundingClientRect();
     return inner.left>=outer.left-1&&inner.right<=outer.right+1&&child.scrollWidth<=child.clientWidth+1;
   });
 });
 assert.ok(contained, "upload labels must fit");
}
async function signIn(page,email){
 await page.getByRole("textbox",{name:"Email",exact:true}).fill(email);
 await page.getByRole("textbox",{name:"Password",exact:true}).fill("Fixture ONLY 2026");
 await page.getByRole("button",{name:"Log in",exact:true}).click();
}
(async()=>{
 const browser=await chromium.launch({timeout:12000});
 try{
  const context=await browser.newContext({viewport:{width:430,height:932},hasTouch:true});
  await context.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:")?r.continue():r.abort());
  const page=await context.newPage(); page.setDefaultTimeout(6500);
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL+"/#/pricing");
  await page.locator(".classic-pricing .plan-card").first().waitFor();
  assert.equal(await page.locator(".classic-pricing .plan-card").count(),2);
  assert.match(await page.locator(".classic-pricing .plan-price").first().innerText(),/39/);
  assert.match(await page.locator(".classic-pricing .plan-price").last().innerText(),/59/);
  assert.equal(await page.getByText("Planned",{exact:true}).count(),8);
  assert.equal(await page.getByText("Growth only",{exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
  await page.goto(URL);
  const menu=page.getByRole("button",{name:"Menu",exact:true});
  await menu.click();
  await page.locator(".menu-backdrop").click({position:{x:10,y:880}});
  assert.equal(await menu.getAttribute("aria-expanded"),"false");
  await menu.click();
  await page.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"),"false");
  assert.ok(await menu.evaluate(b=>document.activeElement===b));
  console.log("Mobile menu: background click and Escape close it; focus returns");
  assert.equal(await page.locator(".hero-list").count(),2);
  await page.locator(".section .studio-card").first().waitFor();
  await page.getByRole("link",{name:/Discover workshops/}).click();
  await page.locator("#directory-search").fill("Tset City");
  await page.getByRole("button",{name:"Clear filters"}).click();
  await page.getByRole("link",{name:"View workshop",exact:true}).click();
  await page.getByRole("link",{name:/Preview mug/}).click();
  await page.locator(".order-catalog").waitFor();
  for(const width of [320,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:932});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth), 0);
  }
  await page.setViewportSize({width:430,height:932});
  const previews={};
  for(const type of ["cap","mug"]){
   const thumbnail=page.locator(".order-catalog canvas[aria-label^='Preview "+type+"']").first();
   await thumbnail.waitFor();
   await page.waitForFunction(kind=>{
     const c=document.querySelector(".order-catalog canvas[aria-label^='Preview "+kind+"']");
     return c && c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
   },type);
   previews[type]=await thumbnail.evaluate(c=>{
    const data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
    let left=c.width,top=c.height,right=-1,bottom=-1;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>0){
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    return [left,top,right,bottom];
   });
   const [l,t,r,b]=previews[type];
   assert.ok(l>0&&t>0&&r<239&&b<259&&b>130);
  }
  console.log("Contained product mockups:",JSON.stringify(previews));
  const swatch=page.locator(".order-swatch").first();
  const size=await swatch.boundingBox();
  assert.ok(size.width>=44&&size.height>=44);
  assert.equal(await swatch.getAttribute("aria-pressed"),"true");
  await page.getByRole("button",{name:"Design this item",exact:true}).click();
  assert.equal(await page.locator(".order-catalog").count(),0);
  await page.getByRole("button",{name:/Add text/}).click();
  const strip=page.locator(".editor-mobile-strip");
  const textTool=strip.getByRole("button",{name:"Text",exact:true});
  const fontTool=strip.getByRole("button",{name:"Font",exact:true});
  const layersTool=strip.getByRole("button",{name:"Layers",exact:true});
  await strip.waitFor();
  const touch=await context.newCDPSession(page);
  const bounds=await strip.boundingBox();
  for(const [type,x] of [["touchStart",bounds.x+bounds.width-16],["touchMove",bounds.x+bounds.width-96],
    ["touchMove",bounds.x+80],["touchMove",bounds.x+24],["touchEnd",0]]){
    await touch.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y:bounds.y+29}]});
  }
  assert.ok(await strip.evaluate(el=>el.scrollLeft>0));
  await textTool.click();
  const textbox=page.getByRole("textbox",{name:"Text",exact:true});
  await textbox.fill("First layer");
  await fontTool.click();
  await page.locator(".editor-font-list input").fill("Caveat");
  const font=page.getByRole("button",{name:"Caveat",exact:true});
  assert.match(await font.evaluate(el=>getComputedStyle(el).fontFamily),/^Caveat/);
  await font.click();
  assert.equal(await page.evaluate(async()=> (await document.fonts.load("16px Caveat","Aa Привет")).length > 0),true);
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  await page.getByRole("button",{name:"125%",exact:true}).waitFor();
  await page.getByRole("button",{name:"125%",exact:true}).click();
  const guides=page.getByRole("button",{name:"Print guides",exact:true});
  await guides.click();
  assert.equal(await page.locator(".editor-stage canvas").getAttribute("data-guides"),"false");
  await guides.click();
  await page.locator(".studio-swatch").last().click();
  await textTool.click();
  assert.equal(await textbox.inputValue(),"First layer");
  assert.equal(await page.locator(".studio-swatch").last().getAttribute("aria-pressed"),"true");
  await page.getByRole("button",{name:/Add text/}).click();
  await textTool.click();
  await textbox.fill("Second layer");
  await layersTool.click();
  assert.equal(await page.locator(".layer-choice").count(),2);
  await page.getByRole("button",{name:"First layer",exact:true}).click();
  await page.getByRole("button",{name:"Bring forward",exact:true}).click();
  assert.equal(await page.locator(".layer-choice").first().innerText(),"First layer");
  const canvas=page.locator(".editor-stage canvas");
  await canvas.scrollIntoViewIfNeeded();
  async function emptyGesture(move){
   await canvas.evaluate((c,move)=>{
    const box=c.getBoundingClientRect();
    const event=(name,y)=>c.dispatchEvent(new PointerEvent(name,{bubbles:true,button:0,isPrimary:true,pointerType:"touch",pointerId:72,clientX:box.left+6,clientY:y}));
    event("pointerdown",box.top+12);
    if(move) event("pointermove",box.top+58);
    event("pointerup",box.top+(move?58:12));
   },move);
  }
  await emptyGesture(true);
  assert.equal(await page.getByRole("button",{name:"Bring forward",exact:true}).count(),1);
  await emptyGesture(false);
  assert.equal(await page.getByRole("button",{name:"Bring forward",exact:true}).count(),0);
  await page.locator(".design-editor input[type=file]").setInputFiles(path.join(__dirname, "../public/mockups/thumbnails/hoodie.png"));
  await layersTool.click();
  await page.waitForFunction(()=>document.querySelectorAll(".layer-choice").length===3);
  console.log("Pointer touch events preserve selection during an empty swipe and clear it on an empty tap. PNG upload creates a layer");
  const layout=[];
  for(const width of [320,360,375,390,393,414,428,430,768,1024,1280,1440,1920]){
   await page.setViewportSize({width,height:932});
   const metrics=await page.evaluate(()=>{const d=document.documentElement,c=document.querySelector(".editor-stage canvas"),p=document.querySelector(".editor-properties");return [innerWidth,d.scrollWidth-d.clientWidth,Math.round(c.getBoundingClientRect().width),getComputedStyle(p).position];});
   layout.push(metrics);
   assert.ok(metrics[1]===0&&metrics[2]>100&&metrics[3]===(width<=700?"fixed":"static"));
  }
  await page.setViewportSize({width:844,height:390});
  assert.ok(await page.evaluate(()=>matchMedia("(pointer: coarse)").matches));
  assert.equal(await page.locator(".editor-properties").evaluate(node=>getComputedStyle(node).position),"fixed");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
  console.log("Editor viewport matrix:",JSON.stringify(layout), "and 844×390 landscape");
  await page.setViewportSize({width:430,height:932});
  await page.getByRole("button",{name:"Finish editing",exact:true}).click();
  assert.equal(await page.locator(".order-catalog").count(),1);
  assert.equal(await page.locator(".order-item-summary").count(),1);
  assert.ok(await page.evaluate(()=>document.activeElement?.id.startsWith("edit-line-")));
  await page.getByRole("button",{name:"Send request",exact:true}).click();
  await page.getByRole("heading",{name:"Log in"}).waitFor();
  await signIn(page,"buyer@example.com");
  await page.locator(".order-item-summary").waitFor();
  await menu.click();
  await page.getByRole("link",{name:"My orders",exact:true}).click();
  await page.getByRole("heading",{name:"Unfinished orders",exact:true}).waitFor();
  const orderLink=page.locator('a[href*="#/orders/"], a[href*="#/portal/"]').first();
  if (await orderLink.count() > 0) {
   await orderLink.click();
   await page.locator(".progress-card").waitFor();
   assert.equal(await page.locator(".journey-dot svg").count(),4);
   await page.goBack();
   await page.getByRole("heading",{name:"Unfinished orders",exact:true}).waitFor();
  }
  await page.getByRole("link",{name:/Continue draft/}).click();
  await page.locator(".order-item-summary").waitFor();
  await page.getByRole("button",{name:/Edit design|Design this item|Artwork added/}).first().click();
  for (const locale of localeMatrix) {
    await page.setViewportSize({width:390,height:844});
    await page.locator(".mobile-menu").click();
    await page.locator("#header-menu select").selectOption(locale);
    await page.keyboard.press("Escape");
    for(const width of [320,390,768,1280]){
      await page.setViewportSize({width,height:844});
      await checkUploadLabel(page);
    }
  }
  console.log("Upload labels fit in EN/RU/HY/DE/FR at 320, 390, 768 and 1280 px");
  console.log("Two layers reordered; editor restores cart focus; draft resumes after login and from My orders");
  const shop=await browser.newPage({viewport:{width:430,height:932},hasTouch:true});
  await shop.route("**/api/auth/options",route=>route.fulfill({json:{google:true,recovery:false,localOutbox:true}}));
  await shop.goto(URL+"/#/register");
  await shop.locator(".google-sign-in img").waitFor();
  await shop.waitForFunction(()=>document.querySelector(".google-sign-in img")?.naturalWidth > 0);
  await shop.getByRole("textbox",{name:"Full name",exact:true}).fill("Synthetic Tester");
  await shop.getByRole("textbox",{name:"Email",exact:true}).fill(`browser-${Date.now()}@example.com`);
  await shop.locator('input[autocomplete="new-password"]').fill("Fixture registration 2026");
  await shop.locator('.registration-form button[type="submit"]').click();
  await shop.getByText(/saves the verification code to its test mailbox/).waitFor();
  await shop.goto(URL+"/#/login");
  await signIn(shop,"workshop@example.com");
  await shop.locator(".overview-priority").first().waitFor();
  assert.equal(await shop.locator(".overview-priority").count(),4);
  await shop.locator(".overview-priority").first().click();
  assert.equal(await shop.locator(".overview-priority").first().getAttribute("aria-pressed"),"true");
  const pick=shop.locator(".workspace-section-picker select");
  await pick.waitFor();
  await pick.selectOption("orders");
  await shop.locator(".workspace-order-link").first().click();
  const sections=shop.locator(".order-section-bar button");
  await sections.first().waitFor();
  assert.equal(await sections.count(),4);
  await sections.nth(1).click();
  await shop.getByRole("button",{name:"Download artwork (.zip)"}).waitFor();
  await shop.getByRole("button",{name:"Edit artwork"}).first().click();
  await shop.locator(".editor-studio").waitFor();
  await sections.nth(2).click();
  await shop.getByRole("button",{name:"Save schedule"}).waitFor();
  await sections.nth(3).click();
  await shop.getByRole("button",{name:"Send", exact:true}).waitFor();
  let messageRequests=0;
  let submittedMessage="";
  const failedMessage = async route => {
    if (route.request().method()!=="POST") return route.continue();
    messageRequests += 1;
    submittedMessage=route.request().postDataJSON().text;
    if (messageRequests===1) return route.fulfill({status:503,json:{detail:"network_error"}});
    return route.continue();
  };
  await shop.route("**/api/orders/*/messages",failedMessage);
  const compose=shop.getByPlaceholder("Write a message…");
  const uniqueMessage="UI retry fixture "+Date.now();
  await compose.fill(uniqueMessage);
  await compose.press("Shift+Enter");
  await compose.pressSequentially("second line");
  assert.equal(await compose.inputValue(),uniqueMessage+"\nsecond line");
  await compose.dispatchEvent("keydown",{key:"Enter",isComposing:true});
  assert.equal(messageRequests,0);
  await compose.press("Enter");
  await shop.locator(".message-composer [role=alert]").waitFor();
  assert.equal(await compose.inputValue(),submittedMessage);
  await compose.press("Enter");
  await shop.waitForFunction(()=>document.querySelector('textarea[placeholder="Write a message…"]').value==="");
  assert.equal(messageRequests,2);
  const sentMessage=shop.locator(".message").filter({hasText:uniqueMessage});
  await sentMessage.waitFor();
  assert.equal(await sentMessage.count(),1);
  assert.ok((await sentMessage.textContent()).includes("second line"));

  const failedNote = route=>route.fulfill({status:503,json:{detail:"network_error"}});
  await shop.route("**/api/workspace/orders/*/notes",failedNote);
  const noteComposer=shop.locator(".message-composer").nth(1);
  await noteComposer.getByRole("textbox").fill("Synthetic private note");
  await noteComposer.getByRole("button").click();
  await noteComposer.getByRole("alert").waitFor();
  assert.equal(await noteComposer.getByRole("textbox").inputValue(),"Synthetic private note");
  await shop.unroute("**/api/workspace/orders/*/notes",failedNote);
  await noteComposer.getByRole("button").click();
  await shop.getByText("Synthetic private note",{exact:true}).waitFor();
  assert.equal(await shop.locator(".editor-studio").isVisible(),false);
  await sections.nth(1).click();
  assert.equal(await shop.locator(".editor-studio").isVisible(),true);
  await pick.selectOption("products");
  await shop.getByRole("button",{name:/New product/}).click();
  const preview=shop.locator(".workshop-live-preview");
  await preview.getByRole("heading",{name:"Storefront preview",exact:true}).waitFor();
  await shop.getByRole("textbox",{name:"Name",exact:true}).fill("Live test mug");
  await shop.getByRole("textbox",{name:"Description",exact:true}).fill("Preview shown before saving");
  await shop.getByLabel("Mockup type").selectOption("mug");
  await shop.getByRole("spinbutton",{name:"Selling price",exact:true}).fill("24.5");
  assert.match(await preview.innerText(),/Live test mug/);
  assert.match(await preview.innerText(),/Preview shown before saving/);
  assert.match(await preview.innerText(),/24[.,]50/);
  assert.match(await preview.innerText(),/One size/);
  const mockup = shop.getByLabel("Mockup type");
  const category = shop.getByRole("textbox",{name:"Category",exact:true});
  await mockup.selectOption("tee");
  assert.equal(await category.inputValue(),"Apparel");
  assert.match(await preview.innerText(),/S · M · L · XL/);
  await category.fill("Custom category");
  await mockup.selectOption("mug");
  assert.equal(await category.inputValue(),"Custom category");
  await shop.locator('.product-form-preview-layout input[type="file"]').setInputFiles(path.join(__dirname, "../public/mockups/thumbnails/hoodie.png"));
  await shop.getByText("Photo upload failed. Try again or discard the pending photo.",{exact:true}).waitFor();
  await preview.locator('img[src^="blob:"]').waitFor();
  await shop.getByRole("button",{name:"Discard pending photo",exact:true}).click();
  assert.equal(await preview.locator('img[src^="blob:"]').count(),0);
  assert.equal(await shop.locator(".styled-file-name").count(),0);
  await shop.locator('.product-form-preview-layout input[type="file"]').setInputFiles({
    name:"corrupted.png",mimeType:"image/png",buffer:Buffer.from([137,80,78,71,13,10,26,10,0]),
  });
  await shop.getByText("This file could not be read as a supported image.",{exact:true}).waitFor();
  await preview.getByRole("button",{name:"#0d1b2a",exact:true}).click();
  assert.equal(await preview.getByRole("button",{name:"#0d1b2a",exact:true}).getAttribute("aria-pressed"),"true");
  for(const width of [320,390,768,1280]){
    await shop.setViewportSize({width,height:844});
    assert.equal(await shop.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
  }
  await shop.setViewportSize({width:430,height:932});
  const swatches=shop.locator(".editable-color");
  assert.equal(await swatches.count(),2);
  await swatches.first().locator(".catalog-color").click();
  assert.equal(await swatches.count(),2);
  await swatches.first().locator(".catalog-color").click({button:"right"});
  await shop.getByRole("button",{name:"Remove #ffffff",exact:true}).click();
  assert.equal(await swatches.count(),1);
  await swatches.first().locator(".catalog-color").dispatchEvent("pointerdown",{pointerType:"touch",clientX:10,clientY:15});
  await shop.getByRole("button",{name:"Remove #0d1b2a",exact:true}).waitFor();
  await swatches.first().locator(".catalog-color").dispatchEvent("pointerup",{pointerType:"touch"});
  await shop.getByRole("button",{name:"Remove #0d1b2a",exact:true}).click();
  assert.equal(await swatches.count(),0);
  await shop.getByText("Print area",{exact:true}).last().click();
  await shop.locator("details.settings-disclosure[open]").waitFor();
  await shop.getByRole("button",{name:"Choose or drop a file",exact:true}).waitFor();

  shop.once("dialog",dialog=>dialog.accept());
  await pick.selectOption("billing");
  await shop.getByRole("radio",{name:/Growth/}).check();
  assert.ok(await shop.getByRole("radio",{name:/Growth/}).isChecked());

  await shop.route("**/api/workspace/orders?**",route=>{
    const query=new globalThis.URL(route.request().url()).searchParams;
    if (!query.has("calendarStart")) return route.continue();
    const day=query.get("calendarStart");
    return route.fulfill({json:Array.from({length:5},(_,index)=>({
      id:"MT-test-"+index,status:"production",title:"Long calendar test order ".repeat(6),
      schedule:{productionStart:day,productionDue:day,promisedDate:day}
    }))});
  });
  await pick.selectOption("calendar");
  await shop.getByRole("heading",{name:"Production calendar"}).waitFor();
  const firstCell=shop.locator(".calendar-cell").first();
  await firstCell.getByText("+3 more",{exact:true}).waitFor();
  const sizes=await shop.locator(".calendar-cell").evaluateAll(cells=>[...new Set(cells.map(cell=>cell.getBoundingClientRect().height))]);
  assert.equal(sizes.length,1);
  await firstCell.dblclick({position:{x:4,y:118}});
  const dayDialog=shop.getByRole("dialog");
  await dayDialog.waitFor();
  assert.equal(await dayDialog.getByRole("link").count(),5);
  await shop.keyboard.press("Escape");
  assert.equal(await dayDialog.isVisible(),false);
  await firstCell.getByText("+3 more",{exact:true}).click();
  assert.equal(await dayDialog.getByRole("link").count(),5);
  await dayDialog.getByRole("button",{name:"Close",exact:true}).click();
  await shop.getByRole("button",{name:"Day",exact:true}).click();
  await shop.locator(".calendar-day .calendar-cell").waitFor();
  console.log("Right-click and long press remove colors through confirmation; calendar keeps fixed cells and opens five orders");
  assert.equal(await pick.inputValue(),"calendar");
  console.log("Workshop mobile section picker opens Calendar");
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
