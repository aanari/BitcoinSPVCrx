'use strict';
var P2P = require('bitcore-p2p'),
    Messages = P2P.Messages,
    bitcore = require('bitcore'),
    BlockHeader = bitcore.BlockHeader,
    bufferUtil = bitcore.util.buffer,
    EventEmitter = require('events').EventEmitter,
    util = require('util');


// Breadwallet uses 3, so that's good enough for us?!
P2P.Pool.MaxConnectedPeers = 3;
var MAX_GETDATA_HASHES = 50000;
// Random checkpoitns to use, most of these from Breadwallet BRPeerManager.m
// TODO: use parseInt() on the 'target' difficulty hex numbers at the end?
var CHECKPOINTS = [
    [      0, "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", 1231006505, '0x1d00ffffu' ],
    [  20160, "000000000f1aef56190aee63d33a373e6487132d522ff4cd98ccfc96566d461e", 1248481816, '0x1d00ffffu' ],
    [  40320, "0000000045861e169b5a961b7034f8de9e98022e7a39100dde3ae3ea240d7245", 1266191579, '0x1c654657u' ],
    [  60480, "000000000632e22ce73ed38f46d5b408ff1cff2cc9e10daaf437dfd655153837", 1276298786, '0x1c0eba64u' ],
    [  80640, "0000000000307c80b87edf9f6a0697e2f01db67e518c8a4d6065d1d859a3a659", 1284861847, '0x1b4766edu' ],
    [ 100800, "000000000000e383d43cc471c64a9a4a46794026989ef4ff9611d5acb704e47a", 1294031411, '0x1b0404cbu' ],
    [ 120960, "0000000000002c920cf7e4406b969ae9c807b5c4f271f490ca3de1b0770836fc", 1304131980, '0x1b0098fau' ],
    [ 141120, "00000000000002d214e1af085eda0a780a8446698ab5c0128b6392e189886114", 1313451894, '0x1a094a86u' ],
    [ 161280, "00000000000005911fe26209de7ff510a8306475b75ceffd434b68dc31943b99", 1326047176, '0x1a0d69d7u' ],
    [ 181440, "00000000000000e527fc19df0992d58c12b98ef5a17544696bbba67812ef0e64", 1337883029, '0x1a0a8b5fu' ],
    [ 201600, "00000000000003a5e28bef30ad31f1f9be706e91ae9dda54179a95c9f9cd9ad0", 1349226660, '0x1a057e08u' ],
    [ 221760, "00000000000000fc85dd77ea5ed6020f9e333589392560b40908d3264bd1f401", 1361148470, '0x1a04985cu' ],
    [ 241920, "00000000000000b79f259ad14635739aaf0cc48875874b6aeecc7308267b50fa", 1371418654, '0x1a00de15u' ],
    [ 262080, "000000000000000aa77be1c33deac6b8d3b7b0757d02ce72fffddc768235d0e2", 1381070552, '0x1916b0cau' ],
    [ 282240, "0000000000000000ef9ee7529607286669763763e0c46acfdefd8a2306de5ca8", 1390570126, '0x1901f52cu' ],
    [ 302400, "0000000000000000472132c4daaf358acaf461ff1c3e96577a74e5ebf91bb170", 1400928750, '0x18692842u' ],
    [ 322560, "000000000000000002df2dd9d4fe0578392e519610e341dd09025469f101cfa1", 1411680080, '0x181FB893u' ],
    [ 342720, "00000000000000000f9cfece8494800d3dcbf9583232825da640c8703bcd27e7", 1423496415, '0x1818BB87u' ]
];

