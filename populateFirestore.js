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

    // 1. Create 1 Owner
    const ownerRef = db.collection('users').doc();
    addToBatch(ownerRef, {
        name: 'Owner',
        email: 'owner@meditrack.com',
        password: await require('bcryptjs').hash('ownerpass123', 10),
        role: 'owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Create 2 Organizations with the Owner
    const organizations = [
        { name: 'HealthCare Inc.', description: 'Primary healthcare provider', userId: ownerRef.id },
        { name: 'MediWell Corp', description: 'Wellness services', userId: ownerRef.id },
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

        // Log organization creation
        const logRef = db.collection('logs').doc();
        addToBatch(logRef, {
            action: 'CREATE',
            userId: org.userId,
            userName: 'Owner',
            entity: 'Organization',
            entityId: orgRef.id,
            entityName: org.name,
            details: { description: org.description },
            organizationId: orgRef.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // 3. Create 4 Admins (2 per Organization)
    const adminRefs = [];
    for (const orgRef of orgRefs) {
        for (let i = 0; i < 2; i++) {
            const adminRef = db.collection('users').doc();
            addToBatch(adminRef, {
                name: `Admin ${orgRefs.indexOf(orgRef) + 1}-${i + 1}`,
                email: `admin${orgRefs.indexOf(orgRef) + 1}${i + 1}@meditrack.com`,
                password: await require('bcryptjs').hash('adminpass123', 10),
                role: 'admin',
                organizationId: orgRef.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            adminRefs.push(adminRef);
        }
    }

    // 4. Create 2 Patients per Organization (4 total)
    const patientRefs = [];
    for (const orgRef of orgRefs) {
        for (let i = 0; i < 2; i++) {
            const patientRef = db.collection('users').doc();
            addToBatch(patientRef, {
                name: `Patient ${orgRefs.indexOf(orgRef) + 1}-${i + 1}`,
                email: `patient${orgRefs.indexOf(orgRef) + 1}${i + 1}@meditrack.com`,
                password: await require('bcryptjs').hash('userpass123', 10),
                role: 'user',
                organizationId: orgRef.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            patientRefs.push(patientRef);
        }
    }

    // 5. Create 2 Medications per Patient (8 total for org patients)
    const medicationTemplates = [
        { name: 'Aspirin', dosage: '100mg', frequency: 'Twice daily', prescribingDoctor: 'Dr. Smith' },
        { name: 'Ibuprofen', dosage: '200mg', frequency: 'Once daily', prescribingDoctor: 'Dr. Jones' },
    ];
    for (const patientRef of patientRefs) {
        const orgIndex = Math.floor(patientRefs.indexOf(patientRef) / 2);
        for (let i = 0; i < 2; i++) {
            const medRef = db.collection('medications').doc();
            const endDate = randomDate(new Date('2025-03-28'), new Date('2025-12-31')); // Future dates
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

            // Log medication creation
            const logRef = db.collection('logs').doc();
            addToBatch(logRef, {
                action: 'CREATE',
                userId: ownerRef.id,
                userName: 'Owner',
                entity: 'Medication',
                entityId: medRef.id,
                entityName: medicationTemplates[i].name,
                details: { patientId: patientRef.id },
                organizationId: orgRefs[orgIndex].id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    // 6. Create 1 Reminder per Patient (4 total for org patients)
    for (const patientRef of patientRefs) {
        const orgIndex = Math.floor(patientRefs.indexOf(patientRef) / 2);
        const reminderRef = db.collection('reminders').doc();
        addToBatch(reminderRef, {
            userId: patientRef.id,
            title: `Take ${medicationTemplates[0].name}`,
            description: 'Morning dose',
            datetime: randomDate(new Date('2025-03-28'), new Date('2025-06-30')) + 'T08:00:00Z',
            completed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log reminder creation
        const logRef = db.collection('logs').doc();
        addToBatch(logRef, {
            action: 'CREATE',
            userId: ownerRef.id,
            userName: 'Owner',
            entity: 'Reminder',
            entityId: reminderRef.id,
            entityName: `Take ${medicationTemplates[0].name}`,
            details: { patientId: patientRef.id },
            organizationId: orgRefs[orgIndex].id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // 7. Create 1 Patient with No Organization
    const soloPatientRef = db.collection('users').doc();
    addToBatch(soloPatientRef, {
        name: 'Solo Patient',
        email: 'solopatient@meditrack.com',
        password: await require('bcryptjs').hash('userpass123', 10),
        role: 'user',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log solo patient creation
    const soloPatientLogRef = db.collection('logs').doc();
    addToBatch(soloPatientLogRef, {
        action: 'CREATE',
        userId: soloPatientRef.id,
        userName: 'Solo Patient',
        entity: 'User',
        entityId: soloPatientRef.id,
        entityName: 'Solo Patient',
        details: { role: 'user' },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 8. Create 2 Medications for Solo Patient
    for (let i = 0; i < 2; i++) {
        const medRef = db.collection('medications').doc();
        const endDate = randomDate(new Date('2025-03-28'), new Date('2025-12-31'));
        addToBatch(medRef, {
            patientId: soloPatientRef.id,
            name: medicationTemplates[i].name,
            dosage: medicationTemplates[i].dosage,
            frequency: medicationTemplates[i].frequency,
            prescribingDoctor: medicationTemplates[i].prescribingDoctor,
            endDate: endDate,
            inventory: Math.floor(Math.random() * 50),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log medication creation for solo patient
        const logRef = db.collection('logs').doc();
        addToBatch(logRef, {
            action: 'CREATE',
            userId: soloPatientRef.id,
            userName: 'Solo Patient',
            entity: 'Medication',
            entityId: medRef.id,
            entityName: medicationTemplates[i].name,
            details: { patientId: soloPatientRef.id },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // 9. Create 1 Reminder for Solo Patient
    const soloReminderRef = db.collection('reminders').doc();
    addToBatch(soloReminderRef, {
        userId: soloPatientRef.id,
        title: `Take ${medicationTemplates[0].name}`,
        description: 'Morning dose',
        datetime: randomDate(new Date('2025-03-28'), new Date('2025-06-30')) + 'T08:00:00Z',
        completed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log reminder creation for solo patient
    const soloReminderLogRef = db.collection('logs').doc();
    addToBatch(soloReminderLogRef, {
        action: 'CREATE',
        userId: soloPatientRef.id,
        userName: 'Solo Patient',
        entity: 'Reminder',
        entityId: soloReminderRef.id,
        entityName: `Take ${medicationTemplates[0].name}`,
        details: { patientId: soloPatientRef.id },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

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