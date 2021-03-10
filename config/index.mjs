import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT,
  MONGODB_URI:
    process.env.NODE_ENV === 'test' ? process.env.MONGODB_URI_TEST : process.env.MONGODB_URI,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  creds: {
    identityMetadata: process.env.identityMetadata,
    clientID: process.env.clientID,
    responseType: process.env.responseType,
    responseMode: process.env.responseMode,
    redirectUrl: process.env.redirectUrl,
    allowHttpForRedirectUrl: process.env.allowHttpForRedirectUrl,
    clientSecret: process.env.clientSecret,
    validateIssuer: process.env.validateIssuer,
    passReqToCallback: process.env.passReqToCallback,
    tenantId: process.env.tenantId,
    destroySessionUrl: process.env.destroySessionUrl,
    issuer: process.env.issuer.split(','),
    domain: process.env.domain,
  },
};
