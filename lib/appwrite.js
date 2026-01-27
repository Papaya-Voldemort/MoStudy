import { Client, Account, Databases, Functions } from 'appwrite';

const client = new Client();

// Configuration
const PROJECT_ID = '6976c7cf0024477f0a50';

// For local development, we use http://localhost/v1 to avoid self-signed cert issues
// and ensure we hit the correct port (80) if 443 isn't configured correctly.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const ENDPOINT = isLocal ? 'http://localhost/v1' : 'https://cloud.appwrite.io/v1';

client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

// Database Constants
export const DB_ID = 'mostudy';
export const COLLECTION_USERS = 'user_profiles';
export const COLLECTION_HISTORY = 'quiz_history';

// Helper to expose to window for legacy scripts if needed
window.appwriteClient = client;
window.appwriteAccount = account;
window.appwriteDatabases = databases;

export default client;
