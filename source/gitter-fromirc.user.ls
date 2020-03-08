# ==UserScript==
# @name         IRC-to-Gitter bridge bot integration
# @description  Substitute nicknames in messages written by @FromIRC (bridge bot)
# @version      3
# @include      https://gitter.im/*
# @grant        none
# @require      https://code.jquery.com/jquery-3.3.1.min.js
# @require      https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.10.0/js/md5.min.js
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://pryp.in/
# ==/UserScript==

$ = jQuery
one = -> it if it.length

update = !->
    replacing = false
    prev-nickname = null
    some-aside = some-details = null

    $('.chat-item').each !->
        if one $(@).find('.chat-item__username')
            replacing := that.text() == '@FromIRC'
        if replacing
            $(@).find('.chat-item__text strong')
                nickname = ..text()
                ..hide()
            if nickname.includes '* '
                $(@).add-class 'chat-item__status'
                nickname .= replace('* ', '')

            aside = one $(@).find('.chat-item__aside')
            if aside || nickname != prev-nickname
                $(@).remove-class 'burstContinued' .add-class 'burstStart'

                if aside
                    some-aside := aside
                else
                    aside = some-aside.clone()
                    $(@).find('.chat-item__container').prepend aside
                aside.find('img').attr do
                    src: "https://secure.gravatar.com/avatar/#{md5(nickname)}?s=30&d=identicon"
                    srcset: null

                if details = one $(@).find('.chat-item__details')
                    some-details := details
                else
                    details = some-details.clone()
                    $(@).find('.chat-item__content').prepend details

                $(@).find('.chat-item__from').text(nickname)
                    .remove-class('js-chat-item-from').add-class('irc-from')
                details.find('.chat-item__username').hide()

        prev-nickname := nickname

    mutation-observer.take-records()

mutation-observer = new MutationObserver(update)
mutation-observer.observe $('#chat-container').0, {+child-list, +subtree}

$('#chat-container').on 'click', '.irc-from', ->
    nickname = $(@).text().replace(/^<|>$/g, '')
    textarea = $('.chat-input__text-area')
    textarea.val "#{nickname}, #{textarea.val()}"
