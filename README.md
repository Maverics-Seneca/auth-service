# Auth Service

## Overview

The Auth Service is a crucial component of our microservices architecture, responsible for user authentication and authorization. It leverages Node.js, Firebase Auth, and JWT to provide secure and scalable authentication services.

## Login details

| Role            | Name               | Email                          | Password      |
|------------------|--------------------|--------------------------------|---------------|
| Owner           | Hamza Owner        | hamzaowner@meditrack.com       | ownerpass123  |
| Admin           | Hamza Admin 1-1    | hamzaadmin11@meditrack.com     | adminpass123  |
| Admin           | Hamza Admin 1-2    | hamzaadmin12@meditrack.com     | adminpass123  |
| Admin           | Hamza Admin 2-1    | hamzaadmin21@meditrack.com     | adminpass123  |
| Admin           | Hamza Admin 2-2    | hamzaadmin22@meditrack.com     | adminpass123  |
| Patient (Org)   | Hamza Patient 1-1  | hamzapatient11@meditrack.com   | userpass123   |
| Patient (Org)   | Hamza Patient 1-2  | hamzapatient12@meditrack.com   | userpass123   |
| Patient (Org)   | Hamza Patient 2-1  | hamzapatient21@meditrack.com   | userpass123   |
| Patient (Org)   | Hamza Patient 2-2  | hamzapatient22@meditrack.com   | userpass123   |
| Patient (Solo)  | Solo Patient       | solopatient@meditrack.com      | userpass123   |

## Features

- User signup and login
- Two-factor authentication (2FA)
- Role-based access control (RBAC)
- JWT token generation and validation

## Tech Stack

- Node.js
- Express.js
- Firebase Auth
- JSON Web Tokens (JWT)

## Project Structure

```
auth-service/
│── src/
│ ├── controllers/
│ │ ├── authController.js
│ ├── routes/
│ │ ├── authRoutes.js
│ ├── middlewares/
│ │ ├── authMiddleware.js
│ ├── config/
│ │ ├── firebase.js
│ ├── app.js
│── .github/workflows/
│ ├── ci-cd.yml
│── Dockerfile
│── package.json
│── README.md
```

## Setup and Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/maverics-seneca/auth-service.git
   ```

2. Install dependencies:

   ```sh
   cd auth-service
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:

   ```sh
   FIREBASE_API_KEY=your_firebase_api_key
   JWT_SECRET=your_jwt_secret
   ```

4. Start the service:

   ```sh
   npm start
   ```

## API Endpoints

- `POST /auth/signup` - Create a new user account
- `POST /auth/login` - Authenticate a user and receive a JWT
- `POST /auth/logout` - Invalidate the current JWT
- `GET /auth/user` - Get the current user's information (protected route)

## Docker

To build and run the service using Docker:

```sh
docker build -t auth-service .
docker run -p 3000:3000 auth-service
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/ci-cd.yml`.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.