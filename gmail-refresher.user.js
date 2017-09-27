// ==UserScript==
// @name         Gmail Refresher
// @description  Periodically click Refresh in Gmail
// @version      3
// @include      https://mail.google.com/mail/*
// @grant        none
// @run-at       document-end
// @noframes
// @author       Oleh Prypin
// @namespace    http://blaxpirit.com/
// ==/UserScript==
// Generated by LiveScript 1.5.0
var xpath, mouseEvent, click, refresh;
xpath = function(s){
  return document.evaluate(s, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};
mouseEvent = function(type, el){
  var ev;
  ev = new MouseEvent(type);
  return el.dispatchEvent(ev);
};
click = function(btn){
  mouseEvent('mouseover', btn);
  mouseEvent('mousedown', btn);
  mouseEvent('mouseup', btn);
  return mouseEvent('click', btn);
};
refresh = function(){
  var btn;
  return setTimeout(refresh, (btn = xpath("//div[@role='button']/*[text()='Refresh']"))
    ? (click(btn.parentNode), console.log("Mail checked: " + new Date()), 60000 * (15 + 15 * Math.random()))
    : 1000 * (20 + 100 * Math.random()));
};
refresh();
