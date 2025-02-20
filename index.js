const express = require('express');
const app = express();
const PORT = 4000;

app.use(express.json());

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "password") {
        return res.json({ message: "Login successful", token: "mock-jwt-token" });
    }
    res.status(401).json({ error: "Invalid credentials" });
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});