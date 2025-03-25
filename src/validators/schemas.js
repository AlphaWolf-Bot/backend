const Joi = require('joi');

module.exports = {
  telegramAuth: Joi.object({
    initData: Joi.string().required(),
  }),
  withdraw: Joi.object({
    upi: Joi.string().required(),
  }),
};