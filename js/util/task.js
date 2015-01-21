define((require, exports, module) => {

"use strict";

const spawn = function(routine, ...params) {
  return new Promise((resolve, reject) => {
    const task = routine.call(this, ...params);
    const raise = error => task.throw(error);

    const step = data => {
      try {
        const {done, value} = task.next(data);
        if (done) {
          resolve(value);
        }
        else if (value.then) {
          value.then(step, raise);
        }
        else {
          step(value)
        }
      } catch (error) {
        reject(error);
      }
    };

    step();
  });
};
exports.spawn = spawn;

const async = routine => function(...params) {
  return spawn.call(this, routine, ...params);
};
exports.async = async;

});
