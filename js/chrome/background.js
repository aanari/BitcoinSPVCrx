'use strict';
var Pool = require('../bitcoin/pool');
// TODO: include the wallet here as well

/**
 * Listens for the app launching, then creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function() {
  var pool = new Pool();
  pool.on('syncprogress', function(progress) {
    chrome.runtime.sendMessage(
      {type: "syncprogress", progress: progress, height: pool.syncedHeight()});
  });
  pool.on('synccomplete', function() {
    chrome.runtime.sendMessage({type: "synccomplete", height: pool.syncedHeight()});
  });
  pool.on('peerconnect', function(numPeers) {
    chrome.runtime.sendMessage({type: "peerconnect", numPeers: numPeers});
  });
  pool.on('peerdisconnect', function(numPeers) {
    chrome.runtime.sendMessage({type: "peerdisconnect", numPeers: numPeers});
  });
  pool.connect();

  chrome.app.window.create(
    "index.html",
    {
      id: "bitcoin-spv-window",
      outerBounds: { minWidth: 400, minHeight: 600 },
      innerBounds: { maxWidth: 600, maxHeight: 800 },
      frame: { type: 'chrome' }
    },
    function(window) {
      window.onClosed.addListener(function() {
        pool.disconnect();
        console.log('Shut down.');
      });
    }
  );

});