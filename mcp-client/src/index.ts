#!/usr/bin/env node

import { Command } from 'commander';
import { MCPClient } from './client/mcpClient';
import { config } from 'dotenv';

// Load environment variables
config();

const program = new Command();

program
  .name('recall-kit-client')
  .description('MCP Client for Recall Kit Experience Sharing Platform')
  .version('1.0.0');

program
  .command('query')
  .description('Query experiences from the platform')
  .argument('<keywords...>', 'Search keywords')
  .option('-l, --limit <number>', 'Number of results to return', '10')
  .option('-s, --sort <type>', 'Sort type: relevance, query_count, created_at', 'relevance')
  .action(async (keywords, options) => {
    try {
      const client = new MCPClient();
      const result = await client.queryExperiences({
        keywords,
        limit: parseInt(options.limit),
        sort: options.sort as any
      });

      console.log(`Found ${result.experiences.length} experiences:`);
      console.log('');
      
      result.experiences.forEach((exp, index) => {
        console.log(`${index + 1}. ${exp.title}`);
        console.log(`   Problem: ${exp.problem_description.substring(0, 100)}...`);
        console.log(`   Solution: ${exp.solution.substring(0, 100)}...`);
        if (exp.keywords.length > 0) {
          console.log(`   Keywords: ${exp.keywords.join(', ')}`);
        }
        console.log(`   Views: ${exp.query_count} | Created: ${new Date(exp.created_at).toLocaleDateString()}`);
        console.log('');
      });

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('submit')
  .description('Submit a new experience to the platform')
  .option('-t, --title <title>', 'Experience title')
  .option('-p, --problem <problem>', 'Problem description')
  .option('-s, --solution <solution>', 'Solution description')
  .option('-r, --root-cause <cause>', 'Root cause (optional)')
  .option('-c, --context <context>', 'Context/code (optional)')
  .option('-k, --keywords <keywords>', 'Comma-separated keywords')
  .action(async (options) => {
    try {
      if (!options.title || !options.problem || !options.solution) {
        throw new Error('Title, problem, and solution are required');
      }

      const client = new MCPClient();
      const result = await client.submitExperience({
        title: options.title,
        problem_description: options.problem,
        solution: options.solution,
        root_cause: options.rootCause,
        context: options.context,
        keywords: options.keywords ? options.keywords.split(',') : []
      });

      if (result.status === 'success') {
        console.log('✅ Experience submitted successfully!');
        console.log(`Experience ID: ${result.experience_id}`);
      } else {
        console.error('❌ Failed to submit experience:', result.error);
        process.exit(1);
      }

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();