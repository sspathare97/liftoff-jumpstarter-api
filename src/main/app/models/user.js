/* eslint-disable class-methods-use-this,newline-per-chained-call */
import Bcrypt from 'bcrypt';
import Logger from 'winston';
import Joi from 'joi';
import Uuid from 'node-uuid';
import BaseModel from './base';
import PhoneJoiValidator from '../commons/phoneJoiValidator';
import EmailBlackListValidator from '../commons/emailBlackListValidator';

export default class User extends BaseModel {
  static get tableName() {
    return 'users';
  }

  static entityFilteringScope() {
    return {
      admin: ['encryptedPassword', 'passwordSalt'],
      user: ['phoneToken', 'isPhoneVerified', 'emailToken', 'isEmailVerified',
        'encryptedPassword', 'passwordSalt', 'resetPasswordToken', 'resetPasswordSentAt'
      ],
      guest: ['phoneToken', 'isPhoneVerified', 'emailToken', 'isEmailVerified',
        'encryptedPassword', 'passwordSalt', 'resetPasswordToken', 'resetPasswordSentAt',
        'socialLogins'
      ]
    };
  }

  static validatorRules() {
    const rules = {
      userId: Joi.number().integer().positive().description('User Id'),
      userName: Joi.string().trim().alphanum().min(3).max(30).description('User Name'),
      name: Joi.string().trim().min(3).max(255).description('Name'),
      password: Joi.string().trim().regex(/^[a-zA-Z0-9]{8,30}$/).description('Password'),
      email: EmailBlackListValidator.email().isBlacklisted().description('Email'),
      phoneNumber: PhoneJoiValidator.phone().e164format().description('phone number'),
      isAdmin: Joi.boolean().default(false).description('Admin?'),
      accessToken: Joi.string().trim().description('Access token'),
      refreshToken: Joi.string().trim().description('Refresh token'),
      rawBody: Joi.string().description('raw social data'),
      resetPasswordToken: Joi.string().trim().uuid().description('Reset password token'),
      avatarUrl: Joi.string().trim().description('Avatar URL')
    };
    return rules;
  }

  presaveHook() {
    // if this is new object..
    if (!this.id) {
      this.isAdmin = false;
      this.userName = Uuid.v4();
    }

    this.hashPassword();
  }

  static get relationMappings() {
    return {
      socialLogins: {
        relation: BaseModel.HasManyRelation,
        modelClass: `${__dirname}/socialLogin`,
        join: {
          from: 'users.id',
          to: 'social_logins.userId'
        }
      }
    };
  }

  hashPassword() {
    if (this.encryptedPassword) {
      if (this.encryptedPassword.indexOf('$2a$') === 0 && this.encryptedPassword.length === 60) {
        // The password is already hashed. It can be the case when the instance is loaded from DB
        this.encryptedPassword = this.encryptedPassword;
      } else {
        this.passwordSalt = Bcrypt.genSaltSync(10);
        this.encryptedPassword = this.encryptPassword(this.encryptedPassword, this.passwordSalt);
      }
    }
    Logger.info('afteer hashPassword');
  }

  verifyPassword(password) {
    return this.encryptPassword(password, this.passwordSalt) === this.encryptedPassword;
  }

  encryptPassword(pwd, passwordSalt) {
    return Bcrypt.hashSync(pwd, passwordSalt);
  }
}