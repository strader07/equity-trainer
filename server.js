var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var trade = require('./trade');

// var cronJob = require('./cron');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
  console.log('working')
  res.send('Trading Bot is working!');
});

// webhook
app.post('/trade_notification', function (req, res) {
  let tradeNotification = req.body;
  console.log('NOTIFICATION: ', tradeNotification)
  trade(tradeNotification);
  res.sendStatus(200);
});

var server_port = process.env.PORT || 3000;

app.listen(server_port, function () {
  console.log('Phemex leverage bot is listening on port: ' + server_port);
});

// cronJob.start();

// setTimeout(function(){
//   bitmexSellOrder('XBTUSD', process.env.RETRY);
// },3000)
