import { Client, Account, Databases, Functions, ExecutionMethod } from 'appwrite';

export const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69784410001fb7b91e9a';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export { ExecutionMethod };

export const DB_ID = 'mostudy';
export const COLLECTION_USERS = 'user_profiles';
export const COLLECTION_HISTORY = 'quiz_history';
export const COLLECTION_TESTS = 'tests';
export const COLLECTION_REPORTS = 'question_reports';

export default client;
