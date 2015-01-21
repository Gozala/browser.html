define((require, exports, module) => {
  "use strict";

  exports.domRequestToPromise = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
});
