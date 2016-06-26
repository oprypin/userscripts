# ==UserScript==
# @name         SteamDB sales page improvements
# @description  Add buttons to hide non-"highest recorded discount"
# @version      2
# @include      https://steamdb.info/sales/*
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

$ '''
    <div class="steamy-checkbox-control">
        Show only lowest:
        <span class="btn btn-sm btn-social">&le;</span>
        <span class="btn btn-sm btn-social">&lt;</span>
    </div>
'''
    .insert-after '#js-merged-checkbox'
    .find 'span' .click !->
        sel = if $ this .text! == '<'
            ':not(:has(.price-discount-major))'
        else
            ':has(.highest-discount)'
        $ "table.table-sales tr.app#sel" .hide!
