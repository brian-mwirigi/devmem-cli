import SQLiteDatabase from 'better-sqlite3';
import type { Database as SQLiteDB } from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

export interface Project {
  id?: number;
  name: string;
  path: string;
  fileCount: number;
  indexedAt: string;
}

export interface CodeEntry {
  id?: number;
  projectId: number;
  filePath: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'pattern';
  code: string;
  snippet: string;
  lineStart: number;
  lineEnd: number;
  keywords: string;
}

export class Database {
  private db: SQLiteDB;
  private dbPath: string;

  constructor() {
    const dir = join(homedir(), '.devmem');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.dbPath = join(dir, 'index.db');
    this.db = new SQLiteDatabase(this.dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        path TEXT NOT NULL,
        file_count INTEGER DEFAULT 0,
        indexed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS code_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        code TEXT NOT NULL,
        snippet TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        keywords TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );

      CREATE INDEX IF NOT EXISTS idx_project_id ON code_entries(project_id);
      CREATE INDEX IF NOT EXISTS idx_type ON code_entries(type);
      CREATE INDEX IF NOT EXISTS idx_name ON code_entries(name);
      CREATE INDEX IF NOT EXISTS idx_keywords ON code_entries(keywords);
    `);
  }

  addProject(name: string, path: string): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects (name, path, indexed_at)
      VALUES (?, ?, datetime('now'))
    `);
    
    const result = stmt.run(name, path);
    return result.lastInsertRowid as number;
  }

  updateProjectFileCount(projectId: number, count: number): void {
    const stmt = this.db.prepare(`
      UPDATE projects SET file_count = ? WHERE id = ?
    `);
    stmt.run(count, projectId);
  }

  addCodeEntry(entry: Omit<CodeEntry, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO code_entries (
        project_id, file_path, name, type, code, snippet,
        line_start, line_end, keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      entry.projectId,
      entry.filePath,
      entry.name,
      entry.type,
      entry.code,
      entry.snippet,
      entry.lineStart,
      entry.lineEnd,
      entry.keywords
    );
    
    return result.lastInsertRowid as number;
  }

  getProjects(): Project[] {
    const stmt = this.db.prepare(`
      SELECT * FROM projects ORDER BY indexed_at DESC
    `);
    return stmt.all() as Project[];
  }

  getProject(name: string): Project | null {
    const stmt = this.db.prepare(`
      SELECT * FROM projects WHERE name = ?
    `);
    return stmt.get(name) as Project | null;
  }

  searchCode(query: string, options: {
    project?: string;
    type?: string;
    limit: number;
  }): Array<CodeEntry & { projectName: string; relevance: number }> {
    let sql = `
      SELECT 
        ce.*,
        p.name as projectName,
        (
          CASE 
            WHEN ce.name LIKE ? THEN 100
            WHEN ce.keywords LIKE ? THEN 50
            WHEN ce.snippet LIKE ? THEN 25
            ELSE 10
          END
        ) as relevance
      FROM code_entries ce
      JOIN projects p ON ce.project_id = p.id
      WHERE (ce.name LIKE ? OR ce.keywords LIKE ? OR ce.snippet LIKE ?)
    `;

    const params: any[] = [
      `%${query}%`, `%${query}%`, `%${query}%`,
      `%${query}%`, `%${query}%`, `%${query}%`
    ];

    if (options.project) {
      sql += ` AND p.name = ?`;
      params.push(options.project);
    }

    if (options.type) {
      sql += ` AND ce.type = ?`;
      params.push(options.type);
    }

    sql += ` ORDER BY relevance DESC, ce.name LIMIT ?`;
    params.push(options.limit);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as any[];
  }

  getCodeEntry(id: number): CodeEntry | null {
    const stmt = this.db.prepare(`
      SELECT * FROM code_entries WHERE id = ?
    `);
    return stmt.get(id) as CodeEntry | null;
  }

  removeProject(name: string): void {
    const project = this.getProject(name);
    if (!project) {
      throw new Error(`Project not found: ${name}`);
    }

    this.db.prepare(`DELETE FROM code_entries WHERE project_id = ?`).run(project.id);
    this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(project.id);
  }

  clearProjectEntries(projectId: number): void {
    this.db.prepare(`DELETE FROM code_entries WHERE project_id = ?`).run(projectId);
  }

  getStats() {
    const result = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT p.id) as totalProjects,
        SUM(p.file_count) as totalFiles,
        SUM(CASE WHEN ce.type = 'function' THEN 1 ELSE 0 END) as totalFunctions,
        SUM(CASE WHEN ce.type = 'class' THEN 1 ELSE 0 END) as totalClasses,
        SUM(CASE WHEN ce.type = 'pattern' THEN 1 ELSE 0 END) as totalPatterns,
        SUM(ce.line_end - ce.line_start) as totalLines
      FROM projects p
      LEFT JOIN code_entries ce ON p.id = ce.project_id
    `).get() as any;

    return result;
  }

  close() {
    this.db.close();
  }
}
