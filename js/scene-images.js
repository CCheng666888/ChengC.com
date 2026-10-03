(() => {
  'use strict';
  // file:// photos can display in CSS while being rejected as WebGL textures.
  // Classic scripts carry the same image bytes as data URLs for local HTML use.
  const scriptURL = document.currentScript.src;
  const images = new Map(), pending = new Map();
  const bundles = {day: 'scene-day-data.js', night: 'scene-night-data.js', dayMobile: 'scene-day-mobile-data.js', nightMobile: 'scene-night-mobile-data.js'};

  function embeddedImage(key) {
    if (!Object.hasOwn(bundles, key)) return Promise.reject(new Error('Unknown scene image'));
    if (images.has(key)) return Promise.resolve(images.get(key));
    if (pending.has(key)) return pending.get(key);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(bundles[key], scriptURL).href;
      script.async = true;
      script.onload = () => {
        script.remove();
        if (images.has(key)) resolve(images.get(key));
        else reject(new Error('Scene image bundle is incomplete'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Scene image bundle is missing'));
      };
      document.head.appendChild(script);
    });
    pending.set(key, promise);
    promise.catch(() => pending.delete(key));
    return promise;
  }

  window.SceneImages = Object.freeze({
    register(key, dataURL) {
      if (!Object.hasOwn(bundles, key) || !/^data:image\/(?:webp|png);base64,/.test(dataURL)) {
        throw new Error('Invalid scene image bundle');
      }
      images.set(key, dataURL);
    },
    async assign(image, source, key, embedded = location.protocol === 'file:') {
      if (!source) throw new Error('Scene image URL is missing');
      image.src = embedded ? await embeddedImage(key) : new URL(source, document.baseURI).href;
    }
  });
})();
