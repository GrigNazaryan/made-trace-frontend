function paint(ctx, path, gradient, seam) {
  const shape = new Path2D(path);
  ctx.fillStyle = gradient;
  ctx.fill(shape);
  if (seam) {
    ctx.strokeStyle = seam;
    ctx.lineWidth = 2;
    ctx.stroke(shape);
  }
}

function ramp(ctx, from, to, shades) {
  const gradient = ctx.createLinearGradient(...from, ...to);
  shades.forEach((shade, index) => gradient.addColorStop(index / (shades.length - 1), shade));
  return gradient;
}

export function manufactureMockup(ctx, type, side) {
  if (type === "mug") {
    ctx.save();
    if (side === "back") { ctx.translate(600, 0); ctx.scale(-1, 1); }
    const ceramic = ramp(ctx,[105,0],[500,0],["#aeaeae","#e2e2e2","#fafafa","#ededed","#b6b6b6"]);
    paint(ctx,"M419 204 C564 174 574 383 428 419 L417 388 C524 360 523 223 420 243 Z",ceramic,"#adadad");
    paint(ctx,"M101 177 C120 135 411 131 439 177 L428 469 C422 531 137 535 116 474 Z",ceramic,"#bdbdbd");
    paint(ctx,"M101 178 C102 114 438 111 439 177 C442 240 99 240 101 178 Z","#fdfdfd","#b5b5b5");
    paint(ctx,"M120 176 C139 134 408 133 423 175 C404 215 145 215 120 176 Z",
      ramp(ctx,[0,146],[0,217],["#8f8f8f","#dedede","#f5f5f5"]),"#c8c8c8");
    ctx.restore();
    return;
  }
  const cloth = ramp(ctx,[100,125],[499,393],["#acacac","#f5f5f5","#f0f0f0","#afafaf"]);
  const brim = ramp(ctx,[260,347],[288,484],["#999","#e7e7e7","#bdbdbd"]);
  paint(ctx,"M88 352 C104 231 168 136 292 145 C431 131 499 220 514 366 C439 417 153 415 88 352 Z",cloth,"#aaa");
  if (side === "front") {
    paint(ctx,"M91 348 C168 395 440 394 508 348 C566 398 504 483 323 514 C168 534 60 466 91 348 Z",brim,"#a2a2a2");
    ctx.strokeStyle="#b4b4b4";
    ctx.lineWidth=2;
    ctx.stroke(new Path2D("M295 151 C273 197 311 256 299 343 M103 365 C210 415 402 405 487 378 M107 415 C190 504 426 498 506 409"));
  } else {
    paint(ctx,"M197 381 C204 311 394 310 403 383 C370 413 223 413 197 381 Z","#8d8d8d","#aaa");
    paint(ctx,"M202 377 Q293 394 398 377 L399 405 Q294 419 202 405 Z","#d9d9d9","#aaa");
  }
  paint(ctx,"M275 152 C279 133 319 131 325 151 Q301 160 275 152 Z","#f3f3f3","#bdbdbd");
}
