// ==UserScript==
// @name         Click through Steam discovery queue
// @description  Automatically click "next" in Steam's Discovery Queue
// @version      2
// @include      http://store.steampowered.com/app/*
// @run-at       document-end
// @author       Oleh Prypin
// @namespace    http://blaxpirit.com/
// ==/UserScript==
// Generated by LiveScript 1.5.0
window.addEventListener('load', function(){
  var evt;
  evt = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: false
  });
  return document.querySelector('.btn_next_in_queue').dispatchEvent(evt);
});
