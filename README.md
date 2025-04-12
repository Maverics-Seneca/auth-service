# Auth Service

## Overview

The Auth Service is a microservice responsible for user authentication and authorization within the MediTrack application. It handles user registration, login, organization management, and audit logging, using Firebase Authentication for secure user management and JSON Web Tokens (JWT) for session handling. This service integrates with other microservices (e.g., caretaker-service, reminder-service) to provide role-based access control (RBAC) for owners, admins, and patients.

**This project is in development and not intended for production use.**

## Features

-   **User Authentication:** Register and log in users with email and password.
-   **Role-Based Access Control (RBAC):** Supports roles (owner, admin, user) with different permissions.
-   **Organization Management:** Create and manage organizations, linking users to specific organizations.
-   **Audit Logging:** Logs user actions (e.g., login, registration, organization creation) in Firestore for tracking.
-   **JWT Token Management:** Generates and validates JWTs for secure session handling.

## Tech Stack

-   Node.js: Runtime environment.
-   Express.js: Web framework for API routing.
-   Firebase Admin SDK: For authentication and Firestore database operations.
-   JSON Web Tokens (JWT): For secure user sessions.
-   Docker: For containerized deployment.
-   Jest: For unit testing (in development).

## Project Structure

auth-service/
├── .github/
│ └── workflows/
│ └── ci.yml # GitHub Actions workflow for CI
├── src/
│ ├── config/
│ │ └── firebaseConfig.js # Firebase Admin SDK initialization
│ ├── middleware/
│ │ └── authenticate.js # JWT verification middleware
│ ├── routes/
│ │ └── index.js # API route definitions
│ └── index.js # Main application entry point
├── .dockerignore # Docker ignore rules
├── .gitignore # Git ignore rules
├── Dockerfile # Docker configuration
├── package.json # Dependencies and scripts
├── package-lock.json # Dependency lock file
├── README.md # Project documentation

## Prerequisites

-   Node.js (v16 or higher)
-   npm (v8 or higher)
-   Firebase Project: A Firebase project with Authentication and Firestore enabled.
-   Docker (optional, for containerized setup)

## Setup and Installation

1.  **Clone the Repository:**

    ```
    git clone https://github.com/Maverics-Seneca/auth-service.git
    cd auth-service
    git checkout master
    ```

2.  **Install Dependencies:**

    ```
    npm install
    ```

3.  **Set Up Environment Variables:**

    Create a `.env` file in the root directory with the following:

    ```
    PORT=3000
    FIREBASE_CREDENTIALS=<base64-encoded-firebase-service-account-key>
    JWT_SECRET=<your-jwt-secret>
    ```

    -   `FIREBASE_CREDENTIALS`: Base64-encoded JSON key from your Firebase service account. Generate it via Firebase Console > Project Settings > Service Accounts.
    -   `JWT_SECRET`: A secure string for signing JWTs (e.g., a 32-character random string).

    Example for encoding Firebase credentials:

    ```
    cat serviceAccountKey.json | base64
    ```

4.  **Start the Service:**

    ```
    npm start
    ```

    The service will run on `http://localhost:4000`.


## Docker Setup

To run the service in a Docker container:

1.  **Build the Image:**

    ```
    docker build -t auth-service .
    ```

2.  **Run the Container:**

    ```
    docker run --env-file .env -p 3000:3000 auth-service
    ```

    Ensure your `.env` file is present in the directory.

## API Endpoints

| Method | Endpoint                    | Description                                   | Protected |
| :----- | :-------------------------- | :-------------------------------------------- | :-------- |
| POST   | `/api/register`             | Register a new user                           | No        |
| POST   | `/api/login`                | Authenticate a user and return a JWT          | No        |
| POST   | `/api/organization/create`  | Create a new organization                     | Yes       |
| GET    | `/api/organization/:id`     | Get organization details by ID                | Yes       |
| POST   | `/api/organization/user`    | Add a user to an organization                 | Yes       |
| GET    | `/api/organization/user/:id`| Get user details within an organization       | Yes       |
| GET    | `/api/logs`                 | Fetch audit logs for an organization          | Yes       |

-   **Protected Routes:** Require a valid JWT in the `Authorization` header (`Bearer <token>`).
-   **Audit Logs:** Actions like registration, login, and organization changes are logged to Firestore's `logs` collection.

## Development Notes

-   **Roles:**
    -   **Owner:** Manages multiple organizations, creates admins and users.
    -   **Admin:** Manages users within a specific organization.
    -   **User:** Patients with access to their own data (medications, reminders).
-   **Firestore Collections:**
    -   `users`: Stores user data (email, name, role, organizationId).
    -   `organizations`: Stores organization data (name, userId).
    -   `logs`: Stores audit logs (timestamp, action, userId, organizationId, etc.).
-   **Testing Accounts:** Use the provided test accounts for local testing (see below).
-   **Logging:** The service logs actions to Firestore, accessible via the `/api/logs` endpoint for admins and owners.

## Test Accounts

For development and testing purposes:

| Role           | Name          | Email                     | Password      |
| :------------- | :------------ | :------------------------ | :------------ |
| Owner          |  Owner        | owner@meditrack.com       | ownerpass123  |
| Admin          |  Admin 1-1    | admin11@meditrack.com     | adminpass123  |
| Admin          |  Admin 1-2    | admin12@meditrack.com     | adminpass123  |
| Admin          |  Admin 2-1    | admin21@meditrack.com     | adminpass123  |
| Admin          |  Admin 2-2    | admin22@meditrack.com     | adminpass123  |
| Patient (Org)  |  Patient 1-1  | patient11@meditrack.com   | userpass123   |
| Patient (Org)  |  Patient 1-2  | patient12@meditrack.com   | userpass123   |
| Patient (Org)  |  Patient 2-1  | patient21@meditrack.com   | userpass123   |
| Patient (Org)  |  Patient 2-2  | patient22@meditrack.com   | userpass123   |
| Patient (Solo) | Solo Patient  | solopatient@meditrack.com | userpass123   |

**Note:** These accounts are for testing only. Do not use in production.

## Continuous Integration

-   **GitHub Actions:** The `.github/workflows/ci.yml` workflow runs linting and tests on every push/pull request to the `master` branch.

## Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/your-feature`).
3.  Commit changes (`git commit -m "Add your feature"`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a pull request against the `master` branch.

Please ensure code passes linting (`npm run lint`) and tests (`npm test`).

## Known Issues

-   Limited test coverage; more unit tests needed for edge cases.
-   Error handling for invalid Firebase credentials could be improved.

## License

This project is licensed under the MIT License - see the  file for details.

