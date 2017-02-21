# ==UserScript==
# @name         Gmail Refresher
# @description  Periodically click Refresh in Gmail
# @version      3
# @include      https://mail.google.com/mail/*
# @run-at       document-end
# @noframes
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

xpath = (s)->
    document.evaluate(s, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).single-node-value

mouse-event = (type, el)->
    ev = new MouseEvent(type)
    el.dispatch-event ev

click = (btn)->
    mouse-event \mouseover btn
    mouse-event \mousedown btn
    mouse-event \mouseup btn
    mouse-event \click btn

refresh = ->
    set-timeout refresh,
        if btn = xpath "//div[@role='button']/*[text()='Refresh']"
            click btn.parent-node
            console.log "Mail checked: #{new Date()}"
            60000 * (15 + 15 * Math.random!)  # 15 to 30 minutes
        else
            1000 * (20 + 100 * Math.random!)  # 20 to 120 seconds
refresh!
