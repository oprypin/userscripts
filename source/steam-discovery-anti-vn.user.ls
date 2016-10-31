# ==UserScript==
# @name         Discovery Queue Anti-VN
# @description  Skip Visual Novels and CYOAs in Steam's Discovery Queue
# @version      2
# @include      http://store.steampowered.com/app/*
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

ignore = do ->
    for tag in $ 'a.app_tag' .slice 0, 7
        if $.trim(tag.inner-HTML) in [
            "Choose Your Own Adventure", "Visual Novel"
        ]
            return true
    if $ '.platform_img.streamingvideo' .length
        return true

if ignore
    id = window.location.href.match //[0-9]+// .0

    $ '.queue_btn_ignore .queue_btn_inactive' .hide!
    <-! $.post '/recommended/ignorerecommendation/',
        sessionid: g_sessionID, appid: id
    $ '.queue_btn_ignore .queue_btn_active' .show!
    $ '.btn_next_in_queue' .click!


