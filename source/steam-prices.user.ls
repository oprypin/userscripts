# ==UserScript==
# @name         Steam prices round-up
# @description  Round up the prices on Steam $9.99 -> $10.00
# @version      8
# @include      *://store.steampowered.com/*
# @include      *://steamcommunity.com/*/wishlist
# @include      https://steamdb.info/*
# @grant        none
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

run = !->
    for item in document.query-selector-all('
        .price:not(#cart_price_total), .discount_price,
        .discount_original_price, .discount_final_price,
        .game_area_dlc_price, .search_price, .search_discount,
        .table-sales td:nth-child(5), .steamdb_prices
    ')
        item.inner-HTML .= replace /[0-9 ]+[.,]([0-9][14689]|--)/g, (s)->
            n = parse-float s.replace(' ', '').replace(',', '.')
            n = Math.round(n * 20) / 20  # Round to nearest 5c
            n.to-fixed(2)

run!
set-timeout run, 1500
set-interval run, 3000
