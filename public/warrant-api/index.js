const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const PORT = 5000;

// ✅ Load Firebase service account
const serviceAccount = require('./serviceAccountKey.json'); // 🔐 you'll create this next

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

// ✅ Save warrant to Firestore
app.post('/warrants', async (req, res) => {
  const { passengerName, nic, train, date, reason } = req.body;

  if (!passengerName || !nic || !train || !date || !reason) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const docRef = await db.collection('warrants').add({
      passengerName,
      nic,
      train,
      date,
      reason,
      status: 'pending',
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Warrant booked!', id: docRef.id });
  } catch (error) {
    console.error("Firebase error:", error);
    res.status(500).json({ error: 'Failed to book warrant' });
  }
});

// ✅ Get all warrants
app.get('/warrants', async (req, res) => {
  try {
    const snapshot = await db.collection('warrants').orderBy('createdAt', 'desc').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warrants' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Warrant API on http://localhost:${PORT}`);
});
