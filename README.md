# Auth Service

## Overview

The Auth Service is a crucial component of our microservices architecture, responsible for user authentication and authorization. It leverages Node.js, Firebase Auth, and JWT to provide secure and scalable authentication services.

## Login details

### Hamza's Data

| Category       | ID         | Name             | Email                          | Password       | Role  | Organization ID | Details (if applicable)         |
|----------------|------------|------------------|--------------------------------|----------------|-------|-----------------|---------------------------------|
| Owner          | owner1     | Hamza Owner      | hamzaowner@meditrack.com       | ownerpass123   | owner | -               | -                               |
| Organization   | org1       | HealthCare Inc.  | -                              | -              | -     | -               | Primary healthcare provider     |
| Organization   | org4       | Rural Health     | -                              | -              | -     | -               | Rural healthcare                |
| Admin          | admin1     | hamza Admin 1    | hamzaadmin1org1@meditrack.com  | adminpass123   | admin | org1            | -                               |
| Admin          | admin2     | hamza Admin 2    | hamzaadmin2org1@meditrack.com  | adminpass123   | admin | org1            | -                               |
| Admin          | admin7     | hamza Admin 1    | hamzaadmin1org4@meditrack.com  | adminpass123   | admin | org4            | -                               |
| Admin          | admin8     | hamza Admin 2    | hamzaadmin2org4@meditrack.com  | adminpass123   | admin | org4            | -                               |
| Patient        | patient1   | hamza Patient 1  | hamzapatient1org1@meditrack.com| userpass123    | user  | org1            | -                               |
| Patient        | patient2   | hamza Patient 2  | hamzapatient2org1@meditrack.com| userpass123    | user  | org1            | -                               |
| Patient        | patient3   | hamza Patient 3  | hamzapatient3org1@meditrack.com| userpass123    | user  | org1            | -                               |
| Patient        | patient10  | hamza Patient 1  | hamzapatient1org4@meditrack.com| userpass123    | user  | org4            | -                               |
| Patient        | patient11  | hamza Patient 2  | hamzapatient2org4@meditrack.com| userpass123    | user  | org4            | -                               |
| Patient        | patient12  | hamza Patient 3  | hamzapatient3org4@meditrack.com| userpass123    | user  | org4            | -                               |

### Ankita's Data

| Category       | ID         | Name             | Email                           | Password       | Role  | Organization ID | Details (if applicable)         |
|----------------|------------|------------------|---------------------------------|----------------|-------|-----------------|---------------------------------|
| Owner          | owner2     | Ankita Owner     | ankitaowner@meditrack.com       | ownerpass123   | owner | -               | -                               |
| Organization   | org2       | MediWell Corp    | -                               | -              | -     | -               | Wellness services               |
| Organization   | org7       | MultiCare        | -                               | -              | -     | -               | Multi-specialty care            |
| Admin          | admin3     | ankita Admin 1   | ankitaadmin1org2@meditrack.com  | adminpass123   | admin | org2            | -                               |
| Admin          | admin4     | ankita Admin 2   | ankitaadmin2org2@meditrack.com  | adminpass123   | admin | org2            | -                               |
| Admin          | admin13    | ankita Admin 1   | ankitaadmin1org7@meditrack.com  | adminpass123   | admin | org7            | -                               |
| Admin          | admin14    | ankita Admin 2   | ankitaadmin2org7@meditrack.com  | adminpass123   | admin | org7            | -                               |
| Patient        | patient4   | ankita Patient 1 | ankitapatient1org2@meditrack.com| userpass123    | user  | org2            | -                               |
| Patient        | patient5   | ankita Patient 2 | ankitapatient2org2@meditrack.com| userpass123    | user  | org2            | -                               |
| Patient        | patient6   | ankita Patient 3 | ankitapatient3org2@meditrack.com| userpass123    | user  | org2            | -                               |
| Patient        | patient19  | ankita Patient 1 | ankitapatient1org7@meditrack.com| userpass123    | user  | org7            | -                               |
| Patient        | patient20  | ankita Patient 2 | ankitapatient2org7@meditrack.com| userpass123    | user  | org7            | -                               |
| Patient        | patient21  | ankita Patient 3 | ankitapatient3org7@meditrack.com| userpass123    | user  | org7            | -                               |

