import { handler } from '../../src/handlers/healthCheck';

describe('healthCheck handler', () => {
  it('returns ok', async () => {
    const res = await handler({} as any);
    expect(res.statusCode).toBe(200);
    if (!res.body) {
      throw new Error('Response body is undefined');
    }
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });
});
