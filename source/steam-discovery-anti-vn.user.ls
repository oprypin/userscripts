# ==UserScript==
# @name         Discovery Queue Anti-Trash
# @description  Skip non-games in Steam's Discovery Queue
# @version      7
# @include      *://store.steampowered.com/app/*
# @grant        none
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

ignore = do ->
    if $ '.platform_img.streamingvideo' .length
        return true
    for tag in $ 'a.app_tag' .slice 0, 7
        if $.trim(tag.inner-HTML) in [
            "Choose Your Own Adventure", "Visual Novel", "Text-Based", "FMV"
        ]
            return true
    if $.trim($ '#developers_list' .text!) in [
        "Choice of Games", "Hosted Games", "ALEKSANDER CHEPAIKIN", "Sly", "GGG Games",
        "Kedronic UAB", "Cool Girls Games", "Team Spikkeee"
    ]
        return true
    if $('#purchase_note').text!.includes "English language not supported"
        return true
    if $ '.communitylink_achivement_plusmore' .text! .match /[0-9]+/ ?.0 > 500
        return true


if ignore
    id = window.location.href.match /[0-9]+/ .0

    $ '.queue_btn_ignore .queue_btn_inactive' .hide!
    <-! $.post '/recommended/ignorerecommendation/',
        sessionid: g_sessionID, appid: id
    $ '.queue_btn_ignore .queue_btn_active' .show!
    $ '.btn_next_in_queue' .click!
