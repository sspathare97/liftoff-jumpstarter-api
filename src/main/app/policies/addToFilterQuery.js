const _ = require('lodash');
const Logger = require('../commons/logger');
const dbUtil = require('../commons/dbUtil');

const defaultCondition = () => true;

module.exports = function addToFilterQuery(
  keysAndValuePaths,
  whenCondition = defaultCondition,
) {
  const addFilters = async (request, h) => {
    Logger.info(
      `${__filename} entry :: (keysAndValuePaths) :: `,
      keysAndValuePaths,
    );

    const cond = await whenCondition(request);
    Logger.info(`${__filename} entry :: (cond) :: `, cond);
    if (cond === false) {
      Logger.info(`${__filename} exit :: skipping condition`);
      return h.continue;
    }

    try {
      Logger.info(
        `${__filename} entry :: (request.query.filters) :: `,
        request.query.filters,
      );

      const query = request.query.filters || '';
      const queryHash = dbUtil.parseQueryString(query);
      _.each(keysAndValuePaths, (valuePath, key) => {
        // for each replacement, remove all operator fields
        _.remove(queryHash, o => _.startsWith(o.key, `${key}.`));
        // replace or add to filter param, based on existence of key
        const keyExists = _.find(queryHash, ['key', key]);
        const value = _.hasIn(request, valuePath)
          ? _.get(request, valuePath)
          : valuePath;
        if (keyExists) {
          _.each(queryHash, o => {
            if (o.key === `${key}`) {
              _.set(o, 'value', value);
            }
          });
        } else {
          queryHash.push({
            key,
            value,
          });
        }
      });

      const serialized = _.join(
        _.compact(
          _.map(
            queryHash,
            kVPair =>
              `${encodeURIComponent(kVPair.key)}=${encodeURIComponent(
                kVPair.value,
              )}`,
          ),
        ),
        '&',
      );

      _.set(request.query, 'filters', serialized);
      Logger.info(
        `${__filename} exit :: (request.query.filters) :: `,
        request.query.filters,
      );
    } catch (err) {
      Logger.error(`${__filename} exit :: `, err);
    }

    return h.continue;
  };

  addFilters.applyPoint = 'onPreHandler';
  return addFilters;
};
