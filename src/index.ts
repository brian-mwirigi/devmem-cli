#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { IndexManager } from './indexer/IndexManager';
import { QueryManager } from './query/QueryManager';
import { Database } from './db/Database';

const program = new Command();
const db = new Database();
const indexer = new IndexManager(db);
const query = new QueryManager(db);

program
  .name('devmem')
  .description('Cross-project memory for AI coding assistants')
  .version('1.0.0');

// Index command
program
  .command('index <path>')
  .description('Index a project or directory')
  .option('-n, --name <name>', 'Project name')
  .option('-r, --recursive', 'Index subdirectories', false)
  .option('--exclude <patterns>', 'Exclude patterns (comma-separated)')
  .action(async (path, options) => {
    try {
      console.log(chalk.gray('Indexing...'));
      const result = await indexer.indexProject(path, options);
      console.log(chalk.green('✓'), 'Indexed project');
      console.log(chalk.gray(`  Files: ${result.filesIndexed}`));
      console.log(chalk.gray(`  Functions: ${result.functionsFound}`));
      console.log(chalk.gray(`  Classes: ${result.classesFound}`));
      console.log(chalk.gray(`  Patterns: ${result.patternsExtracted}`));
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Search command
program
  .command('search <query>')
  .description('Search for code patterns across all indexed projects')
  .option('-p, --project <name>', 'Limit to specific project')
  .option('-t, --type <type>', 'Code type (function, class, pattern)')
  .option('-l, --limit <n>', 'Number of results', '10')
  .action(async (queryText, options) => {
    try {
      const results = await query.search(queryText, options);
      
      if (results.length === 0) {
        console.log(chalk.yellow('No results found'));
        return;
      }
      
      console.log(chalk.bold(`Found ${results.length} result(s):\n`));
      
      results.forEach((r, i) => {
        console.log(chalk.cyan(`${i + 1}.`), chalk.bold(r.name));
        console.log(chalk.gray(`   ${r.projectName} • ${r.filePath}`));
        console.log(chalk.gray(`   Type: ${r.type} • Relevance: ${r.relevance.toFixed(2)}`));
        console.log();
        console.log(chalk.dim('   ' + r.snippet));
        console.log();
      });
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Show command
program
  .command('show <id>')
  .description('Show full code for a specific result')
  .action(async (id) => {
    try {
      const code = await query.getCode(parseInt(id));
      console.log(chalk.bold('Full Code:\n'));
      console.log(code);
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List all indexed projects')
  .action(async () => {
    try {
      const projects = await db.getProjects();
      
      if (projects.length === 0) {
        console.log(chalk.yellow('No projects indexed yet'));
        console.log(chalk.gray('Run'), chalk.bold('devmem index <path>'), chalk.gray('to get started'));
        return;
      }
      
      console.log(chalk.bold('Indexed Projects:\n'));
      
      projects.forEach(p => {
        console.log(chalk.cyan('•'), chalk.bold(p.name));
        console.log(chalk.gray(`  ${p.path}`));
        console.log(chalk.gray(`  ${p.fileCount} files • Indexed ${new Date(p.indexedAt).toLocaleDateString()}`));
        console.log();
      });
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Update command
program
  .command('update [project]')
  .description('Re-index a project or all projects')
  .action(async (project) => {
    try {
      if (project) {
        console.log(chalk.gray(`Updating ${project}...`));
        await indexer.updateProject(project);
        console.log(chalk.green('✓'), 'Project updated');
      } else {
        console.log(chalk.gray('Updating all projects...'));
        await indexer.updateAllProjects();
        console.log(chalk.green('✓'), 'All projects updated');
      }
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Remove command
program
  .command('remove <project>')
  .description('Remove a project from index')
  .action(async (project) => {
    try {
      await db.removeProject(project);
      console.log(chalk.green('✓'), 'Project removed');
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show indexing statistics')
  .action(async () => {
    try {
      const stats = await db.getStats();
      console.log(chalk.bold('DevMem Statistics:\n'));
      console.log(chalk.gray('Projects:'), stats.totalProjects);
      console.log(chalk.gray('Files Indexed:'), stats.totalFiles);
      console.log(chalk.gray('Functions:'), stats.totalFunctions);
      console.log(chalk.gray('Classes:'), stats.totalClasses);
      console.log(chalk.gray('Patterns:'), stats.totalPatterns);
      console.log(chalk.gray('Total Lines:'), stats.totalLines.toLocaleString());
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export index as markdown for AI context')
  .option('-p, --project <name>', 'Specific project')
  .option('-o, --output <path>', 'Output file', './devmem-context.md')
  .action(async (options) => {
    try {
      await query.exportContext(options);
      console.log(chalk.green('✓'), 'Context exported to', options.output);
      console.log(chalk.gray('  Use this file as context for AI assistants'));
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

program.parse();
