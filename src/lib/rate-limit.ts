import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 60, // per 60 seconds
});

export async function checkRateLimit(ip: string) {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch (rejRes) {
    return false;
  }
}
