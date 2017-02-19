// ==UserScript==
// @name         Hexcells levels clipper
// @description  Copy Hexcells levels to clipboard
// @version      2
// @include      https://www.reddit.com/r/hexcellslevels/*
// @grant        GM_setClipboard
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @run-at       document-end
// @author       Oleh Prypin
// @namespace    http://blaxpirit.com/
// ==/UserScript==
// Generated by LiveScript 1.5.0
var $, copying, join$ = [].join;
$ = jQuery;
$('pre').parent().each(function(){
  var parent, levels, i$, len$, ref$, chk, level;
  parent = $(this);
  levels = [];
  parent.children('pre').each(function(){
    var block, container;
    block = $(this);
    container = $('<div>');
    block.text().replace(/^Hexcells\ level\ v1\n(.+)\n(.*)\n(.*\n.*)\n((([.oOxX\\|\/][.+cn])+\n?)+)/gm, function(level, title, author, desc, field){
      var chk, e;
      level = level.trim();
      desc = desc.trim();
      field = field.trim();
      container.append(chk = $('<input type="checkbox" checked style="vertical-align: top; float: left">'), $('<div title="Click to copy this level" style="background-color: rgb(240, 240, 240); text-align: center; border-radius: 5px; padding: 3px; display: inline-block; cursor: pointer">').click(function(){
        copy(level, this);
      }).append($('<div style="margin-bottom: 3px">').append($('<span style="font-weight: bold">').text(title), $('<span style="font-size: 90%">').text(" by " + author)), (function(){
        try {
          return renderLevel(field);
        } catch (e$) {
          e = e$;
          return $('<span style="color: red">').text(e);
        }
      }()), $('<div style="white-space: pre-wrap; font-size: 90%">').text(desc)));
      levels.push([chk, level]);
    });
    if (container.is(':parent')) {
      block.replaceWith(container);
    }
  });
  if (levels.length > 1) {
    $('<input type="button" value="Copy selected levels" style="float: right; font-size: 150%">').insertBefore(levels[0][0].parent()).click(function(levels){
      return function(){
        var toCopy, res$, i$, ref$, len$, ref1$, chk, level;
        res$ = [];
        for (i$ = 0, len$ = (ref$ = levels).length; i$ < len$; ++i$) {
          ref1$ = ref$[i$], chk = ref1$[0], level = ref1$[1];
          if (chk.prop('checked')) {
            res$.push(level);
          }
        }
        toCopy = res$;
        copy(join$.call(toCopy, '\n\n'), this);
      };
    }(
    levels));
  } else {
    for (i$ = 0, len$ = levels.length; i$ < len$; ++i$) {
      ref$ = levels[i$], chk = ref$[0], level = ref$[1];
      chk.remove();
    }
  }
});
copying = false;
function copy(s, el){
  var old;
  GM_setClipboard(s);
  if (copying) {
    return;
  }
  copying = true;
  el.style.transition = 'background-color 0.3s ease';
  old = el.style.backgroundColor;
  el.style.backgroundColor = '#7e7';
  return setTimeout(function(){
    el.style.backgroundColor = old;
    copying = false;
  }, 400);
}
function renderLevel(lvl){
  var flowerDeltas, neighborDeltas, lineDeltas, cellColor, borderColor, textColor, radius, border, spacing, canvas, c, field, res$, i$, ref$, len$, line, lresult$, j$, to$, x, xs, ys, y, len1$, kind, info, minX, maxX, minY, maxY, hex, px, py, neighbors, k$, len2$, ref1$, dx, dy;
  flowerDeltas = [[0, -2], [0, -4], [1, -3], [1, -1], [2, -2], [2, 0], [1, 1], [2, 2], [1, 3], [0, 2], [0, 4], [-1, 3], [-1, 1], [-2, 2], [-2, 0], [-1, -1], [-2, -2], [-1, -3]];
  neighborDeltas = [flowerDeltas[0], flowerDeltas[3], flowerDeltas[6], flowerDeltas[9], flowerDeltas[12], flowerDeltas[15]];
  lineDeltas = {
    '\\': [1, 1],
    '|': [0, 1],
    '/': [-1, 1]
  };
  cellColor = function(it){
    switch (it) {
    case 'O':
      return 'rgb(62, 62, 62)';
    case 'X':
      return 'rgb(5, 164, 235)';
    default:
      return 'rgb(255, 175, 41)';
    }
  };
  borderColor = function(it){
    switch (it) {
    case 'O':
      return 'rgb(44, 47, 49)';
    case 'X':
      return 'rgb(20, 156, 216)';
    default:
      return 'rgb(255, 159, 0)';
    }
  };
  textColor = function(it){
    switch (it) {
    case 'O':
    case 'X':
      return 'rgb(255, 255, 255)';
    case '\\':
    case '|':
    case '/':
      return 'rgb(73, 73, 73)';
    }
  };
  radius = 15;
  border = radius / 5;
  spacing = radius / 8;
  canvas = $('<canvas>')[0];
  c = canvas.getContext('2d');
  res$ = [];
  for (i$ = 0, len$ = (ref$ = lvl.split('\n')).length; i$ < len$; ++i$) {
    line = ref$[i$];
    lresult$ = [];
    line = line.trim();
    for (j$ = 0, to$ = line.length; j$ < to$; j$ += 2) {
      x = j$;
      lresult$.push(line.substr(x, 2));
    }
    res$.push(lresult$);
  }
  field = res$;
  xs = [];
  ys = [];
  for (i$ = 0, len$ = field.length; i$ < len$; ++i$) {
    y = i$;
    line = field[i$];
    for (j$ = 0, len1$ = line.length; j$ < len1$; ++j$) {
      x = j$;
      ref$ = line[j$], kind = ref$[0], info = ref$[1];
      if (kind !== '.') {
        xs.push(x);
        ys.push(y + (in$(kind, '\\|/') ? 0.8 : 0));
      }
    }
  }
  minX = Math.min.apply(null, xs);
  maxX = Math.max.apply(null, xs);
  minY = Math.min.apply(null, ys);
  maxY = Math.max.apply(null, ys);
  canvas.width = (maxX - minX + 1.3) * 2 * (radius + spacing / 2) * 0.75;
  canvas.height = (maxY - minY + 2) * (radius + spacing / 2) * 0.866;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = "bold " + radius + "px sans-serif";
  hex = function(x, y, radius, fill){
    var i$, i;
    c.beginPath();
    c.moveTo(x + radius, y);
    for (i$ = 1; i$ < 6; ++i$) {
      i = i$;
      c.lineTo(x + radius * Math.cos(Math.PI * 2 * i / 6), y + radius * Math.sin(Math.PI * 2 * i / 6));
    }
    c.fill();
  };
  for (i$ = 0, len$ = field.length; i$ < len$; ++i$) {
    y = i$;
    line = field[i$];
    for (j$ = 0, len1$ = line.length; j$ < len1$; ++j$) {
      x = j$;
      ref$ = line[j$], kind = ref$[0], info = ref$[1];
      px = radius * 0.2 + ((x - minX) * 2 + 1) * (radius + spacing / 2) * 0.75;
      py = (y - minY + 1) * (radius + spacing / 2) * 0.866;
      if (in$(kind, 'oOxX')) {
        c.fillStyle = borderColor(kind);
        hex(px, py, radius);
        c.fillStyle = cellColor(kind);
        hex(px, py, radius - border);
        if (in$(kind, 'OX')) {
          c.fillStyle = textColor(kind);
          if (in$(info, '+cn')) {
            neighbors = 0;
            for (k$ = 0, len2$ = (ref$ = kind === 'O' ? neighborDeltas : flowerDeltas).length; k$ < len2$; ++k$) {
              ref1$ = ref$[k$], dx = ref1$[0], dy = ref1$[1];
              try {
                if (in$(field[y + dy][x + dx][0], 'xX')) {
                  neighbors += 1;
                }
              } catch (e$) {}
            }
            if (info === 'c') {
              neighbors = "{" + neighbors + "}";
            }
            if (info === 'n') {
              neighbors = "-" + neighbors + "-";
            }
            c.fillText(neighbors, px, py);
          } else if (kind === 'O' && info === '.') {
            c.fillText("?", px, py);
          }
        }
      } else if (in$(kind, '\\|/')) {
        neighbors = 0;
        dx = dy = 0;
        try {
          for (;;) {
            ref$ = lineDeltas[kind], dx += ref$[0], dy += ref$[1];
            if (in$(field[y + dy][x + dx][0], 'xX')) {
              neighbors += 1;
            }
          }
        } catch (e$) {}
        if (info === 'c') {
          neighbors = "{" + neighbors + "}";
        }
        if (info === 'n') {
          neighbors = "-" + neighbors + "-";
        }
        c.fillStyle = textColor(kind);
        c.save();
        c.translate(px, py);
        c.rotate((fn$()));
        c.translate(0, radius * 0.4);
        c.fillText(neighbors, 0, 0);
        c.restore();
      }
    }
  }
  return canvas;
  function fn$(){
    switch (kind) {
    case '\\':
      return -Math.PI / 3;
    case '|':
      return 0;
    case '/':
      return Math.PI / 3;
    }
  }
}
function in$(x, xs){
  var i = -1, l = xs.length >>> 0;
  while (++i < l) if (x === xs[i]) return true;
  return false;
}
