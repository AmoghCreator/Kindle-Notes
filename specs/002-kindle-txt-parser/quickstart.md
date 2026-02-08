# Quick Start Guide: Kindle Text File Import

**Last Updated**: February 8, 2026  
**Feature**: Text file import with automatic deduplication  

## Overview

Import your Kindle notes and highlights from exported text files directly into your library. The system automatically detects and prevents duplicate entries while preserving all your annotations and metadata.

## Getting Your Kindle Notes

### Step 1: Export from Kindle
1. **From Kindle App**: 
   - Open Kindle app on your device
   - Go to Settings → Reading Options → Export Notes
   - Choose "Export All" or select specific books
   - Save the exported `.txt` file

2. **From Amazon Account**:
   - Visit [kindle.amazon.com](https://kindle.amazon.com)
   - Go to "Your Highlights" section  
   - Click "Export" and download the text file

3. **From Physical Kindle**:
   - Connect Kindle to computer via USB
   - Navigate to `Documents/My Clippings.txt`
   - Copy this file to your computer

### Step 2: Verify File Format
Your exported file should contain entries that look like this:

```
Steve Jobs (Walter Isaacson)
- Your Highlight on page 255 | location 3343-3345 | Added on Monday, 7 July 2025 22:39:59

For Sculley, the problem was that Jobs, when he was no longer in courtship or manipulative mode, was frequently obnoxious, rude, selfish, and nasty to other people.
==========
Steve Jobs (Walter Isaacson) 
- Your Note on page 255 | location 3344 | Added on Monday, 7 July 2025 22:41:16

This is what other people told about me, notably Arshia, idk what to do with this finding...
==========
```

## Importing Your Notes

### Step 1: Access Upload Page
1. Open your Kindle Notes website
2. Navigate to the Library page
3. Click the "Upload Files" button
4. Select "Import Text File" from the dropdown

### Step 2: Upload Your File
1. **Choose File**: Click "Choose File" and select your exported text file
2. **Review Details**: The system shows file size and estimated processing time
3. **Configure Import**: 
   - **Duplicate Handling**: Choose how to handle duplicates
     - *Skip Duplicates*: Don't import exact matches (default)
     - *Update Content*: Replace existing notes if content changed
     - *Prompt for Conflicts*: Ask before making changes
   - **Error Handling**: Choose parser strictness
     - *Standard*: Handle minor formatting issues automatically
     - *Strict*: Only accept perfectly formatted entries

### Step 3: Monitor Progress
1. **Parsing**: Watch real-time progress as entries are processed
2. **Conflict Resolution**: Review any potential duplicates
   - See side-by-side comparison of existing vs new content
   - Choose to keep existing, replace, or keep both
3. **Completion**: View import summary with statistics

## Understanding Import Results

### Import Summary
After import completes, you'll see:
- **Books Added**: New books discovered in your file
- **Notes Added**: New highlights and annotations imported
- **Duplicates Skipped**: Entries that already existed
- **Content Updated**: Notes that were modified since last import

### Viewing Imported Content
1. **Library View**: All imported books appear alongside existing books
2. **Book Details**: Click any book to see highlights and notes
3. **Search**: Use search to find specific imported content
4. **Filter**: Filter by import date to see recent additions

## Deduplication Logic

### How Duplicates Are Detected
The system checks for duplicates using:
1. **Book Match**: Same title and author
2. **Location Match**: Same page/location reference  
3. **Content Match**: Identical or very similar text
4. **Type Match**: Same type (highlight, note, bookmark)

### Handling Different Scenarios

**Exact Duplicate**: Same book, location, and content
- *Action*: Skip import (no changes)
- *Reason*: Entry already exists

**Content Update**: Same book and location, different content  
- *Action*: Replace existing content (if enabled)
- *Reason*: Note was edited after original import

**Similar Content**: Same location, slightly different text
- *Action*: Prompt for user decision
- *Options*: Keep original, use new version, or keep both

**New Content**: Different location or book
- *Action*: Add to library
- *Reason*: Unique entry

## Troubleshooting

### File Format Issues

**Problem**: "Invalid file format" error
- **Solution**: Ensure file is exported from Kindle and contains proper entry separators (`==========`)
- **Check**: File should be plain text (.txt), not Word document or PDF

**Problem**: "No entries found" message
- **Solution**: Verify file contains actual notes and highlights, not just book metadata
- **Check**: Look for lines starting with "- Your Highlight" or "- Your Note"

**Problem**: "Parsing errors detected" warning
- **Solution**: Enable error recovery mode in import options
- **Note**: Some malformed entries may be skipped but import continues

### Performance Issues

**Problem**: Import takes a long time
- **Expected**: Large files (1000+ entries) may take several minutes
- **Solution**: Don't close browser tab, process continues in background
- **Monitor**: Watch progress bar for estimated completion time

**Problem**: Browser becomes unresponsive  
- **Cause**: Very large files (>10MB) may overwhelm browser
- **Solution**: Split large files into smaller chunks before importing
- **Alternative**: Try importing during off-peak hours with stable internet

### Duplicate Detection Issues

**Problem**: System shows duplicates that look different
- **Reason**: Content may have minor formatting differences (spaces, punctuation)
- **Solution**: Use "View Details" to see exact comparison
- **Action**: Choose whether differences are significant enough to keep both

**Problem**: Missing notes after import
- **Check**: Look in "Import Summary" for items marked as duplicates
- **Verify**: Use search to confirm notes aren't already in library
- **Action**: Re-import with "Prompt for Conflicts" enabled for more control

## Best Practices

### Before Importing
1. **Backup**: Export current library as backup before large imports
2. **Clean Files**: Remove non-Kindle content from exported files  
3. **Check Format**: Verify file contains proper entry separators
4. **Size Check**: Split files larger than 5MB for better performance

### During Import
1. **Stay Online**: Don't close browser during import process
2. **Review Conflicts**: Take time to review potential duplicates carefully
3. **Monitor Progress**: Watch for any error messages or warnings

### After Import
1. **Verify Results**: Spot-check a few imported books to ensure accuracy
2. **Review Summary**: Check import statistics for any unexpected results
3. **Search Test**: Try searching for content you know was imported
4. **Backup Again**: Create new backup including imported content

## Support

### Getting Help
- **Documentation**: Check [full documentation](./plan.md) for technical details
- **Examples**: See [sample files](../tests/fixtures/) for format references
- **Issues**: Report problems through the feedback system

### Common Questions

**Q**: Can I import the same file multiple times?
**A**: Yes, duplicate detection prevents creating duplicate entries

**Q**: What happens if I edited notes after exporting?
**A**: Re-import with "Update Content" enabled to get your latest changes

**Q**: Can I undo an import?
**A**: Yes, each import session can be rolled back from the import history page

**Q**: Why are some entries missing after import?
**A**: Check the import summary - entries may have been identified as duplicates or failed validation

---

*For advanced usage and API documentation, see the [technical specification](./spec.md)*