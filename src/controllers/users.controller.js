// src/controllers/users.controller.js

export async function getAllUsers(req, res) {
  try {
    // Temporary dummy data
    const users = [
      { id: 1, name: "John Doe", role: "Admin" },
      { id: 2, name: "Jane Smith", role: "User" },
    ];

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
}
