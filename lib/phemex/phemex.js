
const twelvedata = require('twelvedata')

const trade = require('./api/trade')
const market = require('./api/market')
var email = require('../email');

var sendErrorEmail = email.sendErrorEmail;
var sendLimitOrderEmail = email.sendLimitOrderEmail;
var sendMarketOrderEmail = email.sendMarketOrderEmail;
var sendNotificationEmail = email.sendNotificationEmail;

function closePositions(symbol, side, accountPositions){
    positions = accountPositions.positions
    positions.forEach(async function (position){
        if (position.symbol === symbol){
            if (position.side !== side && position.side !== "None"){
                if (side === "Buy") pos = "long"
                else pos = "short"
                await trade.placeOrder({
                    symbol: symbol,
                    side: side,
                    orderQty: position["size"],
                    ordType: "Market"
                });
                msg = "Closed "+pos+" position for "+symbol+"\n"
                msg = msg + "size: " + position["size"].toString()
                sendNotificationEmail(msg)
                console.log(msg)
            }
        }
    });
}

async function get_stop_price(symbol) {
    const apiKey = process.env.TWELVEDATA_API;
    const client = twelvedata({ key: apiKey });
    symbol = symbol.replace("USD", "/USD");
    
    let params = {
        symbol: symbol,
        interval: "30min",
        outputsize: 5,
    };

    const hourbar = await client.timeSeries(params).then((data) => {
        // console.log(data)
        return data["values"][0];
    }).catch((err) => {
        console.log(err)
    });

    let stop_price = parseInt((hourbar["low"])*10000)

    return stop_price
    
}

async function get_target_profits(data) {
    const apiKey = process.env.TWELVEDATA_API;
    const client = twelvedata({ key: apiKey });
    let symbol = data["symbol"].replace("USD", "/USD");

    let params = {
        symbol: symbol,
        interval: "1week",
        outputsize: 5,
    };

    const weekbar = await client.timeSeries(params).then((data) => {
        return data["values"][0];
    }).catch((err) => {
        console.log(err)
    });

    let high = parseFloat(weekbar["high"])
    let low = parseFloat(weekbar["low"])
    let diff = high - low
    console.log("high: ", high)
    console.log("low: ", low)

    if (data["side"].toUpperCase()=="BUY") {
        let tp1 = parseInt(10000*(low+diff*0.618))
        let tp2 = parseInt(10000*(low+diff*0.786))
        let tp3 = parseInt(10000*(low+diff*1.618))
        let tp4 = parseInt(10000*(low+diff*2.618))
        let tp5 = parseInt(10000*(low+diff*3.618))
        let tp6 = parseInt(10000*(low+diff*4.236))

        let target_profits = [tp1, tp2, tp3, tp4, tp5, tp6]
        return target_profits

    } else {
        let tp1 = parseInt(10000*(high-diff*0.618))
        let tp2 = parseInt(10000*(high-diff*0.786))
        let tp3 = parseInt(10000*(high-diff*1.618))
        let tp4 = parseInt(10000*(high-diff*2.618))
        let tp5 = parseInt(10000*(high-diff*3.618))
        let tp6 = parseInt(10000*(high-diff*4.236))

        let target_profits = [tp1, tp2, tp3, tp4, tp5, tp6]
        return target_profits
    }

}

function is_triggered(mktPrice, tp0, side){
    if (side.toLowerCase() == "buy"){
        if (mktPrice > tp0) {
            return true;
        }
        return false;
    } else {
        if (mktPrice < tp0) {
            return true;
        }
        return false;
    }
}

async function trigger_monitor(targetProfits, order) {
    while (1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const tick = await market.getTicker(order["symbol"]);
        console.log(tick);
        let mktPrice = tick["data"]["markPrice"]
        console.log("market price: ", mktPrice)
        console.log("tp: ", targetProfits[0])
        console.log("side: ", order["side"])

        const isTriggered = is_triggered(mktPrice, targetProfits[0], order["side"])
        console.log("trigger: ", isTriggered)

        if (isTriggered==true)
        {
            sendNotificationEmail("\n Market price hits the first target profit.\n Lets amend the stop price to break even.")
            const accountPositions = await trade.getAccountPositions("BTC").then((res) => {
                if (res.data) return res.data;
                else {
                    sendErrorEmail("Phemex API get account balance error. Message from Phemex: " + JSON.stringify(res))
                    return res;
                }
            });
            positions = accountPositions.positions
            let avgFillPriceEp = 0
            positions.forEach(function (position) {
                if (position["symbol"] == order["symbol"]) {
                    avgFillPriceEp = position["avgEntryPriceEp"];
                    return 0
                }
            });
            console.log("Average fill price: ", avgFillPriceEp);
            if (avgFillPriceEp  > 0){
                const activeOrders = await trade.loadActiveOrders(order["symbol"]).then((res) => {
                    return res.data.rows;
                });
                let orderID = "";
                activeOrders.forEach(function (horder) {
                    if (horder["orderType"]=="Stop" && horder["symbol"]==order["symbol"] && horder["orderQty"]==0){
                        orderID = horder["orderID"];
                        return 0;
                    }
                });
                console.log("Order: ", orderID)
                const {data, error} = await trade.amendOrder({
                    symbol: order["symbol"],
                    orderID: orderID,
                    stopPxEp: avgFillPriceEp,
                }).then((res) => {
                    return res;
                });
                console.log("Order amended!");
                console.log(data)
                if (data) {
                    sendNotificationEmail("Stop price amended!\n")
                }
                else {
                    sendErrorEmail(error.msg)
                }
                
            }
            break;
        } else {
            console.log("Market price: ", mktPrice);
        }
    }
}

