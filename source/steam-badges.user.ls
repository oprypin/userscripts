# ==UserScript==
# @name         Steam badges page improvements
# @description  Display showcase links on Steam badges page
# @version      2
# @include      http://steamcommunity.com/id/*/badges/
# @include      https://steamcommunity.com/id/*/badges/
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

for row in document.query-selector-all '.badge_row'
    link = row.query-selector 'a' .href
    id = link.match ///([0-9]+)/?$// .1
    link = "http://www.steamcardexchange.net/index.php?gamepage-appid-#id"
    html = """
        <div class="badge_title" style="clear: both; z-index: 1000">
            <a href="#link">Showcase</a>
        </div>"""
    row.query-selector '.badge_current' .inner-HTML += " #html"
    row.query-selector '.badge_row_overlay' .style .z-index = 0
