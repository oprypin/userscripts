# ==UserScript==
# @name         Discovery Queue Anti-VN
# @description  Skip non-games in Steam's Discovery Queue
# @version      3
# @include      http://store.steampowered.com/app/*
# @grant        none
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

ignore = do ->
    for tag in $ 'a.app_tag' .slice 0, 7
        if $.trim(tag.inner-HTML) in [
            "Choose Your Own Adventure", "Visual Novel", "Text-Based", "FMV"
        ]
            return true
    if $ '.platform_img.streamingvideo' .length
        return true

if ignore
    id = window.location.href.match /[0-9]+/ .0

    $ '.queue_btn_ignore .queue_btn_inactive' .hide!
    <-! $.post '/recommended/ignorerecommendation/',
        sessionid: g_sessionID, appid: id
    $ '.queue_btn_ignore .queue_btn_active' .show!
    $ '.btn_next_in_queue' .click!


