# Detailed Appwrite Index Setup Guide

Appwrite requires manual indexing for any field used in a `Query`. If you see "Index not found" errors in your console, follow these steps to fix them.

## 1. Navigating to Indexes
1. Open your [Appwrite Console](https://cloud.appwrite.io/).
2. Select your **MoStudy** project.
3. Click on **Databases** in the left sidebar.
4. Click on your **MoStudy** database.
5. Select the collection you want to index (e.g., `quizReports`).
6. Click the **Indexes** tab at the top of the collection view.

---

## 2. Collection: `quizReports`
You need to create **two** separate indexes for this collection.

### Index A: `userid`
*   Click **+ Create Index**.
*   **Index Key:** `userid_index`
*   **Index Type:** `Key`
*   **Attributes:** 
    *   Select **`userid`** (lowercase) from the dropdown. 
    *   *Note*: Ensure you have created the attribute as `userid` (lowercase) and type **String**.
    *   Order: `ASC`
*   Click **Create**.

### Index B: `timestamp`
*   Click **+ Create Index**.
*   **Index Key:** `timestamp_index`
*   **Index Type:** `Key`
*   **Attributes:** 
    *   Select `timestamp` from the dropdown.
    *   Order: **`DESC`** (This is important for showing newest results first).
*   Click **Create**.

---

## 3. Collection: `roleplayReports`
Repeat the same process as above.

### Index A: `userId`
*   **Index Key:** `userId_index`
*   **Index Type:** `Key`
*   **Attributes:** `userId` (ASC)

### Index B: `timestamp`
*   **Index Key:** `timestamp_index`
*   **Index Type:** `Key`
*   **Attributes:** `timestamp` (**DESC**)

---

## 4. Collection: `users` (If needed)
The application fetches the user document by its ID (the Appwrite `$id`), which is indexed by default. You typically do not need to add custom indexes here unless you search for users by theme or email.

---

## Troubleshooting FAQ

### "The index is stuck in 'Processing'"
This is normal for Appwrite Cloud. It usually takes 30-60 seconds to build the index. Refresh the page after a minute.

### "I get a 400 error when creating an index"
Ensure the attribute (like `userId`) has finished being created and is in the "Available" state before adding an index to it.

### "Why is my history empty even if indexes are green?"
Check the **Permissions** tab for the collection. 
1. Go to **Settings** (next to Indexes).
2. Look for **Permissions**.
3. Add a role: **"Any"** or **"Users"**.
4. Check **Read**, **Create**, **Update**, **Delete**.
5. Click **Update**.
*(Note: Since we use a Server API Key in the backend, the backend can always read/write, but the browser needs these permissions if you call Appwrite directly from JS).*
