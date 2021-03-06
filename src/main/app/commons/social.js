/* eslint-disable class-methods-use-this,promise/avoid-new */
const querystring = require('querystring');
const request = require('request');
const Promise = require('bluebird');
const _ = require('lodash');
const Config = require('../../config');

module.exports = class Social {
  constructor(provider) {
    this.provider = provider;
  }

  async request(path, fields) {
    const queryData = querystring.stringify(fields);
    const uri = `${path}?${queryData}`;

    return await new Promise((resolve, reject) => {
      request.get(uri, (err, response, body) => {
        if (err) {
          return reject(err);
        }
        if (!body) {
          return reject(new Error(`No response from ${this.provider}`));
        }
        const data = JSON.parse(body);
        if (data.error) {
          return reject(data.error);
        }
        return resolve(data);
      });
    });
  }

  getProfileDataFromFacebookProfile(profile) {
    return {
      ...profile,
    };
  }

  getProfileDataFromGoogleProfile(profile) {
    return {
      ...profile,
      email: profile.emails[0].email,
    };
  }

  async getProfile(accesstToken, fields) {
    const { profileUrl } = Config.get('social').get(this.provider).toJS();

    const queries = {
      access_token: accesstToken,
    };

    if (!_.isEmpty(fields)) {
      queries.fields = fields;
    }

    const profile = await this.request(profileUrl, queries);

    if (this.provider === 'google') {
      return this.getProfileDataFromGoogleProfile(profile);
    }

    if (this.provider === 'facebook') {
      return this.getProfileDataFromFacebookProfile(profile);
    }
    return profile;
  }
};
