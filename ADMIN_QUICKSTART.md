# Admin Dashboard Quick Start

## Quick Access

**URL**: `/admin` or click the **Admin** link in the navigation (only visible to admin users)

## Prerequisites

1. **Logged in** to MoStudy with Google
2. **Admin label** assigned to your Appwrite user account

## First-Time Setup

### 1. Create the Database Collection

Run this command with Appwrite CLI:

```bash
# Deploy the collections defined in appwrite.json
appwrite deploy collection
```

Or manually in Appwrite Console:
1. Go to **Databases** → **mostudy**
2. Create collection with ID: `tests`
3. Add attributes:
   - `test_id` (String, 100, required)
   - `test_data` (String, 1000000, required)
4. Set permissions:
   - Read: `any`
   - Create/Update/Delete: `label("admin")`

### 2. Grant Admin Access

Give yourself admin access:

```bash
# Using Appwrite CLI
appwrite users updateLabels --userId YOUR_USER_ID --labels admin
```

Or in Appwrite Console:
1. **Auth** → **Users** → Select your user
2. **Labels** → Add `admin`

## Creating Your First Test

1. Navigate to `/admin`
2. Click **Create New Test**
3. Fill in:
   ```
   Test ID: my-first-test
   Title: My First Test
   Description: A sample test for demonstration
   Time Limit: 3000 (seconds)
   Icon: 📝
   Color: Blue
   ```
4. Click **Add Question**
5. Fill in question details:
   ```
   Category: Sample
   Question: What is 2+2?
   Options: 3, 4, 5, 6
   Correct: Select option "4"
   ```
6. Click **Save Test**

Your test now appears on the Study page!

## Features

- ✅ **Full CRUD**: Create, Read, Update, Delete tests
- ✅ **Mobile-friendly**: Works on desktop and mobile
- ✅ **Live updates**: Tests immediately appear on Study page
- ✅ **Secure**: Only admin users can access
- ✅ **Visual editor**: No JSON editing required

## Database Choice

We use **Appwrite Database** (not Storage Buckets) because:
- Better for structured test data
- Easier querying and filtering
- Real-time updates
- Data validation
- Seamless integration with existing code

## Troubleshooting

**Admin link not showing?**
- Ensure you have the `admin` label
- Log out and log back in
- Clear browser cache

**Can't save tests?**
- Check collection permissions
- Verify admin label is set
- Check browser console for errors

**Tests not showing on Study page?**
- Verify collection exists
- Check test_data is valid JSON
- Ensure permissions allow `read("any")`

## Full Documentation

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for complete setup instructions, security notes, and advanced usage.
