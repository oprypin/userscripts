# ==UserScript==
# @name         SteamDB sales page improvements
# @description  Add controls to hide non-"highest recorded discount"
# @version      8
# @include      https://steamdb.info/sales/*
# @grant        GM_getValue
# @grant        GM_setValue
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

apply-style '
    #visibility-filter { text-align: center; margin-right: 20px; margin-top: 25px; margin-left: 70px; float: right; }
    #visibility-filter table { background-color: transparent; margin: 0 auto; }
    #visibility-filter tr :first-child { text-align: right; }
    #visibility-filter input { width: 70px; }
    .visibility-filter-hidden { display: none; }
'

$('.dataTables_length select').val(-1).change!
$('#js-wishlisted-only, #js-hide-owned-games')
    ..filter('.checked').click!
    ..hide!

for cls in <[daily-deal special-promotion play-for-free todays-highlighted-deals]>
    $('td.sales-' + cls).remove-class('sales-' + cls)
for cls in <[weeklong-deals more-highlighted-deals]>
    $('.sales-' + cls).remove-class('sales-' + cls)

$('
    <div id="visibility-filter" class="fancy-price">
        <table><tr>
            <th>Display games:</th><td>Wishlist</td><th>Default</th><td>Owned</td>
        </tr><tr>
            <td>Any discount</td>
            <td><input type="radio" name="filter-wish" value="all"></td>
            <td><input type="radio" name="filter-all" value="all"></td>
            <td><input type="radio" name="filter-own" value="all"></td>
        </tr><tr>
            <td>Hide smaller discounts</td>
            <td><input type="radio" name="filter-wish" value="le" checked></td>
            <td><input type="radio" name="filter-all" value="le"></td>
            <td><input type="radio" name="filter-own" value="le"></td>
        </tr><tr>
            <td>Only new highest discounts</td>
            <td><input type="radio" name="filter-wish" value="lt"></td>
            <td><input type="radio" name="filter-all" value="lt" checked></td>
            <td><input type="radio" name="filter-own" value="lt"></td>
        </tr><tr>
            <td>Hide</td>
            <td><input type="radio" name="filter-wish" value="none"></td>
            <td><input type="radio" name="filter-all" value="none"></td>
            <td><input type="radio" name="filter-own" value="none" checked></td>
        </tr></table>
    </div>
')
    .insert-after('#js-filters')

function check(row, cond)
    switch cond
    | 'all' => true
    | 'le' => row.find('.highest-discount').length == 0
    | 'lt' => row.find('.price-discount-major').length > 0
    | 'none' => false

filters = {[kind, $('#visibility-filter input[name="filter-' + kind + '"]')] for kind in <[wish all own]>}

function by-index(kind, index)
    filters[kind].get(index).click! if index?
    filters[kind].index(filters[kind].filter(':checked'))

function by-val(kind, val)
    filters[kind].filter('[value="' + val + '"]').click! if val?
    filters[kind].filter(':checked').val!

for kind of filters
    try by-val(kind, GM_get-value(kind))

!function update-filters
    if by-index('wish') > by-index('all')
        by-index('wish', by-index('all'))
        return

    $('.table-sales tr.app').each !->
        row = $(@)
        chk = (kind)->
            check(row, filters[kind].filter(':checked').val!)
        show = if row.has-class('owned')
            chk('own')
        else
            row.has-class('wished') and chk('wish') or chk('all')
        row.toggle-class('visibility-filter-hidden', !show)

    for kind of filters
        try GM_set-value(kind, by-val(kind))

$('#visibility-filter input').change(update-filters)
update-filters!
set-timeout(update-filters, 500)
set-timeout(update-filters, 1500)
set-timeout(update-filters, 3000)

$('h1').remove!

!function apply-style(css)
    $('<style>').html(css).append-to('head')
