import { Database } from '../db/Database';
import fg from 'fast-glob';
import { readFileSync } from 'fs';
import { basename, join, relative } from 'path';
import ignore from 'ignore';

export class IndexManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async indexProject(
    path: string,
    options: { name?: string; recursive?: boolean; exclude?: string }
  ): Promise<{
    filesIndexed: number;
    functionsFound: number;
    classesFound: number;
    patternsExtracted: number;
  }> {
    const projectName = options.name || basename(path);
    const projectId = this.db.addProject(projectName, path);

    // Clear existing entries
    this.db.clearProjectEntries(projectId);

    // Get files to index
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.go',
      '**/*.rs',
      '**/*.java'
    ];

    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      ...(options.exclude ? options.exclude.split(',') : [])
    ];

    const files = await fg(patterns, {
      cwd: path,
      ignore: excludePatterns,
      absolute: false
    });

    let functionsFound = 0;
    let classesFound = 0;
    let patternsExtracted = 0;

    for (const file of files) {
      const fullPath = join(path, file);
      const content = readFileSync(fullPath, 'utf-8');
      
      // Extract functions
      const functions = this.extractFunctions(content);
      functions.forEach(fn => {
        this.db.addCodeEntry({
          projectId,
          filePath: file,
          name: fn.name,
          type: 'function',
          code: fn.code,
          snippet: fn.code.slice(0, 200),
          lineStart: fn.lineStart,
          lineEnd: fn.lineEnd,
          keywords: fn.keywords
        });
        functionsFound++;
      });

      // Extract classes
      const classes = this.extractClasses(content);
      classes.forEach(cls => {
        this.db.addCodeEntry({
          projectId,
          filePath: file,
          name: cls.name,
          type: 'class',
          code: cls.code,
          snippet: cls.code.slice(0, 200),
          lineStart: cls.lineStart,
          lineEnd: cls.lineEnd,
          keywords: cls.keywords
        });
        classesFound++;
      });

      // Extract patterns
      const patterns = this.extractPatterns(content);
      patternsExtracted += patterns.length;
    }

    this.db.updateProjectFileCount(projectId, files.length);

    return {
      filesIndexed: files.length,
      functionsFound,
      classesFound,
      patternsExtracted
    };
  }

  async updateProject(projectName: string): Promise<void> {
    const project = this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }

    await this.indexProject(project.path, { name: projectName });
  }

  async updateAllProjects(): Promise<void> {
    const projects = this.db.getProjects();
    for (const project of projects) {
      await this.indexProject(project.path, { name: project.name });
    }
  }

  private extractFunctions(content: string): Array<{
    name: string;
    code: string;
    lineStart: number;
    lineEnd: number;
    keywords: string;
  }> {
    const functions: Array<any> = [];
    const lines = content.split('\n');

    // Simple regex-based extraction (can be enhanced with AST parsing)
    const functionRegex = /(async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*(async\s+)?\(|(\w+)\s*\([^)]*\)\s*{/g;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[2] || match[3] || match[5];
      if (name) {
        const lineStart = content.substring(0, match.index).split('\n').length;
        // Extract function body (simplified)
        const endIndex = this.findClosingBrace(content, match.index);
        const code = content.substring(match.index, endIndex);
        const lineEnd = lineStart + code.split('\n').length;

        functions.push({
          name,
          code,
          lineStart,
          lineEnd,
          keywords: this.extractKeywords(code)
        });
      }
    }

    return functions;
  }

  private extractClasses(content: string): Array<{
    name: string;
    code: string;
    lineStart: number;
    lineEnd: number;
    keywords: string;
  }> {
    const classes: Array<any> = [];
    const classRegex = /class\s+(\w+)/g;
    
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const lineStart = content.substring(0, match.index).split('\n').length;
      const endIndex = this.findClosingBrace(content, match.index);
      const code = content.substring(match.index, endIndex);
      const lineEnd = lineStart + code.split('\n').length;

      classes.push({
        name,
        code,
        lineStart,
        lineEnd,
        keywords: this.extractKeywords(code)
      });
    }

    return classes;
  }

  private extractPatterns(content: string): string[] {
    // Extract common patterns: imports, decorators, etc.
    const patterns: string[] = [];
    
    // Import patterns
    const importRegex = /import\s+.+\s+from\s+['"](.+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      patterns.push(`import:${match[1]}`);
    }

    return patterns;
  }

  private findClosingBrace(content: string, startIndex: number): number {
    let openBraces = 0;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (inString) {
        if (char === stringChar && content[i - 1] !== '\\') {
          inString = false;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        continue;
      }

      if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
        if (openBraces === 0) {
          return i + 1;
        }
      }
    }

    return content.length;
  }

  private extractKeywords(code: string): string {
    // Extract important keywords from code
    const keywords = new Set<string>();
    const words = code.match(/\b[a-zA-Z_]\w*\b/g) || [];
    
    // Filter to meaningful words (exclude common keywords)
    const excluded = new Set(['const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'function', 'class']);
    
    words.forEach(word => {
      if (!excluded.has(word) && word.length > 2) {
        keywords.add(word.toLowerCase());
      }
    });

    return Array.from(keywords).join(' ');
  }
}
