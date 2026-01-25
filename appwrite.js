/**
 * Appwrite Configuration
 * 
 * This file initializes the Appwrite SDK with your project credentials.
 * It's automatically pinged on app startup to verify the connection.
 */

import { Client, Account, Databases } from "appwrite";

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint("https://sfo.cloud.appwrite.io/v1")
    .setProject("697553c800048b6483c8");

// Initialize Appwrite Services
const account = new Account(client);
const databases = new Databases(client);

/**
 * Verify Appwrite connection by pinging the backend
 * Called on app initialization to ensure the setup is correct
 */
export const initializeAppwrite = async () => {
    try {
        // Ping the Appwrite backend to verify connection
        await client.call('get', '/health');
        console.log('✅ Appwrite connection verified');
        return true;
    } catch (error) {
        console.error('❌ Appwrite connection failed:', error);
        return false;
    }
};

// Export services for use throughout the app
export { client, account, databases };
