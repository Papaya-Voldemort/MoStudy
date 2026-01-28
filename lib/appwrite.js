import { Client, Account, Databases, Functions } from 'appwrite';

const client = new Client();

// Configuration
const PROJECT_ID = 'sfo-69784410001fb7b91e9a';

// Use Appwrite Cloud by default
const ENDPOINT = 'https://cloud.appwrite.io/v1';

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
