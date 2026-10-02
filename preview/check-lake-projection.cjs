const assert = require('node:assert/strict');
const { camera, bounds, imageToWorld, worldToImage, screenToImage } = require('./lake-projection.js');
const aspect = 1672 / 940;
for (const [w, h] of [[1280, 720], [390, 844], [1920, 600]]) {
  for (const [x,y] of [[.2,.7],[.5,.85],[.8,.95]]) {
    const p = screenToImage(x,y,w,h,1672,940);
    const world = imageToWorld(p.x,p.y,aspect);
    assert.ok(world && world.z>0);
    const back = worldToImage(world.x,world.z,aspect);
    assert.ok(Math.abs(back.x-p.x)<1e-10 && Math.abs(back.y-p.y)<1e-10,
      'Click must project back to the same picture point after desktop/mobile cropping');
  }
}
function footprint(z) {
  const points=Array.from({length:360},(_,i)=>worldToImage(Math.cos(i*Math.PI/180)*.04,z+Math.sin(i*Math.PI/180)*.04,aspect));
  return { width:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),
    height:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)) };
}
const near=footprint(.5),far=footprint(2.5);
assert.ok(near.width/far.width>4.8 && near.width/far.width<5.3);
assert.ok(near.height/far.height>24 && near.height/far.height<27);
assert.ok(far.height/far.width < near.height/near.width * .23,
  'A distant circular world wave must compress much more vertically, not become a screen-space circle');
const dx=(bounds.maxX-bounds.minX)/255,dz=(bounds.maxZ-bounds.minZ)/191;
assert.ok((.0055/dx)**2+(.0055/dz)**2<.5,'Wave time step must satisfy the 2D stability limit');
assert.equal(imageToWorld(.5,camera.horizon,aspect),null);
console.log('Projection checks passed: crop round trips, near/far wave footprints, and wave stability.');
console.log('Same world-size wave: near/far horizontal size ratio', (near.width/far.width).toFixed(2),
  'and vertical ratio', (near.height/far.height).toFixed(2));
