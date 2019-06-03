import { currentEnv } from '../src/environment';
import process from 'process';

describe('environment functions', () => {
  it('should panic if NODE_ENV is empty', () => {
    process.env.NODE_ENV = 'asd';

    expect(() => {
      currentEnv('');
    }).toThrow();
  });

  it('should return "production" if NODE_ENV is "production"', () => {
    expect(currentEnv(DEFINE_NODE_ENV).NODE_ENV).toBe('test');
  });
});