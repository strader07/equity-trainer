
if (process.env.PHEMEX_API_TYPE == 'test'){
  api_host = 'testnet-api.phemex.com'
  ws_host = 'testnet.phemex.com'
  api_key = process.env.PHEMEX_TESTAPI_KEY
  secret = process.env.PHEMEX_TESTAPI_SECRET
}
else {
  api_host = 'api.phemex.com'
  ws_host = 'phemex.com'
  api_key = process.env.PHEMEX_API_KEY
  secret = process.env.PHEMEX_API_SECRET
}

module.exports.config = {
  api_host: api_host,
  ws_host: ws_host,
  api_key: api_key,
  secret: secret,
};

module.exports.URLS = {
  API_URL: `https://${api_host}`,
  WS_URL: `ws://${ws_host}`,
  MARKETS: `/v1/exchange/public/products`,
  ORDERBOOK: `/md/orderbook`,
  TRADES: `/md/trade`,

  ORDER_ACTIVE_LIST: `/orders/activeList`,
  ORDER_PLACE: `/orders`,
  AMEND_ORDER: `/orders/replace`,
  ORDER_CANCEL: `/orders/cancel`,
  ORDER_CANCEL_ALL: `/orders/all`,
  GET_TICKER: `/md/ticker/24hr`,
  ACCOUNT_POSITIONS: `/accounts/accountPositions`
};