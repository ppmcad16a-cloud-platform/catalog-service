// Duplicated (trimmed) from identity_server/models/user.js, which owns this
// collection. catalog_server needs this registered for two reasons: (1) its
// own auth middleware (config/passport.js) looks up the requesting user by
// id on every authenticated request, and (2) review.js populates the
// review's `user` field. Never creates/updates users. Same shared MongoDB
// database, not a data copy.
const Mongoose = require('mongoose');

const { ROLES, EMAIL_PROVIDER } = require('../constants');

const { Schema } = Mongoose;

const UserSchema = new Schema({
  email: {
    type: String,
    // NOTE: arrow functions don't get their own `this`, so `this.provider`
    // here resolves against the outer module scope (always undefined), not
    // the document being validated — this ternary's `: true` branch is
    // therefore permanently unreachable. Preserved as-is from the original
    // Node monolith's User model, not "fixed" here (this copy never writes
    // users anyway — see the file header).
    required: () => {
      /* istanbul ignore next */
      return this.provider !== 'email' ? false : true;
    }
  },
  phoneNumber: {
    type: String
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  password: {
    type: String
  },
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    default: null
  },
  provider: {
    type: String,
    required: true,
    default: EMAIL_PROVIDER.Email
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    default: ROLES.Member,
    enum: [ROLES.Admin, ROLES.Member, ROLES.Merchant]
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  updated: Date,
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = Mongoose.model('User', UserSchema);
