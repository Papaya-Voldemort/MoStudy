import { Client, Account, Databases, Functions, ExecutionMethod } from 'appwrite';

const client = new Client();

// Configuration - HARDCODED FOR PRODUCTION [v2.0 - 2026-01-31]
const PROJECT_ID = '69784410001fb7b91e9a';

// Use Appwrite Cloud by default
const ENDPOINT = 'https://sfo.cloud.appwrite.io/v1';

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('69784410001fb7b91e9a');

console.log('[MoStudy] Appwrite initialized with Project ID:', '69784410001fb7b91e9a');

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export { ExecutionMethod };

export const APPWRITE_ENDPOINT = ENDPOINT;
export const APPWRITE_PROJECT_ID = PROJECT_ID;

// Database Constants
export const DB_ID = 'mostudy';
export const COLLECTION_USERS = 'user_profiles';
export const COLLECTION_HISTORY = 'quiz_history';
export const COLLECTION_TESTS = 'tests';
export const COLLECTION_REPORTS = 'question_reports';

/**
 * Executes an Appwrite function with synchronous attempt and asynchronous fallback/polling
 * to avoid the 30-second timeout limit on cloud executions.
 */
export async function safeExecuteFunction(functionId, payload, options = {}) {
    const { 
        asyncFallback = true, 
        maxPolls = 60, 
        pollInterval = 2000,
        path = '/',
        method = ExecutionMethod.POST,
        headers = { 'Content-Type': 'application/json' }
    } = options;

    let execution;
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
        // First attempt: Synchronous (Fast)
        execution = await functions.createExecution(
            functionId,
            body,
            false,
            path,
            method,
            headers
        );
    } catch (e) {
        // If synchronous call times out (408), switch to Async + Polling
        if (asyncFallback && (e.code === 408 || e.status === 408 || e.message?.toLowerCase().includes('timeout'))) {
            console.warn(`[Appwrite] Sync execution for ${functionId} timed out, switching to async polling...`);
            
            const asyncExec = await functions.createExecution(
                functionId,
                body,
                true,
                path,
                method,
                headers
            );

            // Poll for completion
            let pollCount = 0;
            while (pollCount < maxPolls) {
                await new Promise(r => setTimeout(r, pollInterval));
                execution = await functions.getExecution(functionId, asyncExec.$id);
                
                if (execution.status === 'completed') {
                    console.log(`[Appwrite] Async execution for ${functionId} completed after ${pollCount + 1} polls.`);
                    break;
                }
                
                if (execution.status === 'failed') {
                    throw new Error(`AI function execution ${asyncExec.$id} failed`);
                }
                
                pollCount++;
            }
            
            if (execution.status !== 'completed') {
                throw new Error(`AI function execution for ${functionId} timed out after polling for ${maxPolls * pollInterval / 1000}s`);
            }
        } else {
            throw e;
        }
    }
    return execution;
}

// Helper to expose to window for legacy scripts if needed
window.appwriteClient = client;
window.appwriteAccount = account;
window.appwriteDatabases = databases;

export default client;
