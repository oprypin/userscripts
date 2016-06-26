# ==UserScript==
# @name         SteamDB Anti-Wilson
# @description  Replace Wilson ratings with simple percentages, like on Steam store
# @version      1
# @include      https://steamdb.info/sales/*
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

lpad = (width, s)->
    s = "#s"
    while s.length < width
        s = " #s"
    s

run = !->
    $ '.table-sales tbody span.tooltipped' .each !->
        el = $ this
        tip = el.attr 'aria-label'
        result = //([0-9]+).+?([0-9]+)//.exec(tip)
        [pos, neg] = result.slice(1).map -> parse-int it
        perc = pos / (total = pos + neg)
        el.html "#{lpad(4, Math.round(perc*100))}% / #{total}"
        el.remove-class 'b'
        el.parent!.parent!.find '.b' .each !->
            $ this .css font-weight: 100 + Math.round(perc**2 * 8) * 100
        el.parent!
            .css text-align: \left
            .attr data-sort: perc.to-fixed(4)

run!
set-timeout run, 500
set-timeout run, 1000
set-interval run, 2500
