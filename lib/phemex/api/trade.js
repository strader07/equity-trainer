const {URLS} = require('../config');
const http = require('./http');

module.exports.loadActiveOrders = function(symbol) {
  return http.get(URLS.ORDER_ACTIVE_LIST, {query: {symbol}});
};

module.exports.getAccountPositions = function(currency) {
  return http.get(URLS.ACCOUNT_POSITIONS, {query: {currency}});
};

module.exports.placeOrder = function({symbol, side, priceEp, stopPxEp, triggerType, orderQty, ordType, postOnly = false, reduceOnly = false, timeInForce = 'GoodTillCancel', stopLossEp=null}) {
  const params = {
    clOrdID: uuid_build(),
    symbol,
    side,
    priceEp,
    stopPxEp,
    triggerType,
    orderQty,
    ordType,
    postOnly,
    reduceOnly,
    timeInForce,
    stopLossEp,
  };
  return http.post(URLS.ORDER_PLACE, {params});
};

module.exports.amendOrder = function({symbol, orderID, priceEp, stopPxEp, orderQty, takeProfitEp, stopLossEp}) {
  const params = {
    symbol,
    orderID,
    priceEp,
    stopPxEp,
    orderQty,
    takeProfitEp,
    stopLossEp
  };
  return http.put(URLS.AMEND_ORDER, {query: params});
};

module.exports.cancelOrder = function(symbol, orderID) {
  return http.delete(URLS.ORDER_CANCEL, {query: {symbol, orderID}});
};

module.exports.cancelAllOrders = function(symbol, untriggered = false) {
  return http.delete(URLS.ORDER_CANCEL_ALL, {query: {symbol, untriggered}});
};

function r4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function uuid_build() {
    return `${r4()}${r4()}-${r4()}-${r4()}-${r4()}-${r4()}${r4()}${r4()}`;
  };
