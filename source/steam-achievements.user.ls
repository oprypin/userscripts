# ==UserScript==
# @name         Steam achievements page improvements
# @description  Show descriptions of hidden achievements for games you own
# @version      1
# @include      http://steamcommunity.com/stats/*/*
# @include      http://steamcommunity.com/*/stats/*
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

new-row = '
    <div class="achieveRow">
        <div class="achieveImgHolder">
            <img width="64" height="64">
        </div>
        <div class="achieveTxtHolder">
            <div class="achieveTxt">
                <h3 class="ellipsis"></h3>
                <h5 class="ellipsis"></h5>
            </div>
        </div>
    </div>'

id = window.location.href.match ///stats/([^/?]+)// .1

$.ajax do
    url: "http://steamcommunity.com/my/stats/#id/achievements/"
    headers:
        "X-ValveUserAgent": "panorama Jun 14 2016 23:23:40"
    success: (data)!->
        json = data.match //var\s+g_rgAchievements\s*=\s*(.+);// .1
        achs = $.parse-JSON json
        rows = for row in $ '.achieveRow .achieveTxt'
            [$ row .children!.first!.text!.trim!, $ row .children!.last!]
        for key, ach of achs.open
            found = no
            for [name, desc] in rows
                if name == ach.name
                    desc.text ach.desc
                    found = yes
            if not found
                $ new-row
                    ..find 'img' .attr src: ach.icon_open
                    ..find 'h3' .text ach.name
                    ..find 'h5' .text ach.desc
                    ..insert-after '.achieveRow:last-child'
