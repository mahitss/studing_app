const { timezoneStore } = require("./timezoneStore");

const getAdjustedDate = (dateInput = new Date()) => {
  const timezoneOffsetMinutes = timezoneStore?.getStore() || 0;
  // timezoneOffsetMinutes is the value of new Date().getTimezoneOffset() from the client.
  // Note: getTimezoneOffset() returns positive minutes for western timezones (e.g. UTC-5 is 300)
  // and negative minutes for eastern timezones (e.g. UTC+5:30 is -330).
  // So to get the local time, we subtract the offset (or add -offset).
  return new Date(dateInput.getTime() - (timezoneOffsetMinutes * 60 * 1000));
};

const todayKey = () => {
  return getAdjustedDate().toISOString().slice(0, 10);
};

const yesterdayKey = () => {
  const d = getAdjustedDate();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

module.exports = {
  getAdjustedDate,
  todayKey,
  yesterdayKey
};
