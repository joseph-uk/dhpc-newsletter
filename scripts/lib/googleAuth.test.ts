import { describe, it, expect } from 'vitest';
import { validateClientSecret, validateSavedToken, verifyGitignoreCoverage } from './googleAuth';

describe('validateClientSecret', () => {
  const validSecret = {
    installed: {
      client_id: 'test-client-id.apps.googleusercontent.com',
      client_secret: 'test-client-secret',
      redirect_uris: ['http://localhost'],
    },
  };

  it('extracts credentials from valid client secret JSON', () => {
    const result = validateClientSecret(validSecret);
    expect(result.clientId).toBe('test-client-id.apps.googleusercontent.com');
    expect(result.clientSecret).toBe('test-client-secret');
    expect(result.redirectUri).toBe('http://localhost');
  });

  it('throws on null input', () => {
    expect(() => validateClientSecret(null)).toThrow('expected object');
  });

  it('throws on missing installed key', () => {
    expect(() => validateClientSecret({})).toThrow('missing "installed" key');
  });

  it('throws on missing client_id', () => {
    const secret = { installed: { client_secret: 'x', redirect_uris: ['http://localhost'] } };
    expect(() => validateClientSecret(secret)).toThrow('missing client_id');
  });

  it('throws on missing client_secret', () => {
    const secret = { installed: { client_id: 'x', redirect_uris: ['http://localhost'] } };
    expect(() => validateClientSecret(secret)).toThrow('missing client_secret');
  });

  it('throws on missing redirect_uris', () => {
    const secret = { installed: { client_id: 'x', client_secret: 'y' } };
    expect(() => validateClientSecret(secret)).toThrow('missing redirect_uris');
  });

  it('throws on empty redirect_uris array', () => {
    const secret = { installed: { client_id: 'x', client_secret: 'y', redirect_uris: [] } };
    expect(() => validateClientSecret(secret)).toThrow('redirect_uris is empty');
  });
});

describe('validateSavedToken', () => {
  const validToken = {
    access_token: 'ya29.test',
    refresh_token: '1//test',
    token_type: 'Bearer',
    expiry_date: 1700000000000,
  };

  it('validates a well-formed token', () => {
    const result = validateSavedToken(validToken);
    expect(result.access_token).toBe('ya29.test');
    expect(result.refresh_token).toBe('1//test');
    expect(result.token_type).toBe('Bearer');
    expect(result.expiry_date).toBe(1700000000000);
  });

  it('throws on null input', () => {
    expect(() => validateSavedToken(null)).toThrow('expected object');
  });

  it('throws on missing access_token', () => {
    const token = { refresh_token: 'x', token_type: 'Bearer', expiry_date: 1 };
    expect(() => validateSavedToken(token)).toThrow('missing access_token');
  });

  it('throws on missing refresh_token', () => {
    const token = { access_token: 'x', token_type: 'Bearer', expiry_date: 1 };
    expect(() => validateSavedToken(token)).toThrow('missing refresh_token');
  });
});

describe('verifyGitignoreCoverage', () => {
  it('does not throw when credentials path is covered', () => {
    const gitignoreContent = '# secrets\nscripts/.credentials/\nnode_modules/\n';
    expect(() => verifyGitignoreCoverage(gitignoreContent, 'scripts/.credentials/')).not.toThrow();
  });

  it('throws when credentials path is not in gitignore', () => {
    const gitignoreContent = 'node_modules/\ndist/\n';
    expect(() => verifyGitignoreCoverage(gitignoreContent, 'scripts/.credentials/')).toThrow(
      'not found in .gitignore',
    );
  });
});
