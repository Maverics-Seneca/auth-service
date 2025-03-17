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

// Logging function
async function logChange(action, userId, entity, entityId, entityName, details) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        await db.collection('logs').add({
            action,
            userId,
            userName: userData.name || 'Unknown',
            entity,
            entityId,
            entityName,
            details,
            organizationId: userData.organizationId || null, // Include organizationId
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Logged ${action} for ${entity} with ID ${entityId}`);
    } catch (error) {
        console.error('Error logging change:', error);
    }
}

// Register User (Admin-specific endpoint)
app.post('/api/register-admin', async (req, res) => {
    console.log('Register admin request received:', req.body);
    const { name, email, phone, password, organizationId, role } = req.body;

    if (!name || !email || !phone || !password || !organizationId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if email already exists
        const users = await db.collection('users').where('email', '==', email).get();
        if (!users.empty) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with organizationId
        const userRef = await db.collection('users').add({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'admin', // Default to 'admin' if not provided
            organizationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logChange('REGISTER_ADMIN', userRef.id, 'User', userRef.id, name, { data: { email, organizationId } });
        res.json({ message: 'Admin registered successfully', userId: userRef.id });
    } catch (error) {
        console.error('Error registering admin:', error.message);
        res.status(500).json({ message: 'Failed to register admin', error: error.message });
    }
});

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

        await logChange('REGISTER', user.uid, 'User', user.uid, name, { data: { email, name, role } });
        res.status(201).json({ message: 'User registered successfully', uid: user.uid });
    } catch (error) {
        res.status(400).json({ message: 'Registration failed', error: error.message });
    }
});

// Create Organization
app.post('/api/organization/create', async (req, res) => {
    console.log('Create organization request received:', req.body);
    const { userId, name, description } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ message: 'User ID and name are required' });
    }

    try {
        const orgRef = await db.collection('organizations').add({
            userId,
            name,
            description: description || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logChange('CREATE_ORGANIZATION', userId, 'Organization', orgRef.id, name, { data: { description } });
        res.status(201).json({ organizationId: orgRef.id, message: 'Organization created successfully' });
    } catch (error) {
        console.error('Error creating organization:', error.message);
        res.status(500).json({ message: 'Failed to create organization', error: error.message });
    }
});

// Get All Organizations for a User
app.get('/api/organization/get', async (req, res) => {
    const { userId } = req.query;
    console.log('Get organizations request for user:', userId);

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const snapshot = await db.collection('organizations')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const organizations = snapshot.docs.map(doc => ({
            organizationId: doc.id,
            ...doc.data()
        }));
        console.log('Fetched organizations from Firestore:', organizations); // Add this

        res.json(organizations);
    } catch (error) {
        console.error('Error fetching organizations:', error.message);
        res.status(500).json({ message: 'Failed to fetch organizations', error: error.message });
    }
});

// Fetch all organizations
app.get('/api/organization/get-all', async (req, res) => {
    console.log('Get all organizations request received');

    try {
        const snapshot = await db.collection('organizations').get();
        const organizations = snapshot.docs.map(doc => ({
            organizationId: doc.id,
            name: doc.data().name
        }));
        console.log('Fetched all organizations from Firestore:', organizations);

        res.json(organizations);
    } catch (error) {
        console.error('Error fetching all organizations:', error.message);
        res.status(500).json({ message: 'Failed to fetch organizations', error: error.message });
    }
});

// Update Organization
app.put('/api/organization/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, name, description } = req.body;
    console.log('Update organization request received for ID:', id);

    try {
        const orgRef = db.collection('organizations').doc(id);
        const doc = await orgRef.get();
        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized or organization not found' });
        }

        await orgRef.update({
            name,
            description,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logChange('UPDATE_ORGANIZATION', userId, 'Organization', id, name, { data: { description } });
        res.status(200).json({ message: 'Organization updated successfully' });
    } catch (error) {
        console.error('Error updating organization:', error.message);
        res.status(500).json({ message: 'Failed to update organization', error: error.message });
    }
});

// Delete Organization
app.delete('/api/organization/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    console.log('Delete organization request received for ID:', id);

    try {
        const orgRef = db.collection('organizations').doc(id);
        const doc = await orgRef.get();
        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized or organization not found' });
        }

        const orgName = doc.data().name;
        await orgRef.delete();
        await logChange('DELETE_ORGANIZATION', userId, 'Organization', id, orgName, {});
        res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error) {
        console.error('Error deleting organization:', error.message);
        res.status(500).json({ message: 'Failed to delete organization', error: error.message });
    }
});

// Auth Service (auth-service.js)
app.get('/api/get-all-admins', async (req, res) => {
    console.log('Get all admins request received');

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .orderBy('createdAt', 'desc')
            .get();

        const admins = snapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data()
        }));
        console.log('Fetched admins from Firestore:', admins);

        res.json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error.message);
        res.status(500).json({ message: 'Failed to fetch admins', error: error.message });
    }
});

// Auth Service (auth-service.js)

app.post('/api/update-admin/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, organizationId } = req.body;
    console.log('Update admin request received for id:', id, 'data:', req.body);

    if (!name || !email || !phone || !organizationId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(404).json({ message: 'Admin not found' });
        }

        await userRef.update({
            name,
            email,
            phone,
            organizationId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logChange('UPDATE_ADMIN', id, 'User', id, name, { data: { email, organizationId } });
        res.json({ message: 'Admin updated successfully' });
    } catch (error) {
        console.error('Error updating admin:', error.message);
        res.status(500).json({ message: 'Failed to update admin', error: error.message });
    }
});

app.delete('/api/delete-admin/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Delete admin request received for id:', id);

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(404).json({ message: 'Admin not found' });
        }

        await userRef.delete();
        await logChange('DELETE_ADMIN', id, 'User', id, userDoc.data().name, { data: { email: userDoc.data().email } });
        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin:', error.message);
        res.status(500).json({ message: 'Failed to delete admin', error: error.message });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    console.log("Login request received:", req.body);
    const { email, password } = req.body;

    try {
        const users = await admin.firestore().collection('users').where('email', '==', email).get();
        if (users.empty) return res.status(401).json({ message: 'Invalid credentials' });

        let userData;
        users.forEach(doc => userData = { id: doc.id, ...doc.data() });
        console.log('User data from Firestore:', userData);

        if (!userData || !(await bcrypt.compare(password, userData.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: userData.id, email: userData.email, role: userData.role, name: userData.name, organizationId: userData.organizationId },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        await logChange('LOGIN', userData.id, 'User', userData.id, userData.name, { data: { email } });
        res.json({
            token,
            userId: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            organizationId: userData.organizationId
        });
    } catch (error) {
        console.error("Error in auth-service login:", error.message);
        res.status(500).json({ message: 'Login error', error: error.message });
    }
});

app.get('/api/logs', async (req, res) => {
    const { userId, role } = req.query; // Expect userId and role from the request
    console.log('Fetching logs for user:', userId, 'with role:', role);

    try {
        let query = db.collection('logs').orderBy('timestamp', 'desc');

        // Filter logs based on role
        if (role === 'admin') {
            // Admins see logs related to their scope, excluding owner-specific actions
            query = query.where('action', 'not-in', ['REGISTER_ADMIN', 'UPDATE_ADMIN', 'DELETE_ADMIN', 'CREATE_ORGANIZATION', 'UPDATE_ORGANIZATION', 'DELETE_ORGANIZATION']);
            // Optionally filter by organization if admins are scoped to one
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().organizationId) {
                query = query.where('organizationId', '==', userDoc.data().organizationId);
            }
        }
        // Owners see all logs, no additional filtering needed

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                action: data.action,
                userId: data.userId || data.user, // Fallback for older logs
                userName: data.userName,
                entity: data.entity,
                entityId: data.entityId,
                entityName: data.entityName,
                details: data.details,
                timestamp: data.timestamp ? data.timestamp.toDate() : null,
                organizationId: data.organizationId || null // Include organizationId if present
            };
        });

        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs from Firebase:', error);
        res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    const { organizationId, role } = req.query;
    try {
        let query = admin.firestore().collection('users');
        if (organizationId) query = query.where('organizationId', '==', organizationId);
        if (role) query = query.where('role', '==', role);

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
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

// Create a new user (patient)
app.post('/api/users', async (req, res) => {
    const { email, name, phone, dob, password, role, organizationId } = req.body;
    try {
        console.log('Creating new patient in Firestore:', { email, name, phone, role, organizationId });
        const userRef = await admin.firestore().collection('users').add({
            email,
            name,
            phone,
            dob,
            password,
            role,
            organizationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ id: userRef.id, message: 'Patient created successfully' });
    } catch (error) {
        console.error('Error creating patient:', error.message);
        res.status(500).json({ error: 'Failed to create patient' });
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

        await logChange('UPDATE', userId, 'User', userId, name, { oldData: { name: userData.name, email: userData.email }, newData: { name, email } });
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

        await logChange('REQUEST_PASSWORD_RESET', user.uid, 'User', user.uid, user.displayName || 'N/A', { data: { email } });
        console.log("Resend Response:", response);
        return res.json({ message: "Reset email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ error: "Error sending reset email", details: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));