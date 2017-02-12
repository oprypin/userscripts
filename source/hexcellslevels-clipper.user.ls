# ==UserScript==
# @name         Hexcells levels clipper
# @description  Copy Hexcells levels to clipboard
# @version      1
# @include      https://www.reddit.com/r/hexcellslevels/*
# @grant        GM_setClipboard
# @require      https://code.jquery.com/jquery-3.1.1.min.js
# @run-at       document-end
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

$ 'pre' .parent! .each !->
    parent = $ this
    levels = []
    parent .children 'pre' .each !->
        block = $ this
        container = $ '<div>'

        block.text!.replace //
            ^Hexcells\ level\ v1\n
            (.+)\n (.*)\n (.*\n.*)\n
            (([.oOxX\\|/][.+cn])+\n?)+
        //gm, (level, title, author, desc)!->
            level .= trim!
            desc .= trim!

            container.append(
                chk = $ '<input type="checkbox" checked>'
                $ '<input type="button" title="Click to copy this level">'
                    .prop value: title
                    .click !-> copy level, @
                $ '<span style="font-size: 90%">' .text(" by #{author}")
                $ '<div>' .text(desc)
            )
            levels.push [chk, level]

        if container.is ':parent'
            block.replace-with container

    if levels.length > 1
        $ '<input type="button" value="Copy selected levels" style="float: right; font-size: 150%">'
            .insert-before levels[0].0
            .click do
                levels |> (levels)-> !->
                    to-copy = [level for [chk, level] in levels when chk.prop 'checked']
                    copy to-copy * '\n\n', @
    else
        for [chk, level] in levels
            chk.remove!


copy = (s, el)->
    GM_set-clipboard s
    el.style.transition = 'background-color 0.3s ease'
    el.style.background-color = '#3e3'
    set-timeout !->
        el.style.background-color = null
    , 400
