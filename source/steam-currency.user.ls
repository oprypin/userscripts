# ==UserScript==
# @name         Steam currency converter
# @description  Convert the prices on Steam to USD
# @version      4
# @include      *://store.steampowered.com/*
# @include      *://steamcommunity.com/*/wishlist
# @include      https://steamdb.info/*
# @connect      currencyconverterapi.com
# @grant        GM_getValue
# @grant        GM_setValue
# @grant        GM_xmlhttpRequest
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

currencies = [{id: cur.0, pattern: cur.1, decimal: cur.2} for cur in [
    ['ARS' 'ARS$ {}' 2] # Argentine Peso
    ['CAD' 'CDN$ {}' 2] # Canadian Dollar
    ['CLP' 'CLP$ {}' 0] # Chilean Peso
    ['COP' 'COL$ {}' 0] # Colombian Peso
    ['MXN' 'Mex$ {}' 2] # Mexican Peso
    ['RUB' '{} руб.' 0] # Russian Ruble
    ['AED' '{} AED' 2] # U.A.E. Dirham
    ['CHF' 'CHF {}' 2] # Swiss Franc
    ['HKD' 'HK$ {}' 2] # Hong Kong Dollar
    ['NZD' 'NZ$ {}' 2] # New Zealand Dollar
    ['PEN' 'S/. {}' 2] # Peruvian Nuevo Sol
    ['TWD' 'NT$ {}' 2] # Taiwan Dollar
    ['AUD' 'A$ {}' 2] # Australian Dollar
    ['BRL' 'R$ {}' 2] # Brazilian Real
    ['BYN' 'Br{}'  2] # Belarusian Ruble
    ['IDR' 'Rp {}' 0] # Indonesian Rupiah
    ['KWD' '{} KD' 2] # Kuwaiti Dinar
    ['MYR' 'RM{}'  2] # Malaysian Ringgit
    ['NOK' '{} kr' 2] # Norwegian Krone
    ['PLN' '{} zł' 2] # Polish Zloty
    ['QAR' '{} QR' 2] # Qatari Riyal
    ['SAR' '{} SR' 2] # Saudi Riyal
    ['SGD' 'S${}'  2] # Singapore Dollar
    ['TRY' '{} TL' 2] # Turkish Lira
    ['UYU' '$U{}'  0] # Uruguayan Peso
    ['CNY' '¥{}'  2] # Chinese Yuan Renminbi
    ['CRC' '₡{}'  0] # Costa Rican Colon
    ['EUR' '{}€'  2] # Euro
    ['GBP' '£{}'  2] # British Pound
    ['ILS' '₪{}'  2] # Israeli New Shekel
    ['INR' '₹{}'  0] # Indian Rupee
    ['JPY' '¥ {}' 0] # Japanese Yen
    ['KRW' '₩{}'  0] # South Korean Won
    ['KZT' '{} ₸' 0] # Kazakhstani Tenge
    ['PHP' 'P{}'  2] # Philippine Peso
    ['THB' '฿{}'  2] # Thai Baht
    ['UAH' '{}₴'  0] # Ukrainian Hryvnia
    ['USD' '${}'  2] # U.S. Dollar
    ['VND' '{}₫'  0] # Vietnamese Dong
    ['ZAR' 'R{}'  2] # South African Rand
]]
to-currency = currencies.find((.id == 'USD'))

regex-escape = (.replace /[^\w\s]/g, '\\$&')

parse-amount = (.replace(' ', '').replace(',', '.') |> parse-float)

for currency in currencies
    amount-regex = "[0-9 ]+(?:[.,](?:[0-9]{2}|--))?"
    cur-regex = regex-escape currency.pattern.replace('{}', '').trim!
    currency.regex = new RegExp("#{cur-regex} ?(#{amount-regex})|(#{amount-regex}) ?#{cur-regex}")

price-containers = -> document.query-selector-all '
    #header_wallet_balance,
    .price:not(#cart_price_total), .discount_price,
    .discount_original_price, .discount_final_price,
    .game_area_dlc_price, .search_price, .search_discount,
    .table-sales td:nth-child(5)
'

get-rate = (from, to, callback)!->
    now = +(new Date())
    id = "#{from}_#{to}"
    if (GM_get-value id)?
        [rate, prev] = that
        if now < prev + (7*24*60*60*1000)  # 7 days expiration
            console.log "Currency rate cached for #{id}"
            callback(rate)
            return
    url = "https://free.currencyconverterapi.com/api/v5/convert?compact=ultra&q=#{id}"
    console.log "Getting currency rate from #{url}"
    GM_xmlhttp-request do
        method: 'GET'
        url: url
        onload: ->
            rate = JSON.parse(it.response-text)[id]
            GM_set-value id, [rate, now]
            callback(rate)

from-currency = do ->
    for item in price-containers!
        for currency in currencies
            return currency if item.inner-HTML.match currency.regex
if from-currency.id != to-currency.id
    console.log "Source currency detected as #{from-currency.id}, converting to #{to-currency.id}"
    console.log "Conversion: '#{from-currency.regex}' -> '#{to-currency.pattern}'"

    rate <-! get-rate from-currency.id, to-currency.id
    console.log "Conversion rate: #{rate}"

    run = !->
        for item in price-containers!
            item.inner-HTML .= replace from-currency.regex, ->
                amount = parse-amount(&1 ? &2) * rate
                to-currency.pattern.replace('{}', amount.to-fixed(to-currency.decimal))

    run!
    set-timeout run, 1500
    set-interval run, 3000
