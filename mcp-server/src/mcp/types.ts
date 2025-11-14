// MCP Protocol Types
export const MCP_PROTOCOL_VERSION = '2025-06-18';

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: JSONRPCError;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface InitializeRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'initialize';
  params: {
    protocolVersion: string;
    capabilities: {
      roots?: {
        listChanged?: boolean;
      };
      sampling?: {};
    };
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: {};
    resources?: {};
    prompts?: {};
    sampling?: {};
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: InitializeResult;
}

export interface InitializedNotification {
  jsonrpc: '2.0';
  method: 'initialized';
}

export interface Session {
  id: string;
  createdAt: number;
  lastActivity: number;
}

