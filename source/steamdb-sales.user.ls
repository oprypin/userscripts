# ==UserScript==
# @name         SteamDB sales page improvements
# @description  Add buttons to hide non-"highest recorded discount"
# @version      3
# @include      https://steamdb.info/sales/*
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

$ '.dataTables_length select' .val -1 .trigger \change

ignored-style = null
$ '
    <div class="steamy-checkbox-control" id="js-notinterested-checkbox">
        <div class="steamy-checkbox"></div>
        <span class="steamy-checkbox-label">Hide "not interested"</span>
    </div>
'
    .insert-before '#js-merged-checkbox'
    .click !->
        $ this .toggle-class \checked
        if $ this .has-class \checked
            ignored-style := $ '<style>
                .ignored { display: none; }
            </style>' .append-to 'head'
        else
            ignored-style.remove!
    .click!

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
        $ "table.table-sales tr.app#{sel}" .hide!
