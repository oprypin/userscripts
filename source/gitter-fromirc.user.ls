# ==UserScript==
# @name         IRC-to-Gitter bridge bot integration
# @description  Substitute nicknames in messages written by @FromIRC (bridge bot)
# @version      6
# @include      https://gitter.im/*
# @include      https://app.element.io/*
# @grant        none
# @require      https://code.jquery.com/jquery-3.5.1.min.js
# @require      https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.18.0/js/md5.min.js
# @run-at       document-start
# @author       Oleh Prypin
# @namespace    http://pryp.in/
# ==/UserScript==

$ = jQuery
one = -> it if it.length

matrix = window.location.href.starts-with 'https://app.element.io/'
sel = (g, m)-> if matrix then m else g

update = !->
    replacing = false
    prev-nickname = null
    some-avatar = some-profile = null

    $(sel '#chat-container .chat-item', '.mx_RoomView_MessageList>li.mx_EventTile').each !->
        if one $(@).find(sel '.chat-item__username', '.mx_SenderProfile_displayName')
            replacing := that.text() == (sel '@FromIRC', 'FromIRC (From IRC (bridge bot))') || that.has-class('irc-from')

        if avatar = one $(@).find(sel '.chat-item__aside', '.mx_EventTile_avatar')
            some-avatar := avatar
        if profile = one $(@).find(sel '.chat-item__details', '.mx_SenderProfile')
            some-profile := profile

        if replacing
            $(@).find(sel '.chat-item__text strong', '.mx_EventTile_content strong').first()
                nickname = ..text()
                ..hide()
            if nickname.includes '* '
                $(@).add-class 'chat-item__status'
                nickname .= replace('* ', '')

            if avatar || nickname != prev-nickname
                $(@).remove-class(sel 'burstContinued', 'mx_EventTile_continuation').add-class(sel 'burstStart', null)

                if !avatar
                    avatar = some-avatar.clone()
                    $(@) |> (sel (.find(sel '.chat-item__container')), ->it) |> (sel (.prepend avatar), (.append avatar))
                avatar.find('img').attr do
                    src: "https://secure.gravatar.com/avatar/#{md5(nickname)}?s=30&d=identicon"
                    srcset: null

                if !profile
                    profile = some-profile.clone()
                    $(@) |> (sel (.find('.chat-item__content')), ->it) |> (.prepend(profile))

                $(@).find(sel '.chat-item__from', '.mx_SenderProfile_displayName').text(nickname)
                    .remove-class('js-chat-item-from').add-class('irc-from')
                profile.find('.chat-item__username').hide()

        prev-nickname := nickname

    mutation-observer.take-records()

mutation-observer = new MutationObserver(update)
current-chat-container = null

register = !->
    chat-container = $(sel '#chat-container', '.mx_RoomView_MessageList')
    if !chat-container.length || chat-container.0 == current-chat-container
        return
    current-chat-container := chat-container.0

    update()

    mutation-observer.observe chat-container.0, {+child-list, +subtree}

    chat-container.on 'click', '.irc-from', ->
        nickname = $(@).text().replace(/^<|>$/g, '')
        if matrix
            textarea = $('.mx_BasicMessageComposer_input')
            div = textarea.children(':first')
            div.html "#{nickname}, #{div.html()}"
        else
            textarea = $('.chat-input__text-area')
            textarea.val "#{nickname}, #{textarea.val()}"
        false

set-interval register, 500
