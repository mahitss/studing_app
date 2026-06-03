const { AsyncLocalStorage } = require("async_hooks");

const timezoneStore = new AsyncLocalStorage();

module.exports = {
  timezoneStore
};
