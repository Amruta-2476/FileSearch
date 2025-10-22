// Modern ES Module 
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import 'dotenv/config'; // automatically loads the .env file
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// --- CSV & File Upload Packages ---
import multer from 'multer';
import Papa from 'papaparse';
import { Readable } from 'stream';

// --- Main Application Setup ---
const app = express();
const PORT = process.env.PORT || 8080;

const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-key-fallback'

// --- Multer Setup for CSV Upload ---
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// --- Helper: Create Middleware to Protect Routes ---
// This function checks if a user is an admin before letting them continue
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (token == null) return res.sendStatus(401); // No token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next(); // Token is valid, proceed
    });
};

// --- Middleware ---
const allowedOrigins = [
    'http://localhost:5173', // Your local frontend dev URL
    'https://file-search-taupe.vercel.app' // Your main production URL
    // We will check Vercel preview URLs dynamically below
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Allow origins from the explicit list
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // --- ADD THIS CHECK FOR VERCEL PREVIEWS ---
        // Allow any subdomain of vercel.app (common pattern for previews)
        // It looks for URLs ending in '.vercel.app'
        const vercelPreviewPattern = /^https:\/\/.*\.vercel\.app$/;
        if (vercelPreviewPattern.test(origin)) {
             console.log(`CORS Allowing Vercel Preview: ${origin}`);
             return callback(null, true);
        }
        // --- END VERCEL CHECK ---

        // Disallow if origin is not in the list or doesn't match the pattern
        const msg = `CORS Error: Origin ${origin} not allowed.`;
        console.error(msg);
        return callback(new Error(msg), false);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}));
app.use(express.json());


// --- Database Connection ---
// Creating a "pool" of connections. This is more efficient than a single connection.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // Use port from .env
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // --- ADD THIS BLOCK ---
    ssl: {
      // Enforce SSL/TLS
      rejectUnauthorized: true // Important for security
    }
    // ---------------------
});

// --- API Endpoints (Routes) ---

// --- AUTHENTICATION ROUTES ---
// @route   POST /api/register
// @desc    (One-time use) Create the admin user
// @access  Public (run this once, then comment it out)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (username, password_hash) VALUES (?, ?)';
        await pool.query(query, [username, password_hash]);
        res.status(201).json({ message: 'Admin user created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user' });
    }
});


