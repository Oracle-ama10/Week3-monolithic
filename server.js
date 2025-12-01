// server.js
// Task Board - Monolithic Application
// ENGSE207 Software Architecture - Week 3 Lab

// ========================================
// PART 1: IMPORT DEPENDENCIES
// ========================================

// TODO 1.1: Import express module
const express = require('express');

// TODO 1.2: Import sqlite3 module with verbose mode
const sqlite3 = require('sqlite3').verbose();

// TODO 1.3: Import path module (for serving static files)
const path = require('path');


// ========================================
// PART 2: INITIALIZE APPLICATION
// ========================================

// TODO 2.1: Create express application instance
const app = express();

// TODO 2.2: Define PORT number (use 3000)
const PORT = 3000;


// ========================================
// PART 3: MIDDLEWARE CONFIGURATION
// ========================================

// TODO 3.1: Add middleware to parse JSON request bodies
app.use(express.json());


// TODO 3.2: Add middleware to serve static files from 'public' folder
app.use(express.static('public'));


// ========================================
// PART 4: DATABASE CONNECTION
// ========================================

// TODO 4.1: Create database connection to './database/tasks.db'
const db = new sqlite3.Database('./database/tasks.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Helper function to get a task by ID
const getTaskById = (id, callback) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [id], callback);
};

// ========================================
// PART 5: API ROUTES - GET ALL TASKS (R)
// ========================================

// TODO 5.1: Create GET /api/tasks endpoint
app.get('/api/tasks', (req, res) => {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching tasks:', err.message);
            return res.status(500).json({ error: 'Failed to fetch tasks' });
        }
        // Consistent response format with frontend
        res.json({ success: true, data: rows });
    });
});


// ========================================
// PART 6: API ROUTES - GET SINGLE TASK (R)
// ========================================

// TODO 6.1: Create GET /api/tasks/:id endpoint
app.get('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    getTaskById(id, (err, row) => {
        if (err) {
            console.error('Error fetching task:', err.message);
            return res.status(500).json({ error: 'Failed to fetch task' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ success: true, data: row });
    });
});


// ========================================
// PART 7: API ROUTES - CREATE TASK (C)
// ========================================

// TODO 7.1: Create POST /api/tasks endpoint
app.post('/api/tasks', (req, res) => {
    const { title, description, priority } = req.body;
    
    // Validation: Check if title exists
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
    }

    // Default values if not provided
    const defaultPriority = priority || 'MEDIUM';
    
    // SQL to insert new task
    const sql = `
        INSERT INTO tasks (title, description, status, priority) 
        VALUES (?, ?, 'TODO', ?)
    `;
    
    db.run(sql, [title, description || null, defaultPriority], function(err) {
        if (err) {
            console.error('Error creating task:', err.message);
            return res.status(500).json({ error: 'Failed to create task' });
        }

        const newId = this.lastID;
        
        // Fetch the newly created task to return to the client
        getTaskById(newId, (err, row) => {
            if (err) {
                 return res.status(500).json({ error: 'Failed to retrieve new task' });
            }
            res.status(201).json({ success: true, data: row });
        });
    });
});


// ========================================
// PART 8: API ROUTES - UPDATE TASK (U - PUT)
// ========================================

// TODO 8.1: Create PUT /api/tasks/:id endpoint
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;
    
    // Build dynamic SQL
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (priority !== undefined) {
        updates.push('priority = ?');
        values.push(priority);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id); // ID goes last for the WHERE clause
    
    const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('Error updating task:', err.message);
            return res.status(500).json({ error: 'Failed to update task' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Task not found or no changes made' });
        }

        // Fetch the updated task to return to the client
        getTaskById(id, (err, row) => {
            if (err) return res.status(500).json({ error: 'Failed to retrieve updated task' });
            res.json({ success: true, data: row });
        });
    });
});


// ========================================
// PART 9: API ROUTES - DELETE TASK (D)
// ========================================

// TODO 9.1: Create DELETE /api/tasks/:id endpoint
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting task:', err.message);
            return res.status(500).json({ error: 'Failed to delete task' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ success: true, message: 'Task deleted successfully' });
    });
});


// ========================================
// PART 10: API ROUTES - UPDATE STATUS (U - PATCH)
// ========================================

// TODO 10.1: Create PATCH /api/tasks/:id/status endpoint
app.patch('/api/tasks/:id', (req, res) => { // NOTE: Changed path to /api/tasks/:id for consistency with PUT/DELETE/PATCH standard practice
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            error: 'Invalid status. Must be TODO, IN_PROGRESS, or DONE' 
        });
    }
    
    const sql = `UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(sql, [status, id], function(err) {
        if (err) {
            console.error('Error updating status:', err.message);
            return res.status(500).json({ error: 'Failed to update status' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Fetch the updated task to return to the client
        getTaskById(id, (err, row) => {
            if (err) return res.status(500).json({ error: 'Failed to retrieve updated task' });
            res.json({ success: true, data: row });
        });
    });
});


// ========================================
// PART 11: SERVE FRONTEND
// ========================================

// TODO 11.1: Create route to serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ========================================
// PART 12: START SERVER
// ========================================

// TODO 12.1: Start the server and listen on the PORT
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Task Board application started`);
    console.log(`📊 Architecture: Monolithic (All-in-one)`);
});


// ========================================
// PART 13: GRACEFUL SHUTDOWN (BONUS)
// ========================================

// TODO 13.1: Handle SIGINT for graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    server.close(() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('✅ Database connection closed');
            }
            process.exit(0);
        });
    });
});