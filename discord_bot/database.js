const { serviceAccount } = require('./config.json');
const firebase = require('firebase-admin');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount)
});

exports.firestore = firebase.firestore();

exports.quizDate = () => {
  const now = new Date(Date.now());
  // allows for up to 4am to be considered as the previous day's quiz
  now.setHours(now.getHours()-4);
  return now.toDateString();
};
