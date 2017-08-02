# ==UserScript==
# @name         SteamDB sales page improvements
# @description  Add buttons to hide non-"highest recorded discount"
# @version      6
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
    else try
        applied-styles[css].remove!

$ '.dataTables_length select' .val -1 .change!

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

$ '
    <div class="fancy-select"><select>
        <option value="all">Any discount</option>
        <option value="le">Hide smaller discounts</option>
        <option value="lt">Only new highest discounts</option>
    </select></div>
'
    .prepend-to col1
    .find 'select' .change !->
        val = $ @ .val!
        kinds =
            le: ':has(.highest-discount)'
            lt: ':not(:has(.price-discount-major))'
        if val != \all
            selector = 'table.table-sales tr.app' + kinds[val]
            $ selector .add-class "hide-#{val}"
        for kind of kinds
            apply-style ".hide-#{kind} { display: none; }", val == kind
    .val \le .change!

$ '#js-merged-checkbox' .append-to col2

$ '.sales-weeklong-deals' .remove-class 'sales-weeklong-deals'
