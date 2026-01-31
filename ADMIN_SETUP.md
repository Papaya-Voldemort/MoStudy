# MoStudy Admin Dashboard - Setup Instructions

## Overview

The Admin Dashboard allows authorized users to create, edit, and manage practice tests through a clean web interface. Tests are stored in an Appwrite database and automatically appear on the Study page alongside the static JSON tests.

## Database vs Storage Buckets

**We use Appwrite Database instead of Storage Buckets** because:

1. **Structured Data**: Tests have specific fields (questions, answers, options, categories) that benefit from schema validation
2. **Better Querying**: Database allows filtering, searching, and pagination of tests
3. **Real-time Updates**: Changes to tests are immediately available to all users
4. **Easier Integration**: Works seamlessly with the existing JSON structure
5. **Data Validation**: Database ensures data integrity and consistency

## Setup Steps

### 1. Create Database Collection

You need to create a new collection in your Appwrite project to store tests.

#### Using Appwrite Console:

1. Log in to your [Appwrite Console](https://cloud.appwrite.io/)
2. Navigate to your project: **MoStudy** (Project ID: `69784410001fb7b91e9a`)
3. Go to **Databases** → Select database **mostudy**
4. Click **Create Collection**
5. Set the following:
   - **Collection ID**: `tests`
   - **Collection Name**: `Tests`

#### Configure Collection Attributes:

Add the following attributes to the `tests` collection:

| Attribute Name | Type   | Size | Required | Array |
|----------------|--------|------|----------|-------|
| `test_id`      | String | 100  | Yes      | No    |
| `test_data`    | String | 1000000 | Yes   | No    |

**Notes:**
- `test_id`: Unique identifier for the test (e.g., "fbla-marketing-2025")
- `test_data`: JSON string containing the complete test structure (questions, answers, metadata)

#### Configure Collection Permissions:

Set permissions to allow authenticated users to read tests, but only admins to create/update/delete:

1. In the collection settings, go to **Settings** → **Permissions**
2. Add the following permissions:
   - **Read**: `any` (allows all users to view tests)
   - **Create**: `label("admin")` (only admin users can create)
   - **Update**: `label("admin")` (only admin users can update)
   - **Delete**: `label("admin")` (only admin users can delete)

### 2. Create Indexes (Optional but Recommended)

Create indexes to improve query performance:

1. In the `tests` collection, go to **Indexes**
2. Create the following indexes:
   - **Index Key**: `test_id`
     - Type: Key
     - Attributes: `test_id`
     - Orders: ASC
   - **Index Key**: `$createdAt`
     - Type: Key
     - Attributes: `$createdAt`
     - Orders: DESC

### 3. Grant Admin Access to Users

To give a user admin access:

#### Using Appwrite Console:

1. Go to **Auth** → **Users**
2. Find the user you want to make an admin
3. Click on the user
4. Go to **Labels** section
5. Click **Add Label**
6. Enter `admin` as the label
7. Click **Create**

#### Using Appwrite CLI:

```bash
appwrite users updateLabels \
  --userId [USER_ID] \
  --labels admin
```

### 4. Update appwrite.json (Optional)

If you're using the Appwrite CLI for deployment, update your `appwrite.json`:

```json
{
    "collections": [
        {
            "$id": "tests",
            "databaseId": "mostudy",
            "name": "Tests",
            "permissions": [
                "read(\"any\")",
                "create(\"label:admin\")",
                "update(\"label:admin\")",
                "delete(\"label:admin\")"
            ],
            "attributes": [
                {
                    "key": "test_id",
                    "type": "string",
                    "size": 100,
                    "required": true,
                    "array": false
                },
                {
                    "key": "test_data",
                    "type": "string",
                    "size": 1000000,
                    "required": true,
                    "array": false
                }
            ],
            "indexes": [
                {
                    "key": "test_id_index",
                    "type": "key",
                    "attributes": ["test_id"],
                    "orders": ["ASC"]
                },
                {
                    "key": "created_index",
                    "type": "key",
                    "attributes": ["$createdAt"],
                    "orders": ["DESC"]
                }
            ]
        }
    ]
}
```

Then deploy using:
```bash
appwrite deploy collection
```

## Using the Admin Dashboard

### Accessing the Dashboard

1. Log in to MoStudy using your Google account
2. Ensure your account has the `admin` label (see step 3 above)
3. Navigate to `/admin` or click the **Admin** link in the navigation menu
4. If you don't have admin access, you'll see an "Access Denied" message

### Creating a New Test

1. Click **Create New Test** button
2. Fill in the test information:
   - **Test ID**: Unique identifier (lowercase, use hyphens, e.g., `fbla-marketing-2025`)
   - **Title**: Display name (e.g., "Marketing")
   - **Description**: Brief description (e.g., "FBLA Objective Test • Marketing Strategies")
   - **Time Limit**: Time in seconds (default: 3000 = 50 minutes)
   - **Icon**: Emoji icon (optional, e.g., 📚)
   - **Color**: Visual color scheme for the test card
3. Click **Add Question** to add questions
4. For each question:
   - **Category**: Topic/category (e.g., "Fundamentals")
   - **Question Text**: The actual question
   - **Options**: Four answer choices
   - **Correct Answer**: Select the radio button next to the correct option
5. Click **Save Test** when finished

### Editing a Test

1. Find the test in the dashboard
2. Click the **Edit** button
3. Modify any fields or questions
4. Click **Save Test** to update

### Deleting a Test

1. Find the test in the dashboard
2. Click the **Delete** button
3. Confirm the deletion
4. The test will be permanently removed

## Test Data Structure

Tests are stored as JSON in the following format:

```json
{
  "id": "fbla-marketing-2025",
  "title": "Marketing",
  "description": "FBLA Objective Test • Marketing Strategies",
  "timeLimitSeconds": 3000,
  "icon": "📈",
  "color": "bg-blue-600",
  "questions": [
    {
      "category": "Fundamentals",
      "text": "What is the marketing mix?",
      "options": [
        "Product, Price, Place, Promotion",
        "Supply, Demand, Competition",
        "Revenue, Profit, Loss",
        "Market, Segment, Target"
      ],
      "correct": 0
    }
  ]
}
```

## How It Works

### Test Loading Flow

1. When users visit the Study page, the app loads:
   - Static tests from JSON files in the `data/` folder (existing catalog)
   - Dynamic tests from the Appwrite `tests` collection (admin-created)
2. All tests appear together in the catalog grid
3. Static tests show a "Catalog" badge, custom tests show a "Custom" badge
4. When a test is selected, it loads from the appropriate source

### Integration Points

- **app.js**: Updated to load and merge tests from both sources
- **lib/appwrite.js**: Added `COLLECTION_TESTS` constant
- **auth.js**: Added `isUserAdmin()` helper function
- **nav.js**: Shows/hides admin links based on user role
- **admin.js**: Handles all CRUD operations for tests
- **admin.html**: The admin dashboard interface

## Troubleshooting

### Admin link not showing
- Ensure you're logged in
- Check that your user has the `admin` label in Appwrite
- Refresh the page after adding the label

### "Access Denied" message
- Your account doesn't have the `admin` label
- Contact an administrator to grant access

### Tests not appearing on Study page
- Check browser console for errors
- Verify the `tests` collection exists with correct permissions
- Ensure test data is valid JSON

### Save/Edit operations failing
- Check collection permissions allow `label("admin")` for create/update
- Verify you have admin label on your account
- Check browser console for specific error messages

## Security Notes

1. **Label-Based Access**: Only users with the `admin` label can access the dashboard
2. **Collection Permissions**: Database permissions enforce label-based access control
3. **Client-Side Validation**: Admin checks happen both client and server-side
4. **No Direct API Access**: Regular users can only read tests, not modify them

## Migration from JSON to Database

If you want to migrate existing JSON tests to the database:

1. Access the admin dashboard
2. Manually recreate each test using the UI
3. Or use the Appwrite SDK/CLI to bulk import:

```javascript
import { Client, Databases, ID } from 'appwrite';

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('69784410001fb7b91e9a');

const databases = new Databases(client);

// Load your JSON file
const testData = require('./data/marketing.json');

await databases.createDocument(
    'mostudy',
    'tests',
    ID.unique(),
    {
        test_id: testData.id,
        test_data: JSON.stringify(testData)
    }
);
```

## Future Enhancements

Possible improvements for the admin system:

- Bulk import from JSON files
- Export tests to JSON
- Test categories/tags
- Question bank for reuse across tests
- Test statistics and analytics
- Version history and rollback
- Collaborative editing
- Image/media support for questions
- Rich text formatting
- Test templates

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Appwrite collection setup
3. Confirm user has admin label
4. Review collection permissions

## Summary

Your admin dashboard is now set up! Admin users can:
- ✅ Create new practice tests
- ✅ Edit existing tests
- ✅ Delete tests
- ✅ Manage questions and answers
- ✅ See all tests in one dashboard

Regular users will:
- ✅ See all tests (JSON + database) on the Study page
- ✅ Take tests as normal
- ❌ Not see the Admin link
- ❌ Not access the admin dashboard
