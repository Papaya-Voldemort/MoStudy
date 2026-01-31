# Auto-Save and Versioning Features

## Overview
The admin test maker now includes automatic saving and version history tracking to prevent data loss and allow you to restore previous versions of tests.

## Features

### 🔄 Auto-Save
- **Automatic Saving**: Changes are automatically saved every 30 seconds while editing a test
- **Visual Indicators**: Save status is displayed at the top of the modal showing:
  - "Loaded" - When test is first opened
  - "Unsaved changes" - When you make modifications
  - "Saving..." - While save is in progress
  - "Auto-saved at [time]" - When auto-save completes successfully
  - "Save failed" - If there's an error during save

### 📚 Version History
- **Automatic Versioning**: Every time you manually save a test, a version is created
- **Version Limit**: Keeps the last 10 versions per test
- **Version Information**: Each version shows:
  - Version number
  - Date and time saved
  - Number of questions in that version

### 🔙 Version Restore
- **View History**: Click the "Versions" button (visible when editing existing tests)
- **Browse Versions**: See all saved versions in reverse chronological order
- **One-Click Restore**: Click on any version to restore it to the editor
- **Safety Confirmation**: Warns before overwriting unsaved changes

### 💾 Manual Save
- **Save Button**: Manual save button still available for immediate saving
- **Version Creation**: Creates a new version entry
- **Validation**: Validates all required fields before saving

### ⚠️ Unsaved Changes Warning
- **Close Protection**: Warns when attempting to close the editor with unsaved changes
- **Change Tracking**: Monitors all form inputs and tracks modification state

## How to Use

### Creating a New Test
1. Click "Create New Test"
2. Fill in test information and questions
3. Changes are auto-saved every 30 seconds
4. Click "Save Test" when complete
5. Auto-save stops when you close the editor

### Editing an Existing Test
1. Click "Edit" on a test card
2. Make your changes
3. Auto-save runs in the background
4. Click "Versions" button to view version history
5. Click on any version to restore it
6. Click "Save Test" to finalize changes

### Restoring a Previous Version
1. While editing a test, click the "Versions" button
2. Browse the list of saved versions
3. Click "Restore" on the version you want
4. Confirm the restoration
5. The editor will load that version's data
6. Save to apply the restored version

## Technical Details

### Storage
- **Version History**: Stored in browser's localStorage
- **Key Format**: `test_versions_[testId]`
- **Data Format**: JSON array of version objects

### Version Object Structure
```json
{
  "testId": "test-id",
  "data": { /* full test data */ },
  "timestamp": "2026-01-31T12:00:00.000Z",
  "version": 1
}
```

### Auto-Save Behavior
- **Interval**: 30 seconds
- **Trigger**: Only saves if changes detected (isDirty flag)
- **Validation**: Skips validation during auto-save
- **Database**: Updates existing document or creates new one
- **State Management**: Updates dirty flag and last saved timestamp

### Change Detection
- Monitors all input, textarea, and select elements
- Tracks radio button selections
- Sets dirty flag on any change
- Updates save status indicator

## Benefits

1. **Data Protection**: Never lose work due to accidental closure or browser crashes
2. **Experimentation**: Feel free to make changes knowing you can revert
3. **Audit Trail**: Track how tests evolve over time
4. **Collaboration**: Review what changed between versions
5. **Peace of Mind**: Visual confirmation of save status

## Limitations

- Version history stored in localStorage (browser-specific)
- Maximum 10 versions per test
- Auto-save requires active browser tab
- Version history not synced across devices

## Future Enhancements

Potential improvements for future versions:
- Cloud-based version storage
- Unlimited version history
- Version comparison/diff view
- Named versions with comments
- Shared version history across devices
- Export/import version history
