import fs from 'fs';
import mysql from 'mysql2/promise';
import 'dotenv/config';

// 1. Setup the database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function importData() {
  console.log('--- Starting Clean Data Import ---');
  let connection;

  try {
    // 2. Get a connection and clear the table
    connection = await pool.getConnection();
    console.log('Database connection successful.');
    
    console.log('Clearing all old data from "files" table...');
    await connection.query('TRUNCATE TABLE files;');
    console.log('Table cleared.');

    // 3. Read the NEW JSON file
    console.log('Reading data from new_cleaned_files.json...');
    const rawData = fs.readFileSync('new_cleaned_files.json', 'utf8');
    const filesData = JSON.parse(rawData);
    console.log(`Found ${filesData.length} files to import.`);

    let successCount = 0;
    
    // 4. Loop through every file in the JSON
    for (const file of filesData) {
      const subFilesJson = file.sub_files && file.sub_files.length > 0 
        ? JSON.stringify(file.sub_files) 
        : null;

      const query = `
        INSERT INTO files 
          (file_no, file_name, current, record, completed, remark, sub_files) 
        VALUES 
          (?, ?, ?, ?, ?, ?, ?);
      `;
      
      const values = [
        file.file_no || '',
        file.file_name || null,
        file.current || null,
        file.record || null,
        file.completed || null,
        file.remark || null,
        subFilesJson
      ];

      await connection.query(query, values);
      successCount++;
    }

    console.log('\n--- Import Complete ---');
    console.log(`✅ Successfully inserted: ${successCount} new files.`);

  } catch (error) {
    console.error('Database connection or import failed:', error);
  } finally {
    // 5. Always release the connection
    if (connection) connection.release();
    pool.end();
    console.log('Database connection closed.');
  }
}

importData();