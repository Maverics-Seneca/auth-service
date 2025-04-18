// Import required modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { Resend } = require("resend");

// Load environment variables
dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Firebase
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware setup
app.use(cors({
    origin: 'http://middleware:3001',
    credentials: true,
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Utility Functions

/**
 * Logs changes to Firestore for auditing purposes.
 * @param {string} action - The action performed (e.g., REGISTER, LOGIN, UPDATE).
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} entity - The entity being modified (e.g., User, Organization).
 * @param {string} entityId - The ID of the entity being modified.
 * @param {string} entityName - The name of the entity being modified.
 * @param {object} details - Additional details about the change.
 */
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

// API Endpoints

/**
 * Register an admin user.
 * @route POST /api/register-admin
 * @param {string} name - The name of the admin.
 * @param {string} email - The email of the admin.
 * @param {string} phone - The phone number of the admin.
 * @param {string} password - The password of the admin.
 * @param {string} organizationId - The ID of the organization the admin belongs to.
 * @param {string} role - The role of the admin (default: 'admin').
 */
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

/**
 * Register a regular user.
 * @route POST /api/register
 * @param {string} email - The email of the user.
 * @param {string} password - The password of the user.
 * @param {string} name - The name of the user.
 * @param {string} role - The role of the user (default: 'user').
 */
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

/**
 * Create a new organization.
 * @route POST /api/organization/create
 * @param {string} userId - The ID of the user creating the organization.
 * @param {string} name - The name of the organization.
 * @param {string} description - The description of the organization.
 */
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

/**
 * Fetch all organizations.
 * @route GET /api/organization/get-all
 */
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

/**
 * Fetch organizations for a specific user.
 * @route GET /api/organizations
 * @param {string} userId - The ID of the user to fetch organizations for.
 */
app.get('/api/organizations', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    console.log('Fetching organizations for userId:', userId);
    try {
        const snapshot = await db.collection('organizations')
            .where('userId', '==', userId)
            .get();

        if (snapshot.empty) {
            console.log('No organizations found for userId:', userId);
            return res.json([]);
        }

        const organizations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched organizations from Firestore:', organizations);
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching organizations:', error.message);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

/**
 * Update an organization.
 * @route PUT /api/organization/:id
 * @param {string} id - The ID of the organization to update.
 * @param {string} userId - The ID of the user updating the organization.
 * @param {string} name - The updated name of the organization.
 * @param {string} description - The updated description of the organization.
 */
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

/**
 * Delete an organization.
 * @route DELETE /api/organization/:id
 * @param {string} id - The ID of the organization to delete.
 * @param {string} userId - The ID of the user deleting the organization.
 */
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

/**
 * Fetch all admins.
 * @route GET /api/get-all-admins
 */
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

/**
 * Update an admin.
 * @route POST /api/update-admin/:id
 * @param {string} id - The ID of the admin to update.
 * @param {string} name - The updated name of the admin.
 * @param {string} email - The updated email of the admin.
 * @param {string} phone - The updated phone number of the admin.
 * @param {string} organizationId - The updated organization ID of the admin.
 */
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

/**
 * Delete an admin.
 * @route DELETE /api/delete-admin/:id
 * @param {string} id - The ID of the admin to delete.
 */
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

/**
 * Delete a patient (user).
 * @route DELETE /api/users/:id
 * @description Delete a patient from Firestore
 */
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const userData = userDoc.data();
        if (userData.role !== 'user') {
            return res.status(403).json({ message: 'Can only delete patients (role: user)' });
        }

        await userRef.delete();
        await logChange('DELETE_USER', id, 'User', id, userData.name, { data: { email: userData.email } });
        res.status(200).send('Patient deleted');
    } catch (error) {
        console.error('Error deleting patient:', error.message);
        res.status(500).send('Failed to delete patient');
    }
});

/**
 * Update a patient (user).
 * @route POST /api/users/:id
 * @description Update a patient's details in Firestore
 */
app.post('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, organizationId, role } = req.body;

    if (!name || !email || !phone || !organizationId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const userData = userDoc.data();
        if (userData.role !== 'user' || role !== 'user') {
            return res.status(403).json({ message: 'Can only update patients (role: user)' });
        }

        await userRef.update({
            name,
            email,
            phone,
            organizationId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logChange('UPDATE_USER', id, 'User', id, name, { data: { email, phone, organizationId } });
        res.status(200).send('Patient updated');
    } catch (error) {
        console.error('Error updating patient:', error.message);
        res.status(500).send('Failed to update patient');
    }
});

/**
 * Login a user.
 * @route POST /api/login
 * @param {string} email - The email of the user.
 * @param {string} password - The password of the user.
 */
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

/**
 * Fetch logs.
 * @route GET /api/logs
 * @param {string} userId - The ID of the user fetching logs.
 * @param {string} role - The role of the user.
 */
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

/**
 * Fetch users.
 * @route GET /api/users
 * @param {string} organizationId - The ID of the organization to filter users by.
 * @param {string} role - The role of the users to filter by.
 */
app.get('/api/users', async (req, res) => {
    const { organizationId, role } = req.query;
    console.log('Fetching users with organizationId:', organizationId, 'role:', role);
    try {
        let query = admin.firestore().collection('users');
        if (organizationId) query = query.where('organizationId', '==', organizationId);
        if (role) query = query.where('role', '==', role);

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched users from Firestore:', users);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * Fetch user data.
 * @route GET /api/user
 * @param {string} userId - The ID of the user to fetch data for.
 */
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

/**
 * Create a new user (patient).
 * @route POST /api/users
 * @param {string} email - The email of the user.
 * @param {string} name - The name of the user.
 * @param {string} phone - The phone number of the user.
 * @param {string} dob - The date of birth of the user.
 * @param {string} password - The password of the user.
 * @param {string} role - The role of the user.
 * @param {string} organizationId - The ID of the organization the user belongs to.
 */
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

/**
 * Update user data.
 * @route POST /api/update
 * @param {string} userId - The ID of the user to update.
 * @param {string} name - The updated name of the user.
 * @param {string} email - The updated email of the user.
 * @param {string} password - The updated password of the user.
 * @param {string} currentPassword - The current password of the user.
 */
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

/**
 * Request a password reset.
 * @route POST /api/request-password-reset
 * @param {string} email - The email of the user requesting the password reset.
 */
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

/**
 * Login a caretaker.
 * @route POST /api/caretaker-login
 * @param {string} email - The caretaker's email.
 * @param {string} password - The caretaker's password.
 * @returns {string} patientId if credentials are valid.
 */
app.post('/api/caretaker-login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const snapshot = await db.collection('caretakers')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const doc = snapshot.docs[0];
        const caretaker = doc.data();

        const isMatch = password == caretaker.password;
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        return res.status(200).json({ patientId: caretaker.patientId });
    } catch (error) {
        console.error('Error during caretaker login:', error);
        return res.status(500).json({ message: 'Caretaker login failed', error: error.message });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));