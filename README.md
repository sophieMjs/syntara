On this repository, you will only find the backend of our application, for its total use, you´ll have to use frontend and database repositories as well

Database: https://github.com/calderonDavid/Base-de-Datos-MongoDB-Syntara/tree/main 

Frontend: https://github.com/calderonDavid/Syntara-Frontend



# Backend API Project

This is a Node.js backend application built with Express. It features a layered architecture (Controllers, Services, Repositories) and supports database integrations with both MongoDB and SQL (PostgreSQL).

##  Features

- **RESTful API**: Built using Express.js.
- **Authentication**: Secure authentication using JSON Web Tokens (JWT) and bcryptjs.
- **Database Support**:
    - MongoDB integration via Mongoose.
    - PostgreSQL integration via Sequelize.
- **AI Integration**: OpenAI API integration.
- **Validation**: Request validation using express-validator.
- **Architecture**: Clean architecture pattern separating concerns into Routes, Controllers, Services, and Repositories.

##  Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Databases**: PostgreSQL (`pg`, `sequelize`), MongoDB (`mongoose`)
- **Authentication**: `jsonwebtoken`, `bcryptjs`
- **External APIs**: OpenAI, Axios
- **Utilities**: `dotenv`, `cors`

##  Project Structure

The application logic is located in `backend/src`:


##  Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

##  Configuration

Create a `.env` file in the root directory to configure the application. You can use the following template:


## ️Running the Application

To start the server:


*Note: Please check `package.json` for exact script names.*

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

