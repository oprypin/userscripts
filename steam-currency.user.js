// ==UserScript==
// @name         Steam currency converter
// @description  Convert the prices on Steam to USD
// @version      3
// @include      http://store.steampowered.com/*
// @include      http://steamcommunity.com/*/wishlist
// @include      https://steamcommunity.com/*/wishlist
// @include      https://steamdb.info/*
// @connect      currencyconverterapi.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @author       Oleh Prypin
// @namespace    http://blaxpirit.com/
// ==/UserScript==
// Generated by LiveScript 1.5.0
var currencies, res$, i$, ref$, len$, cur, toCurrency, regexEscape, parseAmount, currency, amountRegex, curRegex, priceContainers, getRate, fromCurrency, this$ = this;
res$ = [];
for (i$ = 0, len$ = (ref$ = [['ARS', 'ARS$ {}', 2], ['CAD', 'CDN$ {}', 2], ['CLP', 'CLP$ {}', 0], ['COP', 'COL$ {}', 0], ['MXN', 'Mex$ {}', 2], ['RUB', '{} руб.', 0], ['AED', '{} AED', 2], ['CHF', 'CHF {}', 2], ['HKD', 'HK$ {}', 2], ['NZD', 'NZ$ {}', 2], ['PEN', 'S/. {}', 2], ['TWD', 'NT$ {}', 2], ['AUD', 'A$ {}', 2], ['BRL', 'R$ {}', 2], ['BYN', 'Br{}', 2], ['IDR', 'Rp {}', 0], ['KWD', '{} KD', 2], ['MYR', 'RM{}', 2], ['NOK', '{} kr', 2], ['PLN', '{} zł', 2], ['QAR', '{} QR', 2], ['SAR', '{} SR', 2], ['SGD', 'S${}', 2], ['TRY', '{} TL', 2], ['UYU', '$U{}', 0], ['CNY', '¥{}', 2], ['CRC', '₡{}', 0], ['EUR', '{}€', 2], ['GBP', '£{}', 2], ['ILS', '₪{}', 2], ['INR', '₹{}', 0], ['JPY', '¥ {}', 0], ['KRW', '₩{}', 0], ['KZT', '{} ₸', 0], ['PHP', 'P{}', 2], ['THB', '฿{}', 2], ['UAH', '{}₴', 0], ['USD', '${}', 2], ['VND', '{}₫', 0], ['ZAR', 'R{}', 2]]).length; i$ < len$; ++i$) {
  cur = ref$[i$];
  res$.push({
    id: cur[0],
    pattern: cur[1],
    decimal: cur[2]
  });
}
currencies = res$;
toCurrency = currencies.find(function(it){
  return it.id === 'USD';
});
regexEscape = function(it){
  return it.replace(/[^\w\s]/g, '\\$&');
};
parseAmount = function(it){
  return parseFloat(
  it.replace(' ', '').replace(',', '.'));
};
for (i$ = 0, len$ = currencies.length; i$ < len$; ++i$) {
  currency = currencies[i$];
  amountRegex = "[0-9 ]+(?:[.,](?:[0-9]{2}|--))?";
  curRegex = regexEscape(currency.pattern.replace('{}', '').trim());
  currency.regex = new RegExp(curRegex + " ?(" + amountRegex + ")|(" + amountRegex + ") ?" + curRegex);
}
priceContainers = function(){
  return document.querySelectorAll('#header_wallet_balance,.price:not(#cart_price_total), .discount_price,.discount_original_price, .discount_final_price,.game_area_dlc_price, .search_price, .search_discount,.table-sales td:nth-child(5)');
};
getRate = function(from, to, callback){
  var now, id, that, rate, prev, url;
  now = +new Date();
  id = from + "_" + to;
  if ((that = GM_getValue(id)) != null) {
    rate = that[0], prev = that[1];
    if (now < prev + 7 * 24 * 60 * 60 * 1000) {
      console.log("Currency rate cached for " + id);
      callback(rate);
      return;
    }
  }
  url = "https://free.currencyconverterapi.com/api/v5/convert?compact=ultra&q=" + id;
  console.log("Getting currency rate from " + url);
  GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    onload: function(it){
      var rate;
      rate = JSON.parse(it.responseText)[id];
      GM_setValue(id, [rate, now]);
      return callback(rate);
    }
  });
};
fromCurrency = function(){
  var i$, ref$, len$, item, j$, ref1$, len1$, currency;
  for (i$ = 0, len$ = (ref$ = priceContainers()).length; i$ < len$; ++i$) {
    item = ref$[i$];
    for (j$ = 0, len1$ = (ref1$ = currencies).length; j$ < len1$; ++j$) {
      currency = ref1$[j$];
      if (item.innerHTML.match(currency.regex)) {
        return currency;
      }
    }
  }
}();
if (fromCurrency.id !== toCurrency.id) {
  console.log("Source currency detected as " + fromCurrency.id + ", converting to " + toCurrency.id);
  console.log("Conversion: '" + fromCurrency.regex + "' -> '" + toCurrency.pattern + "'");
  getRate(fromCurrency.id, toCurrency.id, function(rate){
    var run;
    console.log("Conversion rate: " + rate);
    run = function(){
      var i$, ref$, len$, item;
      for (i$ = 0, len$ = (ref$ = priceContainers()).length; i$ < len$; ++i$) {
        item = ref$[i$];
        item.innerHTML = item.innerHTML.replace(fromCurrency.regex, fn$);
      }
      function fn$(){
        var amount, ref$;
        amount = parseAmount((ref$ = arguments[1]) != null
          ? ref$
          : arguments[2]) * rate;
        return toCurrency.pattern.replace('{}', amount.toFixed(toCurrency.decimal));
      }
    };
    run();
    setTimeout(run, 1500);
    setInterval(run, 3000);
  });
}
