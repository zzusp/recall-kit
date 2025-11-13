import express from 'express';
import { SupabaseClient } from '../lib/supabase';
import { initQueryHandler } from './queryHandler';
import { initSubmitHandler } from './submitHandler';

export async function initMCP(app: express.Application, supabase: SupabaseClient) {
  // Initialize MCP handlers
  const queryHandler = await initQueryHandler(supabase);
  const submitHandler = await initSubmitHandler(supabase);

  // MCP protocol endpoint
  app.post('/mcp', async (req, res) => {
    try {
      const { method, params } = req.body;

      console.log('MCP Request:', { method, params: params ? '***' : 'none' });

      let result;
      switch (method) {
        case 'query_experiences':
          result = await queryHandler(params);
          break;
        case 'submit_experience':
          result = await submitHandler(params);
          break;
        default:
          return res.status(404).json({
            error: {
              code: -32601,
              message: 'Method not found'
            }
          });
      }

      res.json({
        jsonrpc: '2.0',
        result,
        id: req.body.id || null
      });

    } catch (error) {
      console.error('MCP Error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Internal error'
        },
        id: req.body.id || null
      });
    }
  });

  return {
    queryHandler,
    submitHandler
  };
}