import { Database } from '../db/Database';
import { writeFileSync } from 'fs';

export class QueryManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async search(
    query: string,
    options: {
      project?: string;
      type?: string;
      limit: string;
    }
  ): Promise<Array<any>> {
    const limit = parseInt(options.limit);
    
    return this.db.searchCode(query, {
      project: options.project,
      type: options.type,
      limit
    });
  }

  async getCode(id: number): Promise<string> {
    const entry = this.db.getCodeEntry(id);
    if (!entry) {
      throw new Error('Code entry not found');
    }
    return entry.code;
  }

  async exportContext(options: {
    project?: string;
    output: string;
  }): Promise<void> {
    const projects = options.project
      ? [this.db.getProject(options.project)].filter(Boolean)
      : this.db.getProjects();

    let markdown = '# DevMem Code Context\n\n';
    markdown += 'This file contains indexed code patterns from your projects.\n';
    markdown += 'Use it as context when working with AI coding assistants.\n\n';

    for (const project of projects as any[]) {
      markdown += `## Project: ${project.name}\n\n`;
      markdown += `Path: ${project.path}\n\n`;
      
      const entries = this.db.searchCode('', {
        project: project.name,
        limit: 1000
      });

      // Group by type
      const functions = entries.filter(e => e.type === 'function');
      const classes = entries.filter(e => e.type === 'class');

      if (functions.length > 0) {
        markdown += `### Functions (${functions.length})\n\n`;
        functions.slice(0, 20).forEach(fn => {
          markdown += `#### ${fn.name}\n\n`;
          markdown += `File: \`${fn.filePath}\`\n\n`;
          markdown += '```typescript\n';
          markdown += fn.snippet;
          markdown += '\n```\n\n';
        });
      }

      if (classes.length > 0) {
        markdown += `### Classes (${classes.length})\n\n`;
        classes.slice(0, 20).forEach(cls => {
          markdown += `#### ${cls.name}\n\n`;
          markdown += `File: \`${cls.filePath}\`\n\n`;
          markdown += '```typescript\n';
          markdown += cls.snippet;
          markdown += '\n```\n\n';
        });
      }

      markdown += '\n---\n\n';
    }

    writeFileSync(options.output, markdown);
  }
}
