export function polyfillPromiseWithResolvers() {
  // @ts-expect-error
  Promise.withResolvers = function () {
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    return {
      promise,
      resolve,
      reject,
    };
  };
}