var TESTNET_CHECKPOINTS = [
    [      0, "000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943", 1296688602, '0x1d00ffffu' ],
    [  20160, "000000001cf5440e7c9ae69f655759b17a32aad141896defd55bb895b7cfc44e", 1345001466, '0x1c4d1756u' ],
    [  40320, "000000008011f56b8c92ff27fb502df5723171c5374673670ef0eee3696aee6d", 1355980158, '0x1d00ffffu' ],
    [  60480, "00000000130f90cda6a43048a58788c0a5c75fa3c32d38f788458eb8f6952cee", 1363746033, '0x1c1eca8au' ],
    [  80640, "00000000002d0a8b51a9c028918db3068f976e3373d586f08201a4449619731c", 1369042673, '0x1c011c48u' ],
    [ 100800, "0000000000a33112f86f3f7b0aa590cb4949b84c2d9c673e9e303257b3be9000", 1376543922, '0x1c00d907u' ],
    [ 120960, "00000000003367e56e7f08fdd13b85bbb31c5bace2f8ca2b0000904d84960d0c", 1382025703, '0x1c00df4cu' ],
    [ 141120, "0000000007da2f551c3acd00e34cc389a4c6b6b3fad0e4e67907ad4c7ed6ab9f", 1384495076, '0x1c0ffff0u' ],
    [ 161280, "0000000001d1b79a1aec5702aaa39bad593980dfe26799697085206ef9513486", 1388980370, '0x1c03fffcu' ],
    [ 181440, "00000000002bb4563a0ec21dc4136b37dcd1b9d577a75a695c8dd0b861e1307e", 1392304311, '0x1b336ce6u' ],
    [ 201600, "0000000000376bb71314321c45de3015fe958543afcbada242a3b1b072498e38", 1393813869, '0x1b602ac0u' ]
];

function Pool(network) {
    this.connected = false;
    this.network = bitcore.Networks[network] || bitcore.Networks.defaultNetwork;
    this.pool = null;
    this.peers = [];
    this.downloadPeer = null;
    this.knownBlockHashes = [];
    // TODO: Store this somewhere better
    this.blocks = [];

    this._bestHeight = 0;
}

util.inherits(Pool, EventEmitter);

Pool.prototype.connect = function() {
    var self = this;
    if(self.connected) return;

    self.pool = new P2P.Pool();
    self.pool.on('peerconnect', self.peerConnected.bind(this));
    self.pool.on('peerready', self.peerReady.bind(this));
    self.pool.on('peerdisconnect', self.peerDisconnected.bind(this));
    self.pool.on('peerheaders', self.peerHeaders.bind(this));
    self.pool.on('peerinv', self.peerInv.bind(this));
    self.pool.on('peertx', self.peerTx.bind(this));
    self.pool.on('peererror', self.peerError.bind(this));

    self.pool.connect();
    self.connected = true;
    
    // TODO: figure out why this is needed
    var readyTo = setTimeout(function(){
        console.log('pool reconnecting');
        self.disconnect();
        self.connect();
    },3000);
    self.pool.once('peerready', function() { clearTimeout(readyTo); });
}

Pool.prototype.peerConnected = function(peer) {
    var self = this;
    console.log('peerConnected');
    self.peers.push(peer);

    // Only wait 2 seconds for verAck
    var peerTimeout = setTimeout(function() {
        console.log('peer timed out, disconnecting');
        peer.disconnect();
    },2000);
    // Clear timeout once peer is ready
    peer.on('ready', function() { clearTimeout(peerTimeout); });
    self.emit('peerconnect', self.peers.length)
}

Pool.prototype.peerReady = function(peer, addr) {
    var self = this;

    self._bestHeight = Math.max(self._bestHeight, peer.bestHeight);
    console.log('peerReady: ', addr.ip.v4);
    //TODO: Smarter peerDownload detection
    if(!self.downloadPeer) {
        self._setDownloadPeer(peer);
    } else {
        // Check if the new peer has a higher height, and switch
        // downloadPeer, if so
        if(peer.bestHeight > self.downloadPeer.bestHeight) {
            console.log('switching downloadPeer');
            self.downloadPeer.disconnect();
            self._setDownloadPeer(peer);
        }
    }
}

Pool.prototype.peerDisconnected = function(peer, addr) {
    var self = this;
    console.log('removing:', addr.ip.v4);
    var idx = self.peers.indexOf(peer);
    if(idx && self.peers[idx] == self.downloadPeer){
        console.log('unsetting downloadPeer');
        // TODO: is this good enough, or do we need to re-set it here?
        self.downloadPeer = null;
    }
    self.peers.splice(idx-1,1);
    self.emit('peerdisconnect', self.peers.length)
}