// @route   POST /api/login
// @desc    Log in the admin
// @access  Public
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find the user
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const user = rows[0];
        // Check the password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Create and send a token
        const payload = { user: { id: user.id, username: user.username } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- FILE CRUD (Create, Read, Update, Delete) ROUTES ---
// @route   GET /api/files 
// @desc    Read : Get all files
// @access  Public (Everyone can read)
app.get('/api/files', async (req, res) => {
    try {
        const query = 'SELECT * FROM files';
        const [rows] = await pool.query(query);
        // Send the data from database back to the frontend
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Error fetching files from the database.' });
    }
});

// @route   POST /api/files
// @desc    Create a new file record
// @access  Private (Admin Only)
app.post('/api/files', authenticateToken, async (req, res) => {
    try {
        const { file_no, file_name, current, record, completed, remark, sub_files } = req.body;
        const subFilesJson = sub_files && sub_files.length > 0 ? JSON.stringify(sub_files) : null;
        const query = `
            INSERT INTO files (file_no, file_name, current, record, completed, remark, sub_files) 
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
        const values = [
            file_no || '',
            file_name || null,
            current || null,
            record || null,
            completed || null,
            remark || null,
            subFilesJson
        ];
        const [result] = await pool.query(query, values);
        // Send the newly created file back to the frontend
        const [newFile] = await pool.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
        res.status(201).json(newFile[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating file' });
    }
});

// @route   PUT /api/files/:id
// @desc    Update an existing file record
// @access  Private (Admin Only)
app.put('/api/files/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { file_no, file_name, current, record, completed, remark, sub_files } = req.body;
        const subFilesJson = sub_files && sub_files.length > 0 ? JSON.stringify(sub_files) : null;
        const query = `
            UPDATE files SET 
                file_no = ?, file_name = ?, current = ?, record = ?, completed = ?, remark = ?, sub_files = ?
            WHERE id = ?;
        `;
        const values = [
            file_no || '',
            file_name || null,
            current || null,
            record || null,
            completed || null,
            remark || null,
            subFilesJson,
            id
        ];
        await pool.query(query, values);
        const [updatedFile] = await pool.query('SELECT * FROM files WHERE id = ?', [id]);
        res.status(200).json(updatedFile[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating file' });
    }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file record
// @access  Private (Admin Only)
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM files WHERE id = ?', [id]);
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting file' });
    }
});


// @route   GET /api/files/export (Download all data as CSV with specific format)
app.get('/api/files/export', authenticateToken, async (req, res) => {
    try {
        // Fetch all data, ordering by file_no might help keep related rows together if needed
        const [rows] = await pool.query('SELECT * FROM files ORDER BY file_no, id');
        const csvData = []; // to hold the rows for the CSV
        // Define the headers we want in the final CSV
        const headers = ['FILE NO', 'FILE NAME', 'CURRENT', 'RECORD', 'COMPLETED', 'REMARK'];
        // Process each row from the database
        for (const row of rows) {
            // Add the parent row first, selecting only the desired columns
            csvData.push({
                'FILE NO': row.file_no || '',
                'FILE NAME': row.file_name || '',
                'CURRENT': row.current || '',
                'RECORD': row.record || '',
                'COMPLETED': row.completed || '',
                'REMARK': row.remark || ''
            });
            // Check if there are sub-files and add them as separate rows
            const subFiles = row.sub_files || []; // Ensure sub_files is an array
            if (Array.isArray(subFiles)) {
                for (const sub of subFiles) {
                    csvData.push({
                        'FILE NO': '', // Keep FILE NO blank for sub-files
                        'FILE NAME': sub.name || '',
                        'CURRENT': sub.current || '',
                        'RECORD': sub.record || '',
                        'COMPLETED': sub.completed || '',
                        'REMARK': sub.remark || ''
                    });
                }
            }
        }
        // Convert the processed data array to CSV format using papaparse
        const csv = Papa.unparse(csvData, {
            columns: headers, // Specify the exact headers and their order
            header: true      // Include the header row in the output
        });
        // Set response headers for CSV download
        res.header('Content-Type', 'text/csv');
        res.attachment(`file_data_export_${Date.now()}.csv`); // Suggest a filename
        res.send(csv); // Send the generated CSV content
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ message: 'Error exporting data' });
    }
});

// @route   POST /api/files/import (Upload a CSV file with hierarchy and duplicate check)
app.post('/api/files/import', authenticateToken, upload.single('csvfile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    let connection;
    try {
        const fileContent = req.file.buffer.toString('utf8');
        const results = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim().toLowerCase().replace(/ /g, '_') // Normalize headers like 'file no' to 'file_no'
        });
        const csvRows = results.data;
        connection = await pool.getConnection();
        console.log(`CSV Parsed. Processing ${csvRows.length} rows for import...`);
        const newParentsToInsert = []; // Store valid new parent records here
        let currentParent = null; // Track the parent record being built
        let skippedExistingParents = 0;
        let skippedOrphanSubfiles = 0;
        let processedSubfiles = 0;

        // --- Pass 1: Group data and check for existing parents ---
        for (const row of csvRows) {
            const fileNo = row.file_no ? row.file_no.trim() : null;
            const fileName = row.file_name ? row.file_name.trim() : null;
            // Is this a potential parent row?
            if (fileNo) {
                // Check if this specific file_no AND file_name combination already exists
                // Need to handle null file_name carefully in SQL
                let existingQuery;
                let queryParams;

                if (fileName) {
                    // If file_name is provided, check for both matching
                    existingQuery = 'SELECT id FROM files WHERE file_no = ? AND file_name = ? LIMIT 1';
                    queryParams = [fileNo, fileName];
                } else {
                    // If file_name is null/empty, check for file_no with a NULL file_name
                    existingQuery = 'SELECT id FROM files WHERE file_no = ? AND file_name IS NULL LIMIT 1';
                    queryParams = [fileNo];
                }

                const [existing] = await connection.query(existingQuery, queryParams);

                if (existing.length > 0) {
                    // This specific combination already exists, skip it
                    console.warn(`Skipping duplicate record: file_no=${fileNo}, file_name=${fileName || 'NULL'}`);
                    skippedExistingParents++; // Keep using the same counter variable name for simplicity
                    currentParent = null; // Reset current parent, ignore subsequent sub-files
                } else {
                    // This is a new record (or a new combination)
                    currentParent = {
                        file_no: fileNo,
                        file_name: fileName || null,
                        current: row.current || null,
                        record: row.record || null,
                        completed: row.completed || null,
                        remark: row.remark || null,
                        sub_files: []
                    };
                    newParentsToInsert.push(currentParent);
                }
            } 
            // Is this a potential sub-file row? (No file_no, but has a file_name)
            else if (fileName) {
                if (currentParent) {
                    // Add this as a sub-file to the current parent
                    const subFile = {
                        name: fileName,
                        current: row.current || null,
                        record: row.record || null,
                        completed: row.completed || null,
                        remark: row.remark || null
                    };
                    // Clean the sub-file object (remove null keys) before adding
                    const cleanedSubFile = Object.fromEntries(Object.entries(subFile).filter(([_, v]) => v != null && v !== ''));
                    if (Object.keys(cleanedSubFile).length > 0 && cleanedSubFile.name) { // Ensure it's not totally empty except name
                       currentParent.sub_files.push(cleanedSubFile);
                       processedSubfiles++;
                    } else {
                        console.warn('Skipping potentially empty sub-file row:', row)
                    }
                } else {
                    // This row has no file_no, but we haven't seen a valid new parent yet (or the parent was skipped)
                    console.warn(`Skipping orphan sub-file (no valid parent found recently): ${fileName}`);
                    skippedOrphanSubfiles++;
                }
            }
            // Ignore rows with neither file_no nor file_name
        } // End of loop through CSV rows

        // --- Pass 2: Insert the new, valid parent records ---
        console.log(`Attempting to insert ${newParentsToInsert.length} new parent records...`);
        let successfullyInserted = 0;
        const errors = [];
        for (const parent of newParentsToInsert) {
            const subFilesJson = parent.sub_files.length > 0 ? JSON.stringify(parent.sub_files) : null;
            const query = `INSERT INTO files (file_no, file_name, current, record, completed, remark, sub_files) VALUES (?, ?, ?, ?, ?, ?, ?);`;
            const values = [
                parent.file_no, parent.file_name, parent.current, parent.record,
                parent.completed, parent.remark, subFilesJson
            ];
            try {
                await connection.query(query, values);
                successfullyInserted++;
            } catch (insertError) {
                 console.error(`Error inserting new parent file_no ${parent.file_no}:`, insertError.message);
                 errors.push(`File No ${parent.file_no}: ${insertError.message}`);
                 // Optional: Decide whether to stop the whole import on a single error
            }
        }
        console.log(`Import finished. Inserted: ${successfullyInserted}, Skipped Existing Parents: ${skippedExistingParents}, Skipped Orphan Sub-files: ${skippedOrphanSubfiles}, Processed Sub-files: ${processedSubfiles}`);

        // Construct response message
        let message = `Import processed. New parent records added: ${successfullyInserted}.`;
        if (skippedExistingParents > 0) message += ` Skipped ${skippedExistingParents} existing parent records.`;
        if (skippedOrphanSubfiles > 0) message += ` Skipped ${skippedOrphanSubfiles} sub-file rows without a valid new parent.`;
        if (errors.length > 0) message += ` Encountered ${errors.length} insertion errors.`;
        const status = errors.length === 0 ? 201 : (successfullyInserted > 0 ? 207 : 500); // 201 Created, 207 Multi-Status, 500 Error
        res.status(status).json({ message, errors });
    } catch (error) {
        console.error('Error processing CSV file:', error);
        res.status(500).json({ message: 'General error processing CSV file.' });
    } finally {
        if (connection) connection.release(); // Release connection back to the pool
    }
});


// --- Starting the Server ---
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`- Host: ${process.env.DB_HOST}`);
    console.log(`- User: ${process.env.DB_USER}`);
    console.log(`- Database: ${process.env.DB_NAME}`);
});