/* Shared camera and lake-plane coordinates. No DOM or rendering dependencies. */
(function (root) {
  'use strict';
  const camera = { horizon: .48, height: .20, focal: .92 };
  const bounds = { minX: -3, maxX: 3, minZ: .30, maxZ: 3.50 };
  function imageToWorld(x, y, aspect) {
    if (y <= camera.horizon) return null;
    const z = camera.height * camera.focal / (y - camera.horizon);
    return { x: (x - .5) * aspect * z / camera.focal, z };
  }
  function worldToImage(x, z, aspect, elevation = 0) {
    return { x: .5 + camera.focal * x / (aspect * z),
      y: camera.horizon + camera.focal * (camera.height - elevation) / z };
  }
  function screenToImage(x, y, width, height, photoWidth, photoHeight) {
    const cover = Math.max(width / photoWidth, height / photoHeight);
    const ratioX = width / (photoWidth * cover), ratioY = height / (photoHeight * cover);
    return { x: x * ratioX + (1 - ratioX) * (width < 600 ? .60 : .55),
      y: y * ratioY + (1 - ratioY) * .5 };
  }
  const api = { camera, bounds, imageToWorld, worldToImage, screenToImage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LakeProjection = api;
})(typeof window !== 'undefined' ? window : this);
