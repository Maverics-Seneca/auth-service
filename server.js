const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

dotenv.config();
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const SECRET_KEY = process.env.JWT_SECRET;

// Initialize Firebase
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(cors({
    origin: 'http://middleware:3001',
    credentials: true,
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Register User
app.post('/api/register', async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await admin.auth().createUser({ email, password, displayName: name });

        await db.collection('users').doc(user.uid).set({
            email,
            name,
            role: role || 'user',
            password: hashedPassword,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'User registered successfully', uid: user.uid });
    } catch (error) {
        res.status(400).json({ message: 'Registration failed', error: error.message });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    console.log("Login request received:", req.body);
    const { email, password } = req.body;

    try {
        const users = await db.collection('users').where('email', '==', email).get();
        if (users.empty) return res.status(401).json({ message: 'Invalid credentials' });

        let userData;
        users.forEach(doc => userData = { id: doc.id, ...doc.data() });

        if (!userData || !(await bcrypt.compare(password, userData.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: userData.id, email: userData.email, role: userData.role, name: userData.name }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ token, userId: userData.id, email: userData.email, name: userData.name });
    } catch (error) {
        console.error("Error in auth-service login:", error.message);
        res.status(500).json({ message: 'Login error', error: error.message });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
      const snapshot = await db.collection('logs').orderBy('timestamp', 'desc').get();
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action,
          userId: data.userId,
          userName: data.userName,
          entity: data.entity,
          entityId: data.entityId,
          entityName: data.entityName,
          details: data.details,
          timestamp: data.timestamp ? data.timestamp.toDate() : null,
        };
      });
      res.json(logs);
    } catch (error) {
      console.error('Error fetching logs from Firebase:', error);
      res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
    }
  });

// Fetch User Data
app.get('/api/user', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        console.log('User data retrieved:', { userId, name: userData.name, email: userData.email });

        res.json({ name: userData.name, email: userData.email });
    } catch (error) {
        console.error('Error fetching user from Firebase:', error);
        res.status(500).json({ error: 'Failed to fetch user data', details: error.message });
    }
});

// Update User Data
app.post('/api/update', async (req, res) => {
    const { userId, name, email, password, currentPassword } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = doc.data();

        // If a new password is provided, verify the current password
        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to change password' });
            }
            const isMatch = await bcrypt.compare(currentPassword, userData.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Incorrect current password' });
            }
        }

        // Prepare update data
        const updateData = {
            name,
            email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10); // Hash new password
        }

        // Update Firestore and Firebase Auth
        await userRef.update(updateData);
        await admin.auth().updateUser(userId, { email, displayName: name });

        console.log('User updated successfully:', { userId });
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user in Firebase:', error);
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
});

// POST - Request Password Reset
app.post("/api/request-password-reset", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log("User exists:", user);

        const resetLink = await admin.auth().generatePasswordResetLink(email);

        const response = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Reset Your Password - MediTrack",
            html: `<p>Click the link below to reset your password:</p>
                   <a href="${resetLink}">Reset Password</a>
                   <p>If you didn’t request this, ignore this email.</p>`,
        });

        console.log("Resend Response:", response);
        return res.json({ message: "Reset email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ error: "Error sending reset email", details: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));