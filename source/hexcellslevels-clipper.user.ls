# ==UserScript==
# @name         Hexcells levels clipper
# @description  Copy Hexcells levels to clipboard
# @version      3
# @include      https://*.reddit.com/r/hexcellslevels/*
# @grant        GM_setClipboard
# @require      https://code.jquery.com/jquery-3.3.1.min.js
# @run-at       document-start
# @author       Oleh Prypin
# @namespace    http://blaxpirit.com/
# ==/UserScript==

$ = jQuery

button-style =
    background-color: 'rgb(240, 240, 240)'
    color: 'rgb(0, 0, 0)'
    border: '0'
    border-radius: '5px'
    padding: '4px'

!function run
    $ 'pre' .parent! .each !->
        levels = []
        $ this .children 'pre' .each !->
            block = $ this
            container = $ '<div>'

            block.text!.replace //
                ^Hexcells\ level\ v1\n
                (.+)\n (.*)\n (.*\n.*)\n
                ((([.oOxX\\|/][.+cn])+\n?)+)
            //gm, (level, title, author, desc, field)!->
                level .= trim!
                desc .= trim!
                field .= trim!

                container.append do
                    chk = $ '<input type="checkbox" checked style="vertical-align: top; float: left">'
                    $ '<button title="Click to copy this level">' .css button-style
                        .click !-> copy level, @
                        .append do
                            $ '<div style="margin-bottom: 3px">' .append do
                                $ '<span style="font-weight: bold">' .text(title)
                                $ '<span style="font-size: 90%">' .text(" by #{author}")
                            try
                                render-level(field)
                            catch
                                $ '<span style="color: red">' .text(e)
                            $ '<div style="white-space: pre-wrap; font-size: 90%">' .text(desc)
                levels.push [chk, level]

            if container.is ':parent'
                block.replace-with container

        if levels.length > 1
            $ '<button style="float: right; font-size: 150%">Copy selected levels</button>'
                .css button-style
                .insert-before levels[0].0.parent!
                .click do
                    levels |> (levels)-> !->
                        to-copy = [level for [chk, level] in levels when chk.prop 'checked']
                        copy to-copy * '\n\n', @
        else
            for [chk, level] in levels
                chk.remove!

$ run
window.onload = run

copying = false
function copy(s, el)
    GM_set-clipboard s
    return if copying
    copying := true
    el.style.transition = 'background-color 0.3s ease'
    old = el.style.background-color
    el.style.background-color = '#7e7'
    set-timeout !->
        el.style.background-color = old
        copying := false
    , 400


function render-level(lvl)
    flower-deltas = [
        [ 0, -2], [ 0, -4], [ 1, -3],
        [ 1, -1], [ 2, -2], [ 2,  0],
        [ 1,  1], [ 2,  2], [ 1,  3],
        [ 0,  2], [ 0,  4], [-1,  3],
        [-1,  1], [-2,  2], [-2,  0],
        [-1, -1], [-2, -2], [-1, -3],
    ]
    neighbor-deltas = flower-deltas[0 til 18 by 3]
    line-deltas = {'\\': [1, 1], '|': [0, 1], '/': [-1, 1]}

    cell-color = -> switch it
        | 'O' => 'rgb(62, 62, 62)'
        | 'X' => 'rgb(5, 164, 235)'
        |  _  => 'rgb(255, 175, 41)'
    border-color = -> switch it
        | 'O' => 'rgb(44, 47, 49)'
        | 'X' => 'rgb(20, 156, 216)'
        |  _  => 'rgb(255, 159, 0)'
    text-color = -> switch it
        | <[O X]> => 'rgb(255, 255, 255)'
        | <[\ | /]> => 'rgb(73, 73, 73)'

    radius = 15
    border = radius/5
    spacing = radius/8

    canvas = $('<canvas>').0
    c = canvas .get-context '2d'

    field = for line in lvl.split('\n')
        line .= trim!
        for x from 0 til line.length by 2
            line.substr(x, 2)

    xs = []; ys = []
    for line, y in field
        for [kind, info], x in line
            if kind != '.'
                xs.push x
                ys.push y + (if kind in '\\|/' then 0.8 else 0)
    min-x = Math.min.apply(null, xs)
    max-x = Math.max.apply(null, xs)
    min-y = Math.min.apply(null, ys)
    max-y = Math.max.apply(null, ys)

    canvas.width = (max-x - min-x + 1.3)*2 * (radius + spacing/2) * 0.75
    canvas.height = (max-y - min-y + 2) * (radius + spacing/2) * 0.866

    c.text-align = 'center'
    c.text-baseline = 'middle'
    c.font = "bold #{radius}px sans-serif"

    hex = (x, y, radius, fill)!->
        c.begin-path!
        c.move-to x + radius, y
        for i from 1 til 6
            c.line-to do
                x + radius * Math.cos(Math.PI*2 * i/6),
                y + radius * Math.sin(Math.PI*2 * i/6)
        c.fill!

    for line, y in field
        for [kind, info], x in line
            px = radius*0.2 + ((x - min-x)*2 + 1) * (radius + spacing/2) * 0.75
            py = (y - min-y + 1) * (radius + spacing/2) * 0.866

            if kind in 'oOxX'
                c.fill-style = border-color(kind)
                hex(px, py, radius)
                c.fill-style = cell-color(kind)
                hex(px, py, radius - border)

                if kind in 'OX'
                    c.fill-style = text-color(kind)
                    if info in '+cn'
                        neighbors = 0
                        for [dx, dy] in (if kind == 'O' then neighbor-deltas else flower-deltas)
                            try if field[y + dy][x + dx].0 in 'xX'
                                neighbors += 1
                        neighbors = "{#{neighbors}}" if info == 'c'
                        neighbors = "-#{neighbors}-" if info == 'n'

                        c.fill-text neighbors, px, py
                    else if kind == 'O' and info == '.'
                        c.fill-text "?", px, py

            else if kind in '\\|/'
                neighbors = 0
                dx = dy = 0
                try loop
                    [dx, dy] += line-deltas[kind]
                    if field[y + dy][x + dx].0 in 'xX'
                        neighbors += 1
                neighbors = "{#{neighbors}}" if info == 'c'
                neighbors = "-#{neighbors}-" if info == 'n'

                c.fill-style = text-color(kind)
                c.save!
                c.translate px, py
                c.rotate switch kind
                    | '\\' => -Math.PI/3
                    | '|' => 0
                    | '/' => Math.PI/3
                c.translate 0, radius*0.4
                c.fill-text neighbors, 0, 0
                c.restore!

    canvas
