# ==UserScript==
# @name         Click through Steam discovery queue
# @description  Automatically click "next" in Steam's Discovery Queue
# @version      3
# @include      *://store.steampowered.com/app/*
# @grant        none
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

window.add-event-listener \load ->
    evt = new MouseEvent \click, view: window, bubbles: true, cancelable: false
    document.query-selector '.btn_next_in_queue' .dispatch-event evt
