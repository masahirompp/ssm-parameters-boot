// https://zenn.dev/teppeis/articles/2022-07-npm-dual-pacakge-cjs-proxy
// Proxy for exported async functions
const asyncFunctions = ['bootstrap'];
asyncFunctions.forEach(name => {
  module.exports[name] = (...args) =>
    import('./lib/src/index.js').then(ns => ns[name](...args));
});
