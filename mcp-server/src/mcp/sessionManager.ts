import { randomBytes } from 'crypto';

export interface Session {
  id: string;
  createdAt: number;
  lastActivity: number;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  createSession(): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastActivity: now
    });
    return sessionId;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  isValidSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    return session !== undefined;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private generateSessionId(): string {
    // Generate a cryptographically secure session ID
    // Using visible ASCII characters (0x21 to 0x7E) as per spec
    const bytes = randomBytes(32);
    return bytes.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 43); // Ensure it's within visible ASCII range
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

