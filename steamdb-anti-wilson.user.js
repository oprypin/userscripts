// ==UserScript==
// @name         SteamDB Anti-Wilson
// @description  Replace Wilson ratings with simple percentages, like on Steam store
// @version      1
// @include      https://steamdb.info/sales/*
// @run-at       document-end
// @author       Oleh Prypin
// @namespace    http://blaxpirit.com/
// ==/UserScript==
// Generated by LiveScript 1.4.0
var $, lpad, run;
$ = jQuery;
lpad = function(width, s){
  s = s + "";
  while (s.length < width) {
    s = " " + s;
  }
  return s;
};
run = function(){
  $('.table-sales tbody span.tooltipped').each(function(){
    var el, tip, result, ref$, pos, neg, perc, total;
    el = $(this);
    tip = el.attr('aria-label');
    result = /([0-9]+).+?([0-9]+)/.exec(tip);
    ref$ = result.slice(1).map(function(it){
      return parseInt(it);
    }), pos = ref$[0], neg = ref$[1];
    perc = pos / (total = pos + neg);
    el.html(lpad(4, Math.round(perc * 100)) + "% / " + total);
    el.removeClass('b');
    el.parent().parent().find('.b').each(function(){
      $(this).css({
        fontWeight: 100 + Math.round(Math.pow(perc, 2) * 8) * 100
      });
    });
    el.parent().css({
      textAlign: 'left'
    }).attr({
      dataSort: perc.toFixed(4)
    });
  });
};
run();
setTimeout(run, 500);
setTimeout(run, 1000);
setInterval(run, 2500);