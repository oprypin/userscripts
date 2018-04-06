# ==UserScript==
# @name         Precise Steam Store ratings
# @description  Replace vague descriptions like "Mostly Positive" with percentages
# @version      3
# @include      *://store.steampowered.com/app/*
# @grant        none
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

to-num = (.replace /\D/g, '')

$ '.user_reviews_summary_row' .each !->
    $ @ .find '.game_review_summary' .text do
        try $ @ .data 'tooltip-text' .match /\d+%/ .0

    $ @ .find '.responsive_hidden' .text (i, text)-> " of #{text |> to-num}"


steam-reviews-label = $ '.user_reviews_summary_row .all'
all-reviews = steam-reviews-label .parent! .clone!
steam-reviews-label.text "Steam reviews:"
all-reviews.insert-after steam-reviews-label.parent!

reviews = {[
    kind,
    $ '.user_reviews_filter_menu label[for="review_type_' + kind + '"] .user_reviews_count' .text! |> to-num
] for kind in <[positive all]>}
all-reviews.find '.responsive_hidden' .remove!
all-reviews.find '.game_review_summary'
    ..text Math.round(reviews.positive / reviews.all * 100) + "%"
    ..after ($ '<span class="responsive_hidden">' .text " of #{reviews.all}")

$ '<style>' .html '
    .glance_ctn .user_reviews,
    .steamdb_last_update a {
        color: #8f98a0 !important;
    }
' .append-to 'head'

for delay in [0.5, 1.5, 2.5]
    set-timeout !->
        $ '.user_reviews_summary_row:contains(SteamDB)' .remove!
    , delay * 1000

