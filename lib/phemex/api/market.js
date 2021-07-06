const {URLS} = require('../config');
const http = require('./http');

module.exports.loadMarkets = function() {
  return http.get(URLS.MARKETS);
};

module.exports.loadOrderbook = function(symbol) {
  return http.get(URLS.ORDERBOOK, {query: {symbol, id: 1}});
};

module.exports.loadTrades = function(symbol) {
  return http.get(URLS.TRADES, {query: {symbol}});
};

module.exports.getTicker = function(symbol) {
  return http.get(URLS.GET_TICKER, {query: {symbol}});
};
