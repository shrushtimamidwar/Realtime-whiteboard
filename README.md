# Real-Time Collaborative Whiteboard

A full-stack web application that enables multiple users to collaborate on a shared digital whiteboard in real time. Users can create accounts, join shared rooms, draw together, and access previously saved drawings.

## ✨ Features

* **User Authentication:** Register and log in securely with password hashing and JWT-based authentication.
* **Real-Time Collaboration:** Draw simultaneously with multiple users using Socket.IO.
* **Shared Rooms:** Join a whiteboard session using a room ID.
* **Persistent Drawing History:** Save drawings in MongoDB so users joining later can view existing content.
* **Interactive Drawing Tools:** Choose colors, adjust brush sizes, and erase using the available drawing controls.
* **Clear Board:** Clear the shared whiteboard for everyone in the room.
* **Responsive Interface:** A clean, user-friendly interface for an intuitive drawing experience.

## 🛠️ Tech Stack

### Frontend

* **React.js** — Component-based user interface.
* **Vite** — Frontend development server and build tool.
* **CSS3** — Styling and responsive layouts.
* **Socket.IO Client** — Real-time communication with the backend.

### Backend

* **Node.js** — JavaScript runtime.
* **Express.js** — REST API and authentication endpoints.
* **Socket.IO** — Real-time, bidirectional communication.

### Database

* **MongoDB Atlas** — Cloud database for users and saved drawings.
* **Mongoose** — MongoDB object modeling.

### Authentication & Security

* **JSON Web Tokens (JWT)** — Authentication and protected operations.
* **bcryptjs** — Password hashing.

### Development Tools

* **Git & GitHub** — Version control and source code hosting.
* **npm** — Package management.
* **Visual Studio Code** — Development environment.

## 🏗️ Architecture

The application uses a client-server architecture:

1. The React frontend provides the drawing canvas and user interface.
2. Express handles authentication and API requests.
3. Socket.IO broadcasts drawing events to users in the same room.
4. MongoDB stores user information and drawing history.
5. JWT authentication protects access to authorized features.

## ⚙️ Requirements

* Node.js 20 or later recommended.
* npm.
* A MongoDB Atlas database.

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/shrushtimamidwar/Realtime-whiteboard.git
cd Realtime-whiteboard
```

### 2. Configure MongoDB

1. Create a MongoDB Atlas database user.
2. Configure Network Access to allow your development IP address.
3. Copy your MongoDB Atlas connection string.
4. Copy `server/.env.example` to `server/.env`.
5. Configure the environment variables in `server/.env`.

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/whiteboard?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Replace the example MongoDB credentials and cluster address with your actual values. If your database password contains special characters, URL-encode them in the connection string.

Generate a strong, unique JWT secret and keep your `.env` file private. Never commit credentials or secrets to GitHub.

### 3. Install Dependencies

Open two terminals from the project root.

**Terminal 1 — Backend**

```bash
cd server
npm install
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd client
npm install
npm run dev
```

### 4. Open the Application

Visit http://localhost:5173 in your browser.

## 🧪 Testing the Application

1. Register a new account and log in.
2. Enter a room ID, such as `ABC123`, and join the room.
3. Open another browser or an incognito window and log in with a second account.
4. Join the same room using the same room ID.
5. Draw in either browser and verify that the changes appear in the other session.
6. Verify that a newly joined user can see previously saved drawings.
7. Restart the backend, rejoin the room, and verify that the drawing history persists.

## 🔮 Future Enhancements

* Undo and redo drawing actions.
* Export whiteboards as PNG or PDF.
* Add participant presence indicators.
* Improve drawing synchronization for large collaborative sessions.
* Add additional drawing tools and shapes.

## 👩‍💻 Author

**Shrushti Mamidwar**

[GitHub Profile](https://github.com/shrushtimamidwar)

---

If you find this project interesting, feel free to explore the repository and its implementation.
