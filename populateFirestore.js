const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Collections to manage
const COLLECTIONS = ['users', 'organizations', 'logs', 'caretakers', 'medications', 'reminders'];

// Function to clear all data in a collection
async function clearCollection(collectionName) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Cleared collection: ${collectionName}`);
}

// Function to clear all collections
async function clearAllData() {
    for (const collection of COLLECTIONS) {
        await clearCollection(collection);
    }
}

// Utility to generate random dates
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

// Function to generate dummy data
async function populateDummyData() {
    const batches = [db.batch()];
    let currentBatchIndex = 0;
    let operationCount = 0;

    // Helper to switch batches if limit reached (Firestore batch limit is 500 operations)
    function addToBatch(ref, data) {
        if (operationCount >= 500) {
            currentBatchIndex++;
            batches.push(db.batch());
            operationCount = 0;
        }
        batches[currentBatchIndex].set(ref, data);
        operationCount++;
    }

    // 1. Create 5 Specific Owners
    const owners = [
        { name: 'Hamza Owner', email: 'hamzaowner@meditrack.com', phone: '123-456-7890' },
        { name: 'Ankita Owner', email: 'ankitaowner@meditrack.com', phone: '234-567-8901' },
        { name: 'Ranju Owner', email: 'ranjuowner@meditrack.com', phone: '345-678-9012' },
        { name: 'Aisha Owner', email: 'aishaowner@meditrack.com', phone: '456-789-0123' },
        { name: 'Arpit Owner', email: 'arpitowner@meditrack.com', phone: '567-890-1234' },
    ];
    const ownerRefs = [];
    for (const owner of owners) {
        const ownerRef = db.collection('users').doc();
        addToBatch(ownerRef, {
            name: owner.name,
            email: owner.email,
            password: await require('bcryptjs').hash('ownerpass123', 10),
            role: 'owner',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        ownerRefs.push(ownerRef);
    }

    // 2. Create 7 Organizations with Owners
    const organizations = [
        { name: 'HealthCare Inc.', description: 'Primary healthcare provider', userId: ownerRefs[0].id }, // Hamza
        { name: 'MediWell Corp', description: 'Wellness services', userId: ownerRefs[1].id }, // Ankita
        { name: 'City Clinic', description: 'Urban medical center', userId: ownerRefs[2].id }, // Ranju
        { name: 'Rural Health', description: 'Rural healthcare', userId: ownerRefs[0].id }, // Hamza (owns 2)
        { name: 'Family Care', description: 'Family-oriented care', userId: ownerRefs[3].id }, // Aisha
        { name: 'Senior Living', description: 'Senior care services', userId: ownerRefs[4].id }, // Arpit
        { name: 'MultiCare', description: 'Multi-specialty care', userId: ownerRefs[1].id }, // Ankita (owns 2)
    ];
    const orgRefs = [];
    for (const org of organizations) {
        const orgRef = db.collection('organizations').doc();
        addToBatch(orgRef, {
            userId: org.userId,
            name: org.name,
            description: org.description,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        orgRefs.push(orgRef);
    }

    // 3. Create 2 Admins per Organization (14 total)
    const adminRefs = [];
    for (const orgRef of orgRefs) {
        const ownerIndex = ownerRefs.findIndex(ref => ref.id === organizations[orgRefs.indexOf(orgRef)].userId);
        const ownerName = owners[ownerIndex].name.split(' ')[0].toLowerCase();
        for (let i = 0; i < 2; i++) {
            const adminRef = db.collection('users').doc();
            addToBatch(adminRef, {
                name: `${ownerName} Admin ${i + 1}`,
                email: `${ownerName}admin${i + 1}org${orgRefs.indexOf(orgRef) + 1}@meditrack.com`, // Unique per org
                password: await require('bcryptjs').hash('adminpass123', 10),
                role: 'admin',
                organizationId: orgRef.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            adminRefs.push(adminRef);
        }
    }

    // 4. Create 3 Patients per Organization (21 total)
    const patientRefs = [];
    for (const orgRef of orgRefs) {
        const ownerIndex = ownerRefs.findIndex(ref => ref.id === organizations[orgRefs.indexOf(orgRef)].userId);
        const ownerName = owners[ownerIndex].name.split(' ')[0].toLowerCase();
        for (let i = 0; i < 3; i++) {
            const patientRef = db.collection('users').doc();
            addToBatch(patientRef, {
                name: `${ownerName} Patient ${i + 1}`,
                email: `${ownerName}patient${i + 1}org${orgRefs.indexOf(orgRef) + 1}@meditrack.com`, // Unique per org
                password: await require('bcryptjs').hash('userpass123', 10),
                role: 'user',
                organizationId: orgRef.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            patientRefs.push(patientRef);
        }
    }

    // 5. Create 4 Medications per Patient (84 total)
    const medicationTemplates = [
        { name: 'Aspirin', dosage: '100mg', frequency: 'Twice daily', prescribingDoctor: 'Dr. Smith' },
        { name: 'Ibuprofen', dosage: '200mg', frequency: 'Once daily', prescribingDoctor: 'Dr. Jones' },
        { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', prescribingDoctor: 'Dr. Lee' },
        { name: 'Amoxicillin', dosage: '250mg', frequency: 'Thrice daily', prescribingDoctor: 'Dr. Brown' },
    ];
    const currentDate = new Date('2025-03-27');
    for (const patientRef of patientRefs) {
        const orgIndex = Math.floor(patientRefs.indexOf(patientRef) / 3);
        for (let i = 0; i < 4; i++) {
            const medRef = db.collection('medications').doc();
            const isExpired = i < 2; // First 2 are expired, last 2 are future
            const endDate = isExpired
                ? randomDate(new Date('2024-01-01'), new Date('2025-03-26'))
                : randomDate(new Date('2025-03-28'), new Date('2025-12-31'));
            addToBatch(medRef, {
                patientId: patientRef.id,
                name: medicationTemplates[i].name,
                dosage: medicationTemplates[i].dosage,
                frequency: medicationTemplates[i].frequency,
                prescribingDoctor: medicationTemplates[i].prescribingDoctor,
                endDate: endDate,
                inventory: Math.floor(Math.random() * 50),
                organizationId: orgRefs[orgIndex].id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    // 6. Create 2 Reminders per Patient (42 total)
    for (const patientRef of patientRefs) {
        const orgIndex = Math.floor(patientRefs.indexOf(patientRef) / 3);
        const patientDoc = await patientRef.get(); // Fetch patient data for name
        const patientName = patientDoc.exists ? patientDoc.data().name : 'Unknown';

        // Past reminder
        const pastReminderRef = db.collection('reminders').doc();
        addToBatch(pastReminderRef, {
            userId: patientRef.id,
            title: `Take ${medicationTemplates[0].name}`,
            description: 'Morning dose',
            datetime: randomDate(new Date('2025-03-01'), new Date('2025-03-26')) + 'T08:00:00Z',
            completed: Math.random() > 0.5, // Randomly completed or not
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Future reminder
        const futureReminderRef = db.collection('reminders').doc();
        addToBatch(futureReminderRef, {
            userId: patientRef.id,
            title: `Take ${medicationTemplates[1].name}`,
            description: 'Evening dose',
            datetime: randomDate(new Date('2025-03-28'), new Date('2025-06-30')) + 'T18:00:00Z',
            completed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // 7. Create Logs for organization creation
    for (let i = 0; i < organizations.length; i++) {
        const logRef = db.collection('logs').doc();
        addToBatch(logRef, {
            action: 'CREATE',
            userId: organizations[i].userId,
            userName: owners.find(o => o.email === owners[ownerRefs.findIndex(ref => ref.id === organizations[i].userId)].email).name,
            entity: 'Organization',
            entityId: orgRefs[i].id,
            entityName: organizations[i].name,
            details: { description: organizations[i].description },
            organizationId: orgRefs[i].id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // Commit all batches
    for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(`Batch ${i + 1} committed`);
    }
    console.log('Dummy data populated successfully');
}

// Main execution
async function main() {
    try {
        console.log('Clearing all data...');
        await clearAllData();
        console.log('Populating dummy data...');
        await populateDummyData();
        console.log('Script completed successfully');
    } catch (error) {
        console.error('Error in script:', error);
    } finally {
        process.exit();
    }
}

main();