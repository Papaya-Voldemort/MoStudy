import { account } from './appwrite.js';

export const authState = $state({ user: null, loading: true, initialized: false });

export async function initAuth() {
  try {
    const user = await account.get();
    authState.user = user;
  } catch {
    authState.user = null;
  } finally {
    authState.loading = false;
    authState.initialized = true;
  }
}

export async function loginGoogle() {
  const origin = window.location.origin + window.location.pathname;
  account.createOAuth2Session('google', origin + '#/', origin + '#/');
}

export async function logout() {
  try {
    await account.deleteSession('current');
    authState.user = null;
  } catch (e) {
    console.error('Logout error:', e);
  }
}

export function getCurrentUser() {
  return authState.user;
}
