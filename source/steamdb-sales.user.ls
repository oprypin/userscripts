# ==UserScript==
# @name         SteamDB sales page improvements
# @description  Add buttons to hide non-"highest recorded discount"
# @version      4
# @include      https://steamdb.info/sales/*
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

applied-styles = {}
apply-style = (css, enable=true)!->
    if enable
        applied-styles[css] = $ '<style>' .html css .append-to 'head'
    else
        applied-styles[css].remove!

$ '.dataTables_length select' .val -1 .trigger \change

[col1, col2] = $ '#js-filters>div'

$ '
    <div class="steamy-checkbox-control">
        <div class="steamy-checkbox"></div>
        <span class="steamy-checkbox-label">Hide "not interested"</span>
    </div>
'
    .append-to col1
    .click !->
        checked = $ @ .toggle-class 'checked' .has-class 'checked'
        apply-style '.ignored { display: none; }', checked
    .click!

$ '''
    <div class="steamy-checkbox-control">
        Show only lowest:
        <span class="btn btn-sm btn-social">&le;</span>
        <span class="btn btn-sm btn-social">&lt;</span>
    </div>
'''
    .append-to col1
    .find 'span' .click !->
        sel = if $ @ .text! == '<'
            ':not(:has(.price-discount-major))'
        else
            ':has(.highest-discount)'
        $ "table.table-sales tr.app#{sel}" .hide!

$ '#js-merged-checkbox' .append-to col2
