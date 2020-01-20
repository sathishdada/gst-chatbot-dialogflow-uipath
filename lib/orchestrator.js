'use strict';

// 3rd party
var Orchestrator = require('uipath-orchestrator');
var async = require('async');

var log4js = require('log4js');

var QUEUE_NAME = 'chatbot';
var QUEUE_CHECK_INTERVAL = 5000; // 3 secs
/** @enum */
var QUEUE_ITEM_OUTCOME = {
    UNKNOWN: 'UNKNOWN',
    TIMEOUT: 'TIMEOUT',
    FAILED: 'TIMEOUT',
    SUCCESS: 'SUCCESS'
};

var logger = log4js.getLogger('orchestrator');
/** @type {Orchestrator} */
var orchestrator;

module.exports.setup = function (config) {
    orchestrator = new Orchestrator(config);
	console.log(orchestrator);
};

/**
 * @param {Object.<string|boolean|number|null>} specificData
 * @constructor
 */
function OrchestratorQueueItem(specificData) {
    this.Name = QUEUE_NAME;
    this.SpecificContent = specificData;
    this.Reference = '';
}

/**
 * @param {number} id
 * @param {number} elapsed
 * @param {function(Error, QUEUE_ITEM_OUTCOME, response: Object)} cb
 */
function waitForQueueItemCompletion(id, elapsed, cb) {
    /** @type {number} */
    var before = Date.now();
    orchestrator.v2.odata.getItemProcessingHistory(
        id,
        {},
        function (err, result) {
            /** @type {number} */
            var after;
			console.log(result);
            result = result.value[0];
            if (err) {
                logger.warn(err.message);
                // Should this be an error?
                cb(undefined, QUEUE_ITEM_OUTCOME.UNKNOWN, null);
                return;
            }
            if (result.Status === 'Successful') {
				console.log(result);
				console.log('result');
                cb(undefined, QUEUE_ITEM_OUTCOME.SUCCESS, result);
                return;
            }
            if (result.Status === 'InProgress' || result.Status === 'New') {
                after = Date.now();
                elapsed += (after - before);
                if (elapsed > 10000) {
                    cb(undefined, QUEUE_ITEM_OUTCOME.TIMEOUT, null);
                    return;
                }
                setTimeout(function () {
                    waitForQueueItemCompletion(id, elapsed, cb);
                }, QUEUE_CHECK_INTERVAL);
                return;
            }
            cb(undefined, QUEUE_ITEM_OUTCOME.FAILED, null);
            // TODO handle retried
        }
    );
}

/**
 * @param {string} search
 * @param {function(Error, outcome: string=)} cb
 * type: 'string',
 */
module.exports.amazonSearch = function (search, cb) {
	console.log('in orchestrator');
    async.waterfall([
        function (next) {
            orchestrator.v2.odata.postAddQueueItem(
                {itemData: new OrchestratorQueueItem({
					
                    search: search
                })},
                function (err, response) {
					console.log('in error');
					console.log(search);
                    if (err) {
                        next(err);
                        return;
                    }
                    // Extract the Id  
					console.log('moving to next');
                    next(undefined, response.Id);                 
                }
            );
        },
        function (queueItemId, next) {
            setTimeout(function () {
                waitForQueueItemCompletion(queueItemId, 0, next);
            }, QUEUE_CHECK_INTERVAL);
        },
        /**
         * @param {QUEUE_ITEM_OUTCOME} outcome
         * @param {Object} result
         * @param {function(Error, response: string=)} next
         */
        function (outcome, result, next) {
            /** @type {string} */
            var outputData;
            /** @type {string} */
            var message;
            if (outcome === QUEUE_ITEM_OUTCOME.SUCCESS) {
                try {
                    outputData = JSON.parse(result.OutputData);
                    outputData = outputData.DynamicProperties.text;
                } catch (e) {
                    logger.warn('getItemProcessingHistory: ' + e.message);
                    outputData = undefined;
                }
                if (outputData) {
                    message = '☑ Results from Central Government GST Database:\n' + outputData + '\n Is there anything else that i may assist you with?';
                } else {
                    message = '☑ No matching data is found for the specified category. Do you want to search for a different category?';
                }
                next(undefined, message);
                return;
            }
            logger.warn('Could not process the item: ' + outcome);
            if (outcome === QUEUE_ITEM_OUTCOME.FAILED) {
                next(undefined, 'Item failed to process');
            } else {
                next(undefined, 'Could not confirm the result...');
            }
        }
    ], cb);
};

/*
postAddQueueItem response
{ '@odata.context': 'https://platform.uipath.com/odata/$metadata#queueItem/$entity',
  QueueDefinitionId: 14324,
  OutputData: null,
  Status: 'New',
  ReviewStatus: 'None',
  ReviewerUserId: null,
  Key: '5a8d05fb-6103-4f47-93c7-12dcbc7d97ca',
  Reference: '',
  ProcessingExceptionType: null,
  DueDate: null,
  Priority: 'High',
  DeferDate: null,
  StartProcessing: null,
  EndProcessing: null,
  SecondsInPreviousAttempts: 0,
  AncestorId: null,
  RetryNumber: 0,
  SpecificData: '{"DynamicProperties":{"type":"amazonSearch","search":"keyword keyword keyword"}}',
  CreationTime: '2018-04-13T02:21:42.3860634Z',
  Progress: null,
  RowVersion: 'AAAAAADZ6KU=',
  Id: 2790764,
  ProcessingException: null,
  SpecificContent: { type: 'amazonSearch', search: 'keyword keyword keyword' },
  Output: null }
 */
