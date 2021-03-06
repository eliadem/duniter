"use strict";

const _               = require('underscore');
const co              = require('co');
const Q               = require('q');
const parsers         = require('../lib/streams/parsers');
const rules           = require('../lib/rules');
const constants       = require('../lib/constants');
const blockchainCtx   = require('../lib/computation/blockchainContext');
const blockGenerator  = require('duniter-prover').duniter.methods.blockGenerator;
const Block           = require('../lib/entity/block');
const Identity        = require('../lib/entity/identity');
const Transaction     = require('../lib/entity/transaction');
const AbstractService = require('./AbstractService');

const CHECK_ALL_RULES = true;

module.exports = (server) => {
  return new BlockchainService(server);
};

function BlockchainService (server) {

  AbstractService.call(this);

  let that = this;
  const mainContext = blockchainCtx();
  let conf, dal, logger, selfPubkey;

  this.getContext = () => mainContext;

  this.setConfDAL = (newConf, newDAL, newKeyPair) => {
    dal = newDAL;
    conf = newConf;
    mainContext.setConfDAL(conf, dal);
    selfPubkey = newKeyPair.publicKey;
    logger = require('../lib/logger')(dal.profile);
  };

  const statTests = {
    'newcomers': 'identities',
    'certs': 'certifications',
    'joiners': 'joiners',
    'actives': 'actives',
    'leavers': 'leavers',
    'revoked': 'revoked',
    'excluded': 'excluded',
    'ud': 'dividend',
    'tx': 'transactions'
  };
  const statNames = ['newcomers', 'certs', 'joiners', 'actives', 'leavers', 'revoked', 'excluded', 'ud', 'tx'];

  this.current = () => dal.getCurrentBlockOrNull();

  this.promoted = (number) => co(function *() {
    const bb = yield dal.getPromoted(number);
    if (!bb) throw constants.ERRORS.BLOCK_NOT_FOUND;
    return bb;
  });

  this.checkBlock = function(block) {
    return mainContext.checkBlock(block);
  };

  this.branches = () => co(function *() {
    let forkBlocks = yield dal.blockDAL.getForkBlocks();
    forkBlocks = _.sortBy(forkBlocks, 'number');
    // Get the blocks refering current blockchain
    const forkables = [];
    for (const block of forkBlocks) {
      const refered = yield dal.getBlockByNumberAndHashOrNull(block.number - 1, block.previousHash);
      if (refered) {
        forkables.push(block);
      }
    }
    const branches = getBranches(forkables, _.difference(forkBlocks, forkables));
    const current = yield mainContext.current();
    const forks = branches.map((branch) => branch[branch.length - 1]);
    return forks.concat([current]);
  });

  function getBranches(forkables, others) {
    // All starting branches
    let branches = forkables.map((fork) => [fork]);
    // For each "pending" block, we try to add it to all branches
    for (const other of others) {
      for (let j = 0, len2 = branches.length; j < len2; j++) {
        const branch = branches[j];
        const last = branch[branch.length - 1];
        if (other.number == last.number + 1 && other.previousHash == last.hash) {
          branch.push(other);
        } else if (branch[1]) {
          // We try to find out if another fork block can be forked
          const diff = other.number - branch[0].number;
          if (diff > 0 && branch[diff - 1] && branch[diff - 1].hash == other.previousHash) {
            // We duplicate the branch, and we add the block to this second branch
            branches.push(branch.slice());
            // First we remove the blocks that are not part of the fork
            branch.splice(diff, branch.length - diff);
            branch.push(other);
            j++;
          }
        }
      }
    }
    branches = _.sortBy(branches, (branch) => -branch.length);
    if (branches.length) {
      const maxSize = branches[0].length;
      const longestsBranches = [];
      for (const branch of branches) {
        if (branch.length == maxSize) {
          longestsBranches.push(branch);
        }
      }
      return longestsBranches;
    }
    return [];
  }

  this.submitBlock = (obj, doCheck, forkAllowed) => this.pushFIFO(() => checkAndAddBlock(obj, doCheck, forkAllowed));

  const checkAndAddBlock = (blockToAdd, doCheck, forkAllowed) => co(function *() {
    // Check global format, notably version number
    const obj = parsers.parseBlock.syncWrite(Block.statics.fromJSON(blockToAdd).getRawSigned());
    // Force usage of local currency name, do not accept other currencies documents
    if (conf.currency) {
      obj.currency = conf.currency || obj.currency;
    } else {
      conf.currency = obj.currency;
    }
    try {
      Transaction.statics.cleanSignatories(obj.transactions);
    }
    catch (e) {
      throw e;
    }
    let existing = yield dal.getBlockByNumberAndHashOrNull(obj.number, obj.hash);
    if (existing) {
      throw constants.ERRORS.BLOCK_ALREADY_PROCESSED;
    }
    let current = yield mainContext.current();
    let followsCurrent = !current || (obj.number == current.number + 1 && obj.previousHash == current.hash);
    if (followsCurrent) {
      // try to add it on main blockchain
      if (doCheck) {
        yield mainContext.checkBlock(obj, constants.WITH_SIGNATURES_AND_POW);
      }
      let res = yield mainContext.addBlock(obj);
      try {
        yield pushStatsForBlocks([res]);
      } catch (e) {
        logger.warn("An error occurred after the add of the block", e.stack || e);
      }
      return res;
    } else if (forkAllowed) {
      // add it as side chain
      if (current.number - obj.number + 1 >= conf.forksize) {
        throw 'Block out of fork window';
      }
      let absolute = yield dal.getAbsoluteBlockByNumberAndHash(obj.number, obj.hash);
      let res = null;
      if (!absolute) {
        res = yield mainContext.addSideBlock(obj, doCheck);
      }
      yield that.tryToFork(current);
      return res;
    } else {
      throw "Fork block rejected by " + selfPubkey;
    }
  });


  that.tryToFork = (current) => eventuallySwitchOnSideChain(current);

  const eventuallySwitchOnSideChain = (current) => co(function *() {
    const branches = yield that.branches();
    const blocksAdvance = conf.swichOnTimeAheadBy / (conf.avgGenTime / 60);
    const timeAdvance = conf.swichOnTimeAheadBy * 60;
    let potentials = _.without(branches, current);
    // We switch only to blockchain with X_MIN advance considering both theoretical time by block + written time
    potentials = _.filter(potentials, (p) => p.number - current.number >= blocksAdvance
                                  && p.medianTime - current.medianTime >= timeAdvance);
    logger.trace('SWITCH: %s branches...', branches.length);
    logger.trace('SWITCH: %s potential side chains...', potentials.length);
    for (const potential of potentials) {
      logger.info('SWITCH: get side chain #%s-%s...', potential.number, potential.hash);
      const sideChain = yield getWholeForkBranch(potential);
      logger.info('SWITCH: revert main chain to block #%s...', sideChain[0].number - 1);
      yield revertToBlock(sideChain[0].number - 1);
      try {
        logger.info('SWITCH: apply side chain #%s-%s...', potential.number, potential.hash);
        yield applySideChain(sideChain);
      } catch (e) {
        logger.warn('SWITCH: error %s', e.stack || e);
        // Revert the revert (so we go back to original chain)
        const revertedChain = yield getWholeForkBranch(current);
        yield revertToBlock(revertedChain[0].number - 1);
        yield applySideChain(revertedChain);
        yield markSideChainAsWrong(sideChain);
      }
    }
  });

  const getWholeForkBranch = (topForkBlock) => co(function *() {
    const fullBranch = [];
    let isForkBlock = true;
    let next = topForkBlock;
    while (isForkBlock) {
      fullBranch.push(next);
      logger.trace('SWITCH: get absolute #%s-%s...', next.number - 1, next.previousHash);
      next = yield dal.getAbsoluteBlockByNumberAndHash(next.number - 1, next.previousHash);
      isForkBlock = next.fork;
    }
    //fullBranch.push(next);
    // Revert order so we have a crescending branch
    return fullBranch.reverse();
  });

  const revertToBlock = (number) => co(function *() {
    let nowCurrent = yield that.current();
    logger.trace('SWITCH: main chain current = #%s-%s...', nowCurrent.number, nowCurrent.hash);
    while (nowCurrent.number > number) {
      logger.trace('SWITCH: main chain revert #%s-%s...', nowCurrent.number, nowCurrent.hash);
      yield mainContext.revertCurrentBlock();
      nowCurrent = yield that.current();
    }
  });

  const applySideChain = (chain) => co(function *() {
    for (const block of chain) {
      logger.trace('SWITCH: apply side block #%s-%s -> #%s-%s...', block.number, block.hash, block.number - 1, block.previousHash);
      yield checkAndAddBlock(block, CHECK_ALL_RULES);
    }
  });

  const markSideChainAsWrong = (chain) => co(function *() {
    for (const block of chain) {
      block.wrong = true;
      // Saves the block (DAL)
      yield dal.saveSideBlockInFile(block);
    }
  });

  this.revertCurrentBlock = () => this.pushFIFO(() => mainContext.revertCurrentBlock());

  this.applyNextAvailableFork = () => this.pushFIFO(() => mainContext.applyNextAvailableFork());

  this.requirementsOfIdentities = (identities) => co(function *() {
    let all = [];
    let current = yield dal.getCurrentBlockOrNull();
    for (const obj of identities) {
      let idty = new Identity(obj);
      try {
        let reqs = yield that.requirementsOfIdentity(idty, current);
        all.push(reqs);
      } catch (e) {
        logger.warn(e);
      }
    }
    return all;
  });

  this.requirementsOfIdentity = (idty, current) => co(function *() {
    // TODO: this is not clear
    let expired = false;
    let outdistanced = false;
    let isSentry = false;
    let wasMember = false;
    let expiresMS = 0;
    let expiresPending = 0;
    let certs = [];
    try {
      const generator = blockGenerator(server);
      const join = yield generator.getSinglePreJoinData(current, idty.hash);
      const pubkey = join.identity.pubkey;
      // Check WoT stability
      const someNewcomers = join.identity.wasMember ? [] : [join.identity.pubkey];
      const nextBlockNumber = current ? current.number + 1 : 0;
      const joinData = {};
      joinData[join.identity.pubkey] = join;
      const updates = {};
      const newCerts = yield generator.computeNewCerts(nextBlockNumber, [join.identity.pubkey], joinData, updates);
      const newLinks = generator.newCertsToLinks(newCerts, updates);
      const currentTime = current ? current.medianTime : 0;
      certs = yield that.getValidCerts(pubkey, newCerts);
      outdistanced = yield rules.HELPERS.isOver3Hops(pubkey, newLinks, someNewcomers, current, conf, dal);
      // Expiration of current membershship
      const currentMembership = yield dal.mindexDAL.getReducedMS(pubkey);
      const currentMSN = currentMembership ? parseInt(currentMembership.created_on) : -1;
      if (currentMSN >= 0) {
        if (join.identity.member) {
          const msBlock = yield dal.getBlock(currentMSN);
          if (msBlock && msBlock.medianTime) { // special case for block #0
            expiresMS = Math.max(0, (msBlock.medianTime + conf.msValidity - currentTime));
          }
          else {
            expiresMS = conf.msValidity;
          }
        } else {
          expiresMS = 0;
        }
      }
      // Expiration of pending membership
      const lastJoin = yield dal.lastJoinOfIdentity(idty.hash);
      if (lastJoin) {
        const msBlock = yield dal.getBlock(lastJoin.blockNumber);
        if (msBlock && msBlock.medianTime) { // Special case for block#0
          expiresPending = Math.max(0, (msBlock.medianTime + conf.msValidity - currentTime));
        }
        else {
          expiresPending = conf.msValidity;
        }
      }
      wasMember = idty.wasMember;
      isSentry = idty.member && (yield dal.isSentry(idty.pub, conf));
      // Expiration of certifications
      for (const cert of certs) {
        cert.expiresIn = Math.max(0, cert.timestamp + conf.sigValidity - currentTime);
      }
    } catch (e) {
      // We throw whatever isn't "Too old identity" error
      if (!(e && e.uerr && e.uerr.ucode == constants.ERRORS.TOO_OLD_IDENTITY.uerr.ucode)) {
        throw e;
      } else {
        expired = true;
      }
    }
    return {
      pubkey: idty.pubkey,
      uid: idty.uid,
      meta: {
        timestamp: idty.buid
      },
      revocation_sig: idty.revocation_sig,
      revoked: idty.revoked,
      revoked_on: idty.revoked_on,
      expired: expired,
      outdistanced: outdistanced,
      isSentry: isSentry,
      wasMember: wasMember,
      certifications: certs,
      membershipPendingExpiresIn: expiresPending,
      membershipExpiresIn: expiresMS
    };
  });

  this.getValidCerts = (newcomer, newCerts) => co(function *() {
    const links = yield dal.getValidLinksTo(newcomer);
    const certsFromLinks = links.map((lnk) => { return { from: lnk.issuer, to: lnk.receiver, timestamp: lnk.expires_on - conf.sigValidity }; });
    const certsFromCerts = [];
    const certs = newCerts[newcomer] || [];
    for (const cert of certs) {
      const block = yield dal.getBlock(cert.block_number);
      certsFromCerts.push({
        from: cert.from,
        to: cert.to,
        timestamp: block.medianTime
      });
    }
    return certsFromLinks.concat(certsFromCerts);
  });

  this.isMember = () => dal.isMember(selfPubkey);
  this.getCountOfSelfMadePoW = () => dal.getCountOfPoW(selfPubkey);

  this.saveParametersForRootBlock = (block) => co(function *() {
    let mainFork = mainContext;
    let rootBlock = block || (yield dal.getBlock(0));
    if (!rootBlock) throw 'Cannot registrer currency parameters since no root block exists';
    return mainFork.saveParametersForRootBlock(rootBlock);
  });

  this.saveBlocksInMainBranch = (blocks) => co(function *() {
    // VERY FIRST: parameters, otherwise we compute wrong variables such as UDTime
    if (blocks[0].number == 0) {
      yield that.saveParametersForRootBlock(blocks[0]);
    }
    // Helper to retrieve a block with local cache
    const getBlock = (number) => {
      const firstLocalNumber = blocks[0].number;
      if (number >= firstLocalNumber) {
        let offset = number - firstLocalNumber;
        return Q(blocks[offset]);
      }
      return dal.getBlock(number);
    };
    const getBlockByNumberAndHash = (number, hash) => co(function*() {
      const block = yield getBlock(number);
      if (!block || block.hash != hash) {
        throw 'Block #' + [number, hash].join('-') + ' not found neither in DB nor in applying blocks';
      }
      return block;
    });
    for (const block of blocks) {
      block.fork = false;
    }
    // Transactions recording
    yield mainContext.updateTransactionsForBlocks(blocks, getBlockByNumberAndHash);
    logger.debug(blocks[0].number);
    yield dal.blockDAL.saveBunch(blocks);
    yield pushStatsForBlocks(blocks);
  });

  function pushStatsForBlocks(blocks) {
    const stats = {};
    // Stats
    for (const block of blocks) {
      for (const statName of statNames) {
        if (!stats[statName]) {
          stats[statName] = { blocks: [] };
        }
        const stat = stats[statName];
        const testProperty = statTests[statName];
        const value = block[testProperty];
        const isPositiveValue = value && typeof value != 'object';
        const isNonEmptyArray = value && typeof value == 'object' && value.length > 0;
        if (isPositiveValue || isNonEmptyArray) {
          stat.blocks.push(block.number);
        }
        stat.lastParsedBlock = block.number;
      }
    }
    return dal.pushStats(stats);
  }

  this.blocksBetween = (from, count) => co(function *() {
    if (count > 5000) {
      throw 'Count is too high';
    }
    const current = yield that.current();
    count = Math.min(current.number - from + 1, count);
    if (!current || current.number < from) {
      return [];
    }
    return dal.getBlocksBetween(from, from + count - 1);
  });
}
