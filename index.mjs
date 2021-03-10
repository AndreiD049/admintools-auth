import express from 'express';
import session from 'express-session';
import { init } from './mongoConnect.mjs';
import redis from 'redis';
import connectRedis from 'connect-redis';
import passport from 'passport';
import { OIDCStrategy } from 'passport-azure-ad';
import config from './config/index.mjs';
import UserModel from './models/UserModel.mjs';

const port = 3003;
// Init mongodb connection
init();

// Init redis connection
const redisStore = new connectRedis(session);
const redisClient = redis.createClient({
  host: 'redis',
  password: config.REDIS_PASSWORD,
});

const app = express();
// Set app store :)
app.store = new redisStore({
  client: redisClient,
});

app.use(express.urlencoded());
app.use(express.json());

app.use(
  session({
    secret: config.creds.clientSecret,
    resave: true,
    saveUninitialized: false,
    store: app.store,
    cookie: {
      sameSite: false,
      maxAge: 5 * 24 * 60 * 60 * 1000,
      domain: config.creds.domain,
    },
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.oid);
});

passport.deserializeUser((oid, done) => {
  app.store.get(oid, async (err, session) => {
    if (err) {
      done(err, null);
    }
    done(null, session);
  });
});

passport.use(
  new OIDCStrategy(
    {
      identityMetadata: config.creds.identityMetadata,
      clientID: config.creds.clientID,
      responseType: config.creds.responseType,
      responseMode: config.creds.responseMode,
      redirectUrl: config.creds.redirectUrl,
      allowHttpForRedirectUrl: true,
      clientSecret: config.creds.clientSecret,
      passReqToCallback: false,
      validateIssuer: true,
      isB2C: false,
      issuer: config.creds.issuer,
      scope: ['profile'],
      useCookieInsteadOfSession: false,
      nonceLifetime: null,
      nonceMaxAmount: 5,
      clockSkew: null,
    },
    async (iss, sub, profile, accessToken, refreshToken, done) => {
      if (!profile.oid) {
        return done(new Error('No oid found'), null);
      }
      // before attaching it to the req, add the info from mongo db
      let dbUser = (await UserModel.findOne({
        username: profile._json.preferred_username,
      }))?.toJSON();

      if (!dbUser) {
        // Add the user to the DB
        const inserted = (await UserModel.create({
          username: profile._json.preferred_username,
        }));
        await inserted.save();
        dbUser = (await UserModel.findOne({
          username: profile._json.preferred_username,
        }))?.toJSON();
      }
      dbUser = dbUser;
      const sessionUser = {
        oid: profile.oid,
        id: dbUser._id,
        displayName: profile.displayName,
        name: profile.name,
        ...dbUser,
      };
      process.nextTick(() => {
        app.store.set(profile.oid, sessionUser, (err) => {
          if (err) {
            return done(err, null);
          }
          return done(null, sessionUser);
        });
      });
    },
  ),
);
app.use(passport.initialize());
app.use(passport.session());

app.get(
  '/auth/login',
  (req, res, next) => {
    try {
      passport.authenticate('azuread-openidconnect', {
        response: res,
        failureRedirect: '/login',
      })(req, res, next);
    } catch (err) {
      req.session.destroy();
      next(err);
    }
  },
  (req, res) => {
    res.redirect('/');
  },
);

app.get('/auth/logout', (req, res) => {
  req.session.destroy(function (err) {
    req.logout();
    res.clearCookie('connect.sid')
    res.redirect(config.creds.destroySessionUrl);
  });
});

app.post(
  '/auth/openid/return',
  (req, res, next) => {
    passport.authenticate('azuread-openidconnect', {
      response: res,
      failureRedirect: '/login',
    })(req, res, next);
  },
  (req, res) => {
    res.redirect('/');
  },
);

app.get('/auth/validate', async (req, res) => {
  if (req.user) {
    // Get the latest user updates
    res.header('user', JSON.stringify(req.user));
  } else {
    res.header('user', null);
  }
  res.status(200).end();
});

app.listen(port, () => {
  console.log(`Auth service started on port ${port}.`);
});
