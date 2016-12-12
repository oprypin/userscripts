# ==UserScript==
# @name         Gmail Refresher
# @description  Periodically click Refresh in Gmail
# @version      1
# @include      https://mail.google.com/mail/*
# @run-at       document-end
# @noframes
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

xpath = (s)->
    document.evaluate(s, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).single-node-value

mouse-event = (type, el)->
    ev = document.create-event \MouseEvents
        ..init-event(type, true, true)
    el.dispatch-event ev

click = (btn)->
    mouse-event \mouseover btn
    mouse-event \mousedown btn
    mouse-event \mouseup btn
    mouse-event \click btn

refresh = ->
    set-timeout refresh,
        if btn = xpath "//div[@role='button' and text()='Refresh']"
            click btn
            console.log new Date()
            60000 * (15 + 15 * Math.random!)  # 15 to 30 minutes
        else
            1000 * (20 + 100 * Math.random!)  # 20 to 120 seconds
refresh!