### Ranju's Data

| Category       | ID         | Name             | Email                          | Password       | Role  | Organization ID | Details (if applicable)         |
|----------------|------------|------------------|--------------------------------|----------------|-------|-----------------|---------------------------------|
| Owner          | owner3     | Ranju Owner      | ranjuowner@meditrack.com       | ownerpass123   | owner | -               | -                               |
| Organization   | org3       | City Clinic      | -                              | -              | -     | -               | Urban medical center            |
| Admin          | admin5     | ranju Admin 1    | ranjuadmin1org3@meditrack.com  | adminpass123   | admin | org3            | -                               |
| Admin          | admin6     | ranju Admin 2    | ranjuadmin2org3@meditrack.com  | adminpass123   | admin | org3            | -                               |
| Patient        | patient7   | ranju Patient 1  | ranjupatient1org3@meditrack.com| userpass123    | user  | org3            | -                               |
| Patient        | patient8   | ranju Patient 2  | ranjupatient2org3@meditrack.com| userpass123    | user  | org3            | -                               |
| Patient        | patient9   | ranju Patient 3  | ranjupatient3org3@meditrack.com| userpass123    | user  | org3            | -                               |

### Aisha's Data
| Category       | ID         | Name             | Email                          | Password       | Role  | Organization ID | Details (if applicable)         |
|----------------|------------|------------------|--------------------------------|----------------|-------|-----------------|---------------------------------|
| Owner          | owner4     | Aisha Owner      | aishaowner@meditrack.com       | ownerpass123   | owner | -               | -                               |
| Organization   | org5       | Family Care      | -                              | -              | -     | -               | Family-oriented care            |
| Admin          | admin9     | aisha Admin 1    | aishaadmin1org5@meditrack.com  | adminpass123   | admin | org5            | -                               |
| Admin          | admin10    | aisha Admin 2    | aishaadmin2org5@meditrack.com  | adminpass123   | admin | org5            | -                               |
| Patient        | patient13  | aisha Patient 1  | aishapatient1org5@meditrack.com| userpass123    | user  | org5            | -                               |
| Patient        | patient14  | aisha Patient 2  | aishapatient2org5@meditrack.com| userpass123    | user  | org5            | -                               |
| Patient        | patient15  | aisha Patient 3  | aishapatient3org5@meditrack.com| userpass123    | user  | org5            | -                               |

### Arpit's Data
| Category       | ID         | Name             | Email                          | Password       | Role  | Organization ID | Details (if applicable)         |
|----------------|------------|------------------|--------------------------------|----------------|-------|-----------------|---------------------------------|
| Owner          | owner5     | Arpit Owner      | arpitowner@meditrack.com       | ownerpass123   | owner | -               | -                               |
| Organization   | org6       | Senior Living    | -                              | -              | -     | -               | Senior care services            |
| Admin          | admin11    | arpit Admin 1    | arpitadmin1org6@meditrack.com  | adminpass123   | admin | org6            | -                               |
| Admin          | admin12    | arpit Admin 2    | arpitadmin2org6@meditrack.com  | adminpass123   | admin | org6            | -                               |
| Patient        | patient16  | arpit Patient 1  | arpitpatient1org6@meditrack.com| userpass123    | user  | org6            | -                               |
| Patient        | patient17  | arpit Patient 2  | arpitpatient2org6@meditrack.com| userpass123    | user  | org6            | -                               |
| Patient        | patient18  | arpit Patient 3  | arpitpatient3org6@meditrack.com| userpass123    | user  | org6            | -                               |

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