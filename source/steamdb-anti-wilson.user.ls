# ==UserScript==
# @name         SteamDB Anti-Wilson
# @description  Replace Wilson ratings with simple percentages, like on Steam store
# @version      2
# @include      https://steamdb.info/sales/*
# @grant        none
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

clamp = (min, x, max)->
    return min if x < min
    return max if x > max
    x

run = !->
    $ '.table-sales tbody span.tooltipped' .each !->
        el = $ @
        tip = el.attr 'aria-label'
        result = //([0-9]+).+?([0-9]+)//.exec(tip)
        [pos, neg] = result.slice(1).map -> parse-int it
        perc = pos / (total = pos + neg)
        el.parent!.parent!.find '.b' .each !->
            $ @ .css font-weight: 100 + Math.round(perc**2 * 8) * 100
        el.text "#{clamp(0, Math.round(perc * 100), 99)}%"
            .css font-weight: clamp(100, Math.ceil(Math.log(total)/Math.log(3)) * 100, 900)
        el.parent!.attr data-sort: perc.to-fixed(4)

run!
set-timeout run, 500
set-timeout run, 1000
set-interval run, 2500
