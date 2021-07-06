require('dotenv').config();

var phemex = require('./lib/phemex/phemex');
var binance = require('./lib/binance');
var email = require('./lib/email');

var binanceAPI = require('node-binance-api')().options({
    APIKEY: process.env.BINANCE_API_KEY,
    APISECRET: process.env.BINANCE_API_SECRET
});

var phemexPairs = ["BTCUSD", "ETHUSD", "LINKUSD", "XTZUSD", "LTCUSD", "GOLDUSD", "LENDUSD", "UNIUSD", "XRPUSD", "ADAUSD", "YFIUSD", "ALGOUSD", "BCHUSD", "COMPUSD", "DOTUSD"];
var sides = ["BUY", "SELL"]
var binancePairs

function getBinanceTickers() {
    binanceAPI.prices((error, ticker) => {
        if (error) {
            console.log(error);
            return
        }
        if (ticker) {
            binancePairs = Object.keys(ticker)
            console.log(binancePairs)
        }
    });
}

getBinanceTickers();

var phemexOrder = phemex.placeOrder;
var binanceOrder = binance.placeOrder;

function trade(tradeNotification) {
    exchange = tradeNotification["exchange"].toLowerCase();
    symbol = tradeNotification["symbol"].toUpperCase();
    side = tradeNotification["side"].toUpperCase();
    if ("orderType" in tradeNotification) {
        orderType = tradeNotification["orderType"]
        orderType = orderType.charAt(0).toUpperCase() + orderType.slice(1)
    } else {
        orderType = process.env.PHEMEX_ORDER_TYPE
    }

    if (!sides.includes(side)){
        email.sendTextErrorEmail("Bot could not identify whether to buy or sell based on the text message. Make sure each text includes the string 'buy' or 'sell' (not case sensitive). Here is the message you sent: \n" + JSON.stringify(tradeNotification))
        return
    }
    if (exchange == "binance"){
        if (binancePairs.includes(symbol)){
            binanceOrder(symbol, side, process.env.BINANCE_ORDER_TYPE, process.env.RETRY)
            return
        }
        email.sendTextErrorEmail("Binance bot could not identify a pair to buy or sell based on the text message. Make sure each text includes a pair string WITHOUT a '/', like so 'ethpax' (not case sensitive). Here is the message you sent: \n" + JSON.stringify(tradeNotification))
        return
    }
    if (exchange == "phemex"){
        if (phemexPairs.includes(symbol)){
            side = side.charAt(0).toUpperCase() + side.slice(1).toLowerCase()
            phemexOrder(symbol, side, orderType)
            return
        }
        email.sendTextErrorEmail("Bitmex bot could not identify a pair to buy or sell based on the text message. Make sure each text includes a pair string WITHOUT a '/', like so 'ethpax' (not case sensitive). Here is the message you sent: \n" + JSON.stringify(tradeNotification))
        return
    }
    email.sendTextErrorEmail("Bot could not identify which exchange to use based on the text message. Please make sure each text includes 'bitmex' or 'binance' (this is not case sensitive). Here is the message you sent: \n" + JSON.stringify(tradeNotification));
    return
}

module.exports = trade;