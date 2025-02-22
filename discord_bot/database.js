const { googleApiAccess } = require('./config.json');
const firebase = require('firebase-admin');
const { localisedLogging } = require('./logging');

const logger = localisedLogging(new Error(), arguments, this)

firebase.initializeApp({
  credential: firebase.credential.cert(googleApiAccess.serviceAccount)
});
logger.debug({msg: `initialised firebase:`, firebase})

exports.firestore = firebase.firestore();

exports.quizDate = () => {
  const now = new Date(Date.now());
  // allows for up to 4am to be considered as the previous day's quiz
  now.setHours(now.getHours()-4);
  logger.debug({msg: `quizDate():`, returnValue: {code: now.toISOString().slice(0,10), name: now.toDateString()}})
  return {code: now.toISOString().slice(0,10), name: now.toDateString()};
};
