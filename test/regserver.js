var ucoin  = require('./..');
var async  = require('async');
var should = require('should');
var fs     = require('fs');

var pubkeyCat = fs.readFileSync(__dirname + '/data/lolcat.pub', 'utf8');
var pubkeyUbot1 = fs.readFileSync(__dirname + '/data/ubot1.pub', 'utf8');
var privkeyUbot1 = fs.readFileSync(__dirname + '/data/ubot1.priv', 'utf8');

describe('A server', function () {

  this.timeout(1000*20);

  var regServer;
  beforeEach(function (done) {
    if (regServer) {
      regServer.disconnect();
    }
    regServer = ucoin.createRegistryServer({ name: 'hdc3' }, {
      pgpkey: privkeyUbot1,
      pgppasswd: 'ubot1',
      currency: 'beta_brousouf',
      ipv4: '127.0.0.1',
      remoteipv4: '127.0.0.1',
      port: 8090,
      remoteport: 8090,
      kmanagement: 'ALL',
      createNext: true,
      sync: {
        "AMStart": 1398895200,
        "AMFreq": 86400,
        "UDFreq": 172800,
        "UD0": 100,
        "UDPercent": 0.1,
        "Consensus": 0.33,
        "MSExpires": 15778800,
        "VTExpires": 15778800,
        "AMDaemon" : "OFF",
        "Algorithm" : "AnyKey"
      }
    });
    async.waterfall([
      function (next){
        regServer.reset(next);
      },
      function (next){
        regServer.listenBMA({}, next);
      },
    ], done);
  })
  
  // it('Peer should emit error on wrong data type', function (done) {
  //   regServer.on('error', function (err) {
  //     should.exist(err);
  //     done();
  //   });
  //   regServer.write({ some: 'data' });
  // });
  
  // it('Peer should accept pubkeys', function (done) {
  //   regServer.on('pubkey', function (pubkey) {
  //     should.exist(pubkey);
  //     done();
  //   });
  //   regServer.write({ pubkey: pubkeyCat });
  // });
  
  // it('Peer should accept forwards & status', function (done) {
  //   async.parallel({
  //     forward: until(regServer, 'forward'),
  //     status:  until(regServer, 'status'),
  //     wallet:  until(regServer, 'wallet'),
  //   }, done);
  //   regServer.write({ pubkey: pubkeyCat });
  //   regServer.write({
  //     "version": "1",
  //     "currency": "beta_brousouf",
  //     "fingerprint": "C73882B64B7E72237A2F460CE9CAB76D19A8651E",
  //     "endpoints": [
  //       "BASIC_MERKLED_API 127.0.0.1 8080"
  //     ],
  //     "keyID": "E9CAB76D19A8651E",
  //     "signature": "-----BEGIN PGP SIGNATURE-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nwsBcBAEBCAAQBQJTlsmOCRDpyrdtGahlHgAAGPoIANAv8Q6PtaLuCzD9aDH+\nue9G10QNsXBCOIErj7wocmct3Y9yeYBwyAfth+ia0K/YDgygOY+n1yKid6QD\nlEOaDSENcdONZlYO/zAHDu6vQR/zsAPyztRCp0TSOCxQcQV2xSFkSvUSF8g2\noNI8RETgpLIlbKE8sS3F4v5OcxSa6wkhgngqRL6ZmqYqTPzgsAXlguA/Tq48\nNwRUQZBeP/TnMvnhhaZeww5qgxMNKWAMIjv7RUvMoP+YMMwSpgIKD3QYOhFK\nZLfYnxhiS/1jtJ+GTVdPLr5MNjLnNAc195aBT7OGi2frIsr7Qhz6TdMQnh0b\n39ohs+qaacQFbPS8qyVbhsM=\r\n=0nGP\r\n-----END PGP SIGNATURE-----\r\n"
  //   });
  //   regServer.write({
  //     "version": "1",
  //     "currency": "beta_brousouf",
  //     "from": "C73882B64B7E72237A2F460CE9CAB76D19A8651E",
  //     "to": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
  //     "keyID": "E9CAB76D19A8651E",
  //     "forward": "ALL",
  //     "signature": "-----BEGIN PGP SIGNATURE-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nwsBcBAEBCAAQBQJThMLbCRAIe6NRwK623wAA3GMIAIvzPBWfTZfR27vJM0v+\nU5Tv1ro8G2zrBGaTG+qe5ZXNxjgtKjtx6v1XY3zDo8s8IEAoTt09mp5M+Iz9\nPQ1eD3ThPF5Eulc+ZfN8Gqahwqro0gU0YJ6VetXdTsULNm9FJOEy3xToTcvu\nR9bmRNwrIoBRLVECRl5nRcgXCN2ETw7rejVlWSKQbNJKnh13cd65pJIYe4z6\nLDic65WyV5RL12H33F0yoEkL5Srq54iGsqtDjSKH4pCclKOc2tbmqQtS6DDQ\nggPOGrkNAbm3T7fii+UQfmT820gz938iYs/8x3kvQuWOYJgNdbfjbBi+qmg5\nZz3+PPOaiWzLKhdul/rFk5M=\r\n=alII\r\n-----END PGP SIGNATURE-----\r\n"
  //   });
  //   regServer.write({
  //     "version": "1",
  //     "currency": "beta_brousouf",
  //     "status": "UP",
  //     "keyID": "E9CAB76D19A8651E"
  //   });
  //   regServer.write({
  //     "version": "1",
  //     "currency": "beta_brousouf",
  //     "fingerprint": "C73882B64B7E72237A2F460CE9CAB76D19A8651E",
  //     "requiredTrusts": 1,
  //     "hosters": [
  //       "2E69197FAB029D8669EF85E82457A1587CA0ED9C",
  //       "C73882B64B7E72237A2F460CE9CAB76D19A8651E"
  //     ],
  //     "trusts": [
  //       "2E69197FAB029D8669EF85E82457A1587CA0ED9C",
  //       "C73882B64B7E72237A2F460CE9CAB76D19A8651E"
  //     ],
  //     "keyID": "E9CAB76D19A8651E",
  //     "signature": "-----BEGIN PGP SIGNATURE-----\nVersion: GnuPG v1\n\niQEcBAABCAAGBQJTltBaAAoJED0ZtAvOQO311hYH/RxCRmDbpGZ4OKsJ283MjHI1\nu1Teh/SDWuTjeGld8m76v7Yu61PA4vb4YzTldNvGg1sBoFKy2yH/UXTxTuM2WOJh\nVnzb1BhR4Nbl3+N4E7q/0JndTv+N34c4z3gltOJJQ1VtudYFEnzRxxJPsgc8OTTm\nWmwNUu8lUE3MEI3P10TXfKcU+WmATYj2+VtK6GHjKAqjY5Lnctz94nyHLr2M5+7E\nkJ/9CkXKulTG3qTpwFL3HsILQJO93CGXjDFrdbWcq+RIRbMXWnM4ibQf7lQ1TMKK\n7Z8rKWvyGn6sHkM34OcAPd2dORwtxuCTMLtcHFUp5lxXWkT/CZEGOh9XlcilVXc=\n=ylC/\n-----END PGP SIGNATURE-----\n",
  //   });
  // });
  
  // it('Peer should accept peerings', function (done) {
  //   regServer.on('peer', function (peer) {
  //     should.exist(peer);
  //     done();
  //   });
  //   regServer.write({
  //     "version": "1",
  //     "currency": "beta_brousouf",
  //     "fingerprint": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
  //     "keyID": "087BA351C0AEB6DF",
  //     "endpoints": [
  //       "BASIC_MERKLED_API 88.163.127.43 9101"
  //     ],
  //     "status": "UP",
  //     "signature": "-----BEGIN PGP SIGNATURE-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nwsBcBAEBCAAQBQJThMLbCRAIe6NRwK623wAA3GMIAIvzPBWfTZfR27vJM0v+\nU5Tv1ro8G2zrBGaTG+qe5ZXNxjgtKjtx6v1XY3zDo8s8IEAoTt09mp5M+Iz9\nPQ1eD3ThPF5Eulc+ZfN8Gqahwqro0gU0YJ6VetXdTsULNm9FJOEy3xToTcvu\nR9bmRNwrIoBRLVECRl5nRcgXCN2ETw7rejVlWSKQbNJKnh13cd65pJIYe4z6\nLDic65WyV5RL12H33F0yoEkL5Srq54iGsqtDjSKH4pCclKOc2tbmqQtS6DDQ\nggPOGrkNAbm3T7fii+UQfmT820gz938iYs/8x3kvQuWOYJgNdbfjbBi+qmg5\nZz3+PPOaiWzLKhdul/rFk5M=\r\n=alII\r\n-----END PGP SIGNATURE-----\r\n"
  //   });
  // });
  
  it('Peer should accept transactions', function (done) {
    async.parallel([
      until(regServer, 'pubkey'),
      until(regServer, 'vote', 3),
      until(regServer, 'transaction'),
      until(regServer, 'membership'),
      until(regServer, 'voting'),
      until(regServer, 'communityflow'),
    ], done);
    // regServer.write({ pubkey: pubkeyUbot1 });
    regServer.write({ pubkey: pubkeyCat });
    regServer.write({
      "version": "1",
      "currency": "beta_brousouf",
      "registry": "MEMBERSHIP",
      "issuer": "C73882B64B7E72237A2F460CE9CAB76D19A8651E",
      "membership": "IN",
      "date": new Date(1398906000*1000),
      "sigDate": new Date(1401209569*1000),
      "signature": "-----BEGIN PGP SIGNATURE-----\nVersion: GnuPG v1\n\niQEcBAABCAAGBQJThMLhAAoJED0ZtAvOQO313bIH/jKZYnD0MBHlOPSRmojVuH33\n6EHbuK3JBJgPL6RtHW0OAXYRHN+7sLKcAIF3SxhoKapFcjO+JaJj8GtlyzvEhAEn\nqgJvDirMEJWiTZSf7YDyj1B6125eW8qMtvK+UnngZPHHI6+lQJVUOLdMoAo6aCad\n4hpsjYn5jQRxBCA2BqkyGccSfS2uH2kYRxZOM0H3/jMwCy9ieJ6SMLhV8ez4R+n+\nIyOuzuSCC4vqT6RFzThp9BhqxJoTRDxvMipqW2rKPaBscPAqmieYhwSaWaYDW0ec\ndV8kjDbVEhkWNrG30njkxLKbcLggVhXdTUoPwzzwu4G7WDwcniJKuFW6mzPD5b8=\n=QveX\n-----END PGP SIGNATURE-----\n",
    });
    regServer.write({
      "version": "1",
      "currency": "beta_brousouf",
      "registry": "VOTING",
      "issuer": "C73882B64B7E72237A2F460CE9CAB76D19A8651E",
      "date": new Date(1398906000*1000),
      "sigDate": new Date(1401209571*1000),
      "signature": "-----BEGIN PGP SIGNATURE-----\nVersion: GnuPG v1\n\niQEcBAABCAAGBQJThMLjAAoJEAh7o1HArrbf3EMH/jB1W0RJahpQzf653zu79GOe\nSuolSa9LNe5dCmoAlQ5ilCcf6amQDrZ5JmY/8DC7q2IkNMaOaUQ/sQbtAbXjzBhI\nM3zDBiUzX6J9IZ+DjuMPR98AoCORG6+1SA/ed6Je6j/hmSVx/F14PD2NjId7My9H\ne5eg74RdziqmerDfA0AENPxRWc418ah+MZi8NdXHl6r/oPuQX2oucFuAawtKFEL5\n53yLcEI3iXRCfnx724O6D5oh2iD/09sfUFv7Mqd3EmUAB0VCDH6VhZ6QSDeDHmu4\nQhPoJVTtb4YzHeAHVQI7bpgboLpwWKEuXAQPvTHRt2LsB5Vmjl5f55WMldwo3BM=\n=qtq7\n-----END PGP SIGNATURE-----\n",
    });
    regServer.write({
      amendment: {
        "version": 1,
        "number": 0,
        "generated": 1398895200,
        "nextVotes": 1,
        "dividend": null,
        "coinBase": null,
        "votersCount": 1,
        "membersCount": 3,
        "currency": "beta_brousouf",
        "votersRoot": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
        "membersRoot": "2A22E19061A41EB95F628F7EFB8FB2DAF6BAB4FE",
        "coinAlgo": "Base2Draft",
        "previousHash": null,
        "coinList": [],
        "votersChanges": [
          "+D049002A6724D35F867F64CC087BA351C0AEB6DF"
        ],
        "membersChanges": [
          "+2E69197FAB029D8669EF85E82457A1587CA0ED9C",
          "+C73882B64B7E72237A2F460CE9CAB76D19A8651E",
          "+D049002A6724D35F867F64CC087BA351C0AEB6DF"
        ]
      },
      "issuer": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
      "sigDate": new Date()
    });
    regServer.write({
      amendment: {
        "version": 1,
        "number": 1,
        "generated": 1398981600,
        "nextVotes": 1,
        "dividend": null,
        "coinBase": null,
        "votersCount": 1,
        "membersCount": 3,
        "currency": "beta_brousouf",
        "votersRoot": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
        "membersRoot": "2A22E19061A41EB95F628F7EFB8FB2DAF6BAB4FE",
        "coinAlgo": "Base2Draft",
        "previousHash": "65A55999086155BF6D3E4EB5D475E46E4E2307D2",
        "coinList": [],
        "votersChanges": [],
        "membersChanges": []
      },
      "issuer": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
      "sigDate": new Date()
    });
    regServer.write({
      amendment: {
        "version": 1,
        "number": 2,
        "generated": 1399068000,
        "nextVotes": 1,
        "dividend": 100,
        "coinBase": 0,
        "votersCount": 1,
        "membersCount": 3,
        "currency": "beta_brousouf",
        "votersRoot": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
        "membersRoot": "2A22E19061A41EB95F628F7EFB8FB2DAF6BAB4FE",
        "coinAlgo": "Base2Draft",
        "previousHash": "8EDE25D246E3402A6D5AF31B1D9AA02239B80452",
        "coinList": [
          26,
          7,
          5,
          3,
          1
        ],
        "votersChanges": [],
        "membersChanges": []
      },
      "issuer": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
      "sigDate": new Date()
    });
    regServer.write({
      "signature": "-----BEGIN PGP SIGNATURE-----\r\nVersion: GnuPG v1.4.15 (GNU/Linux)\r\n\r\niQEcBAABAgAGBQJThe/DAAoJEDwCajRJsiQWeaUH/iAtPE1yph+7+1SxmCvJ1NaT\r\ngyyI5t86b72NmgslAoexC5xsPUnwwZPBUjMCR0xLO4x1FOEwYoMYyKCvNRKdKbKe\r\nDQ1z+chCMP+sHMl/4PG7di4PT+OE5Oqgrbi8Gq1HRA4l5iamyxOoInNUoSCjxe2g\r\n4HFLPN40Hv9ovWKDlKx14hTVbN2xlnAwf3LlCOiCQsC+YWCvawAbwWL1PBvNJmF8\r\ntAW3fjFKbMlzkTLMgAWUUviozZUedScgVQ443TMxJdvnh+SCDoLqNI573I7lRy41\r\n3DzGp913OU4iTFcgHCK6XnvNw3ycqYpdIW22rniWJewartHJJQfFWX1VAMSfhIc=\r\n=QxTg\r\n-----END PGP SIGNATURE-----\r\n",
      "version": 1,
      "currency": "beta_brousouf",
      "sender": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
      "number": 0,
      "previousHash": null,
      "recipient": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
      "coins": [
        "D049002A6724D35F867F64CC087BA351C0AEB6DF-2-12",
        "D049002A6724D35F867F64CC087BA351C0AEB6DF-2-14"
      ],
      "sigDate": new Date(),
      "comment": "",
    });
    regServer.write({
      "signature": "-----BEGIN PGP SIGNATURE-----\r\nVersion: GnuPG v1.4.15 (GNU/Linux)\r\n\r\niQEcBAABAgAGBQJThe/DAAoJEDwCajRJsiQWeaUH/iAtPE1yph+7+1SxmCvJ1NaT\r\ngyyI5t86b72NmgslAoexC5xsPUnwwZPBUjMCR0xLO4x1FOEwYoMYyKCvNRKdKbKe\r\nDQ1z+chCMP+sHMl/4PG7di4PT+OE5Oqgrbi8Gq1HRA4l5iamyxOoInNUoSCjxe2g\r\n4HFLPN40Hv9ovWKDlKx14hTVbN2xlnAwf3LlCOiCQsC+YWCvawAbwWL1PBvNJmF8\r\ntAW3fjFKbMlzkTLMgAWUUviozZUedScgVQ443TMxJdvnh+SCDoLqNI573I7lRy41\r\n3DzGp913OU4iTFcgHCK6XnvNw3ycqYpdIW22rniWJewartHJJQfFWX1VAMSfhIc=\r\n=QxTg\r\n-----END PGP SIGNATURE-----\r\n",
      "version": 1,
      "currency": "beta_brousouf",
      "amendmentNumber": 2,
      "amendmentHash": "2694D9AEA40866A0D6F01C719607007ABC075E84",
      "issuer": "D049002A6724D35F867F64CC087BA351C0AEB6DF",
      "date": new Date(),
      "algorithm": "AnyKey",
      "sigDate": new Date(),
      "selfGenerated": true
    });
  });
})

function until (server, eventName, count) {
  var counted = 0;
  var max = count == undefined ? 1 : count;
  return function (callback) {
    server.on(eventName, function (obj) {
      console.log('event = %s', eventName);
      should.exist(obj);
      counted++;
      if (counted == max)
        callback();
    });
  }
}
