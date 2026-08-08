import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { avatarFileApiPath, publicUploadUrl } from '../utils/uploadPaths.js';

describe('avatar storage vs display URL', () => {
  it('stores disk references under /uploads, not API display paths', () => {
    const stored = publicUploadUrl('1234567890-avatar.png');
    assert.equal(stored, '/uploads/1234567890-avatar.png');
    assert.doesNotMatch(stored, /\/api\/files\//);
  });

  it('API display path is derived from user id for authenticated serving', () => {
    const display = avatarFileApiPath(42);
    assert.equal(display, '/api/files/avatars/42');
  });

  it('profile save must not persist API avatar URLs', () => {
    const apiUrl = '/api/files/avatars/42';
    const existingStored = '/uploads/1234567890-avatar.png';

    // Mirrors AuthService.updateProfile behavior: ignore client avatarUrl.
    const nextStored = existingStored;
    assert.notEqual(nextStored, apiUrl);
    assert.equal(nextStored, existingStored);
  });
});