Pool.prototype.peerInv = function(peer, message) {
    var self = this;
    var txHashes = [], blockHashes = [];

    if(message.count > MAX_GETDATA_HASHES) {
        console.log('inv message has too many items, dropping.');
        return;
    }

    for(var i in message.inventory) {
        switch(message.inventory[i].type) {
            case 1: // TX
                txHashes.push(message.inventory[i]);
                break;
            case 2: // Block
                blockHashes.push(message.inventory[i]);
                break;
            default: break;
        }
    }

    // TODO: Check for bloom filter

    // Stole this logic from breadWallet
    if(txHashes.length > 10000) {
        console.log('too many transactions, disconnecting from peer');
        peer.disconnect();
        return;
    }

    if(blockHashes.length == 1 &&
            self.knownBlockHashes.indexOf(blockHashes[0].toString('hex')) > -1) {
        console.log('already had latest block, ignoring');
        blockHashes = [];
    }
    if(blockHashes.length == 1) {
        self.knownBlockHashes.push(blockHashes[0]);
        console.log('got new block!', blockHashes[0]);
        self.emit('syncstarted', self);
        peer.sendMessage(
            new Messages.GetHeaders([self.getLatestBlockHash()]));
    }
}

Pool.prototype.peerTx = function(peer, message) {
    console.log('peertx', message);
}

Pool.prototype.peerError = function(peer, e) {
    console.log('peererror', e);
    peer.disconnect();
}

Pool.prototype.peerHeaders = function(peer, message) {
    var self = this;
    //console.log('headers response');
    for(var i in message.headers) {
        var blockHeader = new BlockHeader(message.headers[i]);
        // TODO: This won't handle chain forks, it'll just accept the first
        // valid proof on top of the current chain.  It won't be able to find
        // another chain that grows longer than the first one seen.
        if(blockHeader.validProofOfWork()) {
            var prevHash = bufferUtil.reverse(blockHeader.prevHash).toString('hex');
            if(!self.blocks.length && blockHeader.hash) {
                // First block
                self.blocks.push(blockHeader.hash);
            } else if (prevHash == self.getLatestBlockHash()) {
                self.blocks.push(blockHeader.hash);
            } else {
                // TODO: do something better here?
                //console.log('block didnt go on chain');
            }
            var syncedHeight = self.syncedHeight();
            if(syncedHeight > self._bestHeight) {
                self._bestHeight = syncedHeight;
            }
        }
    }

    self.emit('syncprogress', self.syncProgress());
    // If we still have more messages to get
    if(self.syncedHeight() < self.estimatedBlockHeight()) {
        //console.log('getting more headers');
        var lastHeader = message.headers[message.headers.length - 1];
        peer.sendMessage(new Messages.GetHeaders([lastHeader.id]));
    } else {
        self.emit('synccomplete', self);
    }
}

Pool.prototype.disconnect = function() {
    this.connected=false;
    this.pool.disconnect();
}

Pool.prototype.syncProgress = function() {
    var self = this;
    //TODO: this is really crude and crappy atm
    return self.blocks.length /
        (self.estimatedBlockHeight() - self._getStartingCheckpoint()[0])
}

Pool.prototype.estimatedBlockHeight = function() {
    var self = this;
    if(!self.downloadPeer) {
        return 0;
    }
    return Math.max(self._bestHeight, self.syncedHeight());
}

Pool.prototype.syncedHeight = function() {
    var self = this;
    return self._getStartingCheckpoint()[0] + self.blocks.length;
}

Pool.prototype.bestHeight = function() {
    var self = this;
    return Math.max(self.syncedHeight(), self._bestHeight)
}

Pool.prototype.getLatestBlockHash = function() {
    var self = this;
    return self.blocks[self.blocks.length-1]
}

Pool.prototype.timestampForBlockHeight = function(blockHeight) {
    var self = this;
    // TODO:
    //if (blockHeight > self.syncedBlockHeight()) {
        //// future block, assume 10 minutes per block after last block
        //return self.lastBlock.timestamp + (blockHeight - self.lastBlockHeight)*10*60;
    //}
}

Pool.prototype._setDownloadPeer = function(peer) {
    var self = this;
    self.emit('syncstarted', self);
    self.downloadPeer = peer;
    // TODO: For now we always just start with startingBlock, fix that
    peer.sendMessage( new Messages.GetHeaders([self._getStartingCheckpoint()[1]]) );
}

Pool.prototype._getStartingCheckpoint = function() {
    var self = this;
    // TODO: base this on wallet start time (?)
    if(self.network && self.network.alias == 'mainnet') {
        return CHECKPOINTS[CHECKPOINTS.length - 2];
    } else {
        return TESTNET_CHECKPOINTS[TESTNET_CHECKPOINTS.length - 1];
    }
}


module.exports = Pool;