import { middleware as authMiddleware } from './src/lib/middleware/authMiddleware';

export default authMiddleware;
export const config = authMiddleware.config;