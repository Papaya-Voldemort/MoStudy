const express = require('express');
const { auth } = require('express-oauth2-jwt-bearer');
const admin = require('firebase-admin');

const app = express();

app.use(express.json());

const jwtCheck = auth({
  audience: 'https://mostudy.org/api',
  issuerBaseURL: 'https://dev-p6gwlkrt2p6bu5m0.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountRaw);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
};

const getFirestore = () => {
  initializeFirebase();
  return admin.firestore();
};

// enforce on all endpoints
app.use(jwtCheck);

app.get('/api/authorized', function (req, res) {
  res.send('Secured Resource');
});

app.get('/api/user-settings', async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return res.json({
        emailNotifications: true,
        timerAlerts: true
      });
    }

    const data = snapshot.data() || {};
    return res.json({
      emailNotifications: data.emailNotifications ?? true,
      timerAlerts: data.timerAlerts ?? true
    });
  } catch (error) {
    console.error('Failed to load settings', error);
    return res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/user-settings', async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emailNotifications = Boolean(req.body?.emailNotifications);
    const timerAlerts = Boolean(req.body?.timerAlerts);

    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    await docRef.set(
      {
        emailNotifications,
        timerAlerts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return res.json({ emailNotifications, timerAlerts });
  } catch (error) {
    console.error('Failed to save settings', error);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Export the app for Vercel Serverless Functions
module.exports = app;
