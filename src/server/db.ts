import Database from 'better-sqlite3';
import { seedData } from './seedData';
import path from 'path';
import fs from 'fs';

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

// In Vercel serverless functions, the file system is mostly read-only except for /tmp
const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel ? '/tmp/knowledge_base.db' : 'knowledge_base.db';

const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    )
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM faq').get() as { count: number };
  
  if (count.count === 0) {
    console.log('Seeding database with initial FAQ data...');
    const insert = db.prepare('INSERT INTO faq (id, question, answer) VALUES (@id, @question, @answer)');
    
    const insertMany = db.transaction((faqs: FAQ[]) => {
      for (const faq of faqs) {
        insert.run(faq);
      }
    });
    
    insertMany(seedData);
    console.log('Database seeded successfully.');
  }
}

export function getAllFaqs(): FAQ[] {
  // Ensure DB is initialized before querying
  initDb();
  return db.prepare('SELECT * FROM faq').all() as FAQ[];
}

export function getFaqById(id: number): FAQ | undefined {
  initDb();
  return db.prepare('SELECT * FROM faq WHERE id = ?').get(id) as FAQ | undefined;
}
