client = require('./client');
var levelinfo = {
  account: 'SK57881330',
  instance: '28530',
  tickers: ['KCYE'],
  venues: ['IWBBEX'],
  secondsPerTradingDay: 5
};

var totalBought = 0;
var goal = 100000;

var getStockPrice = function (venue, stockname, quantity) {
  return client.orderbook({
      venue: venue,
      stock: stockname
    }).then(function (res) {
      if (res.ok) {
        var min = -1;
        var count = 0,
          i = 0;
        var asks = res.asks;
        while (asks && quantity > count) {
          if (asks.length > i) {
            console.log('I see ', asks[i].qty, ' @ ', asks[i].price)
            count = count + asks[i].qty;
            min = asks[i].price;
          } else {
            return -1;
          }
          i++;
        }
        return min;

      } else {
        console.log('getStockPrice Error:')
        console.error(res);
        return -1;
      }
    })
    .catch(function (err) {
      console.log('getStockPrice Error');
      console.error(err);
      return -1;
    });

}

var makeTrade = function () {
  if (totalBought < goal) {

    console.log('getting price');
    getStockPrice(levelinfo.venues[0], levelinfo.tickers[0], 100).then(function (myPrice) {
      if (myPrice == -1) {
        console.log('100 not for sale yet, waiting a second');
        setTimeout(makeTrade, 1000);
      } else {

        console.log('I\'d buying 1000 now @ ', myPrice);
        client.buy({
          account: levelinfo.account,
          venue: levelinfo.venues[0],
          stock: levelinfo.tickers[0],
          price: myPrice,
          quantity: 1000,
          type: 'limit'
        }).then(function (res) {
          if (res.ok) {
            if (res.qty == 0) {
              console.log('got \'em, grabbing more in a few');
              setTimeout(makeTrade, 1000);
            } else {
              console.log('got ', res.originalQty - res.qty, ', killing the order and working the list...');
              client.cancelOrder({
                venue: levelinfo.venues[0],
                stock: levelinfo.tickers[0],
                id: res.id
              }).then(function (res) {
                console.log('Done...let\'s buy again');
                setTimeout(makeTrade, 1000);
              });
            }
          } else {

            console.error(res.error);
          }
        })

      }

      console.log('priced: ', myPrice);
    });
  }
}

client.restartLevel('28530')
  .then(function (res) {
    if (res.ok) {
      client.resumeLevel('28530')
        .then(function (res) {
          if (res.ok) {

            levelinfo = res;
            makeTrade();

          } else {
            console.error(res.error);
          }
        })
        .catch(function (err) {
          console.error('resumeLevel');
          console.error(err);
        });
    } else {
      console.error(res.error);
    }
  })
  .catch(function (err) {
    console.error('startLevel');
    console.error(err);
  });
