# Real-Time Collaborative Whiteboard

A full-stack starter project with:
- React + Vite frontend
- Express + Socket.IO backend
- MongoDB Atlas persistence using Mongoose
- Register/login with bcrypt password hashing and JWT
- Protected dashboard and room-based collaborative drawing
- Saved drawing history for users joining later
- Clear board, color picker, brush size, logout

## Requirements
- Node.js 20+ recommended
- MongoDB Atlas database

## 1. Configure MongoDB
1. In MongoDB Atlas, create a database user and allow your development IP in Network Access.
2. Copy the Atlas connection string.
3. Copy `server/.env.example` to `server/.env`.
4. Set `MONGO_URI` and a long random `JWT_SECRET`. Do not commit `.env`.

Example:
```
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/whiteboard?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```
If your password contains special characters, URL-encode them in the MongoDB URI.

## 2. Install dependencies
Open two terminals from the project root.

Terminal 1:
```
cd server
npm install
npm run dev
```

Terminal 2:
```
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## 3. Try it
1. Register an account.
2. Log in.
3. Enter a room ID such as `ABC123` and click Join Room.
4. Open another browser/incognito window and register/log in with a second account.
5. Join the same room ID. New users should receive existing drawing history.
6. Draw from either browser and verify updates are broadcast live.
7. Restart the server and rejoin the room to check persisted history.