async function placeOrder(symbol, side, orderType) {
    await trade.cancelAllOrders(symbol, false)
    await trade.cancelAllOrders(symbol, true)
    const accountPos = await trade.getAccountPositions("BTC").then((res) => {
        if (res.data) return res.data;
        else {
            sendErrorEmail("Phemex API get account balance error. Message from Phemex: " + JSON.stringify(res))
            return res;
        }
    }); console.log(accountPos)
    closePositions(symbol, side, accountPos)

    const ticker = await market.getTicker(symbol).then(
        (res) => {
            if (res.data) { return res.data; }
            else {
                sendErrorEmail("Phemex API get ticker error. Message from Phemex: " + JSON.stringify(res))
                return null
            }
        }
    ); console.log(ticker)
    const accountPositions = await trade.getAccountPositions("BTC").then((res) => {
        if (res.data) return res.data;
        else {
            sendErrorEmail("Phemex API get account balance error. Message from Phemex: " + JSON.stringify(res))
            return res;
        }
    }); console.log(accountPositions)

    leverage = process.env.LEVERAGE
    risk = process.env.RISK
    size = Math.floor(leverage *(1-risk)*( (accountPositions.account.accountBalanceEv-accountPositions.account.totalUsedBalanceEv) / 100000000 * ticker.markPrice / 10000 ))
    if (size == 0) {
        sendErrorEmail("Not enough balance to " + side.toLowerCase() + " " + symbol)
        return null
    }
    console.log("Phemex order size: "+size.toString())

    if (orderType.toLowerCase() == "market") {
        const markPrice = await market.getTicker(symbol).then((res) => {
            return res.data["markPrice"];
        });
        let stopLossEp = parseInt((1 - (process.env.STOP_LOSS_PERC)/100)*markPrice);
        let side1 = "Sell";
        if (side.toLowerCase() == "sell") {
            stopLossEp = parseInt((1 + (process.env.STOP_LOSS_PERC)/100)*markPrice);
            side1 = "Buy"
        }
        console.log("Stop loss: ", stopLossEp);

        const {data, error} = await trade.placeOrder({
            symbol: symbol,
            side: side,
            orderQty: size,
            ordType: orderType,
            stopLossEp: stopLossEp
        });
        if (data) {
            sendMarketOrderEmail(data)
            console.log("secondary order params: ")
            console.log(data);
            let size0 = parseInt(data["orderQty"] * 0.14)
            let size1 = data["orderQty"] - size0*6
            const targetProfits = await get_target_profits(data);
            console.log(targetProfits);

            targetProfits.forEach(async function (tp){
                const {data, error} = await trade.placeOrder({
                    symbol: symbol,
                    side: side1,
                    priceEp: tp,
                    orderQty: size0,
                    ordType: "Limit"
                });
                if (data){
                    sendLimitOrderEmail(data);
                }
                else {
                    sendErrorEmail("TP limit order not placed\n" + "TP: " + tp.toString());
                }
            });
            priceEpFinal = 1000000000;
            if (side.toLowerCase()=="sell"){
                priceEpFinal = 100000000;
            }
            const finalTrade = await trade.placeOrder({
                symbol: symbol,
                side: side1,
                priceEp: priceEpFinal,
                orderQty: size1,
                ordType: "Limit"
            });
            if (finalTrade.data){
                sendLimitOrderEmail(finalTrade.data);
            } else {
                sendErrorEmail(finalTrade.error.msg);
            }
            trigger_monitor(targetProfits, data);
        }
        if (error) {
            msg = "Phemex market order failed for "+symbol+ "\n"
            msg = msg + "Here is what Phemex says: \n"+JSON.stringify(error)
            sendErrorEmail(msg)
            console.log(error);
        }
    }
    else if (orderType.toLowerCase() == "limit") {
        const orderBook = await market.loadOrderbook(symbol).then((res) => {
            if (res.data) return res.data
            return res
        }); console.log(orderBook)
        if (side.toLowerCase() == "buy") {
            priceEp = orderBook.book.bids[0][0]
        }  else { priceEp = orderBook.book.asks[0][0] }
        const {data, error} = await trade.placeOrder({
            symbol: symbol,
            side: side,
            priceEp: priceEp,
            orderQty: size,
            ordType: orderType,
        });
        if (data) {
            sendLimitOrderEmail(data)
            console.log(data);
        }
        if (error) {
            msg = "Phemex limit order failed for "+symbol+ "\n"
            msg = msg + "Here is what Phemex says: \n"+JSON.stringify(error)
            sendErrorEmail(msg)
            console.log(error);
        }
    }
    else {
        sendErrorEmail("Unknown order type in Phemex")
        console.log("Unknown order type in Phemex")
        return null
    }
}

module.exports = {
  placeOrder: placeOrder
}