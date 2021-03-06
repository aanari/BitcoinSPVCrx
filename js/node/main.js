'use strict';
/* This is a test script that can be run with node */
var Pool = require('../bitcoin/pool');


var pool = new Pool({ network: process.env.BTC_NETWORK || 'livenet' });
console.log('network:', pool.network.name);

//pool.on('peer-connect', function(progress) {
  //console.log('peer-connect');
//});
//pool.on('peer-ready', function(progress) {
  //console.log('peer-ready');
//});
pool.on('chain-progress', function(progress) {
    var height = pool.chain.getSyncedHeight();
    console.log('syncProgress:', progress,
                'height:', height,
                'estimatedHeight', pool.chain.estimatedBlockHeight());
});

pool.connect();

