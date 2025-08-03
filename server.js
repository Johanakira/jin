// server.js
const express = require('express');
const path = require('path');
const db = require('./db'); // Import our database connection

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints for Clients ---

// GET all clients
app.get('/api/clients', (req, res) => {
    db.all('SELECT * FROM clients', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST a new client
app.post('/api/clients', (req, res) => {
    const { name, phone, email, address } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Client name is required.' });
    }
    db.run('INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)',
        [name, phone, email, address],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, name, phone, email, address });
        }
    );
});

// PUT (update) a client
app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Client name is required.' });
    }
    db.run('UPDATE clients SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
        [name, phone, email, address, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Client not found.' });
            }
            res.json({ message: 'Client updated successfully', id });
        }
    );
});

// DELETE a client
app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM clients WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Client not found.' });
        }
        res.json({ message: 'Client deleted successfully', id });
    });
});

// --- API Endpoints for Jobs ---

// GET all jobs (with client names)
app.get('/api/jobs', (req, res) => {
    const query = `
        SELECT j.*, c.name AS client_name
        FROM jobs j
        JOIN clients c ON j.client_id = c.id
        ORDER BY j.date DESC, j.time DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST a new job
app.post('/api/jobs', (req, res) => {
    const { client_id, date, time, service, price, notes } = req.body;
    if (!client_id || !date || !time || !service || !price) {
        return res.status(400).json({ error: 'Missing required job fields.' });
    }
    db.run('INSERT INTO jobs (client_id, date, time, service, price, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [client_id, date, time, service, price, notes],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, client_id, date, time, service, price, notes, status: 'Scheduled' });
        }
    );
});

// PUT (update) a job
app.put('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const { client_id, date, time, service, price, status, notes } = req.body;
    if (!client_id || !date || !time || !service || !price || !status) {
        return res.status(400).json({ error: 'Missing required job fields for update.' });
    }
    db.run('UPDATE jobs SET client_id = ?, date = ?, time = ?, service = ?, price = ?, status = ?, notes = ? WHERE id = ?',
        [client_id, date, time, service, price, status, notes, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Job not found.' });
            }
            res.json({ message: 'Job updated successfully', id });
        }
    );
});

// DELETE a job
app.delete('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM jobs WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Job not found.' });
        }
        res.json({ message: 'Job deleted successfully', id });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});