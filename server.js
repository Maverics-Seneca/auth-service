const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET;

// Initialize Firebase
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(cors({ origin: 'http://middleware:5000', credentials: true }));
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
        if (users.empty) {
            console.log("User not found");
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        let userData;
        users.forEach(doc => userData = { id: doc.id, ...doc.data() });

        if (!userData || !userData.password || !(await bcrypt.compare(password, userData.password))) {
            console.log("Password mismatch");
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: userData.id, email: userData.email, role: userData.role }, SECRET_KEY, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'Strict' });

        res.json({ message: 'Login successful', token, userId: userData.id, role: userData.role });
    } catch (error) {
        console.error("Error in auth-service login:", error.message);
        res.status(500).json({ message: 'Login error', error: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
