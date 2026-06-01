# 🚀 Cloudinary Setup Guide - Novel Den

## Problem Fixed
✅ Images were stored locally in `public/uploads/` which **doesn't persist on Vercel**  
✅ Now using **Cloudinary CDN** for production-ready image & PDF storage  
✅ All files are backed by secure cloud storage with automatic optimization

---

## 1️⃣ Get Your Cloudinary Credentials

1. **Sign up** at [Cloudinary.com](https://cloudinary.com) (free account is fine)
2. Go to **Dashboard** → **Settings** → **API Keys**
3. Copy these 3 values:
   - `Cloud Name` (looks like: `abc123def`)
   - `API Key` (looks like: `123456789012345`)
   - `API Secret` (looks like: `aBcDeFg_HiJkLmNoPqRsTuV`)

⚠️ **NEVER commit your API Secret to GitHub!** Use environment variables.

---

## 2️⃣ Setup Environment Variables

### Local Development
Create or update `backend/.env`:
```env
# ── CLOUDINARY ──
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Production (Vercel)
1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add the same 3 variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

---

## 3️⃣ Install Dependencies

```bash
cd backend
npm install cloudinary multer-storage-cloudinary
```

**Updated `package.json` includes:**
- `cloudinary`: Cloud storage service
- `multer-storage-cloudinary`: Connect multer to Cloudinary

---

## 4️⃣ What's Changed

### ✅ New Files Created
- `backend/src/middleware/cloudinary-upload.js` — Cloudinary upload configuration
- `.env.example` — Template for environment variables

### ✅ Updated Routes
| Route | File | What Changed |
|-------|------|-------------|
| Book covers | `backend/src/routes/books.js` | `/uploads/file.jpg` → Cloudinary URL |
| Book chapters (PDFs) | `backend/src/routes/books.js` | PDF stored in cloud, 50MB limit |
| User avatars | `backend/src/routes/profile.js` | User profile pictures on Cloudinary |
| Writer profiles | `backend/src/routes/writers.js` | Writer avatars + background music |
| News media | `backend/src/routes/news.js` | Images/videos in news posts |

### ✅ File Deletion
When you delete a book, chapter, or user—**files are also deleted from Cloudinary** (no orphaned files)

---

## 5️⃣ How URLs Work Now

### Before (Broken on Vercel):
```
/uploads/coverImage-1234567890.jpg
```
❌ File doesn't exist after deployment because Vercel doesn't persist files

### After (Production Ready):
```
https://res.cloudinary.com/your-cloud-name/image/upload/...
```
✅ Files are permanently stored on Cloudinary CDN  
✅ Automatically optimized for web (compression, format conversion)  
✅ Works everywhere - localhost, Vercel, any server

---

## 6️⃣ Testing Locally

```bash
# Terminal 1: Start the backend
cd backend
npm install
npm run dev

# Terminal 2: Start the frontend
cd frontend
npm run dev

# Now try uploading a book cover in the admin panel
# → Should see Cloudinary URL in browser's Network tab
```

---

## 7️⃣ Uploading to Vercel

1. **Commit your code** (never commit `.env`):
   ```bash
   git add .
   git commit -m "Add Cloudinary integration for production image storage"
   git push
   ```

2. **Vercel auto-deploys** with your Cloudinary credentials from Environment Variables

3. **Test on Vercel**:
   - Upload a book cover in the admin panel on production
   - Verify the image shows up on the live site

---

## 8️⃣ Folder Structure in Cloudinary

All files are organized in Cloudinary:
```
novelDen/
  ├── images/
  │   ├── book-covers/
  │   ├── user-avatars/
  │   └── writer-profiles/
  └── pdfs/
      └── book-chapters/
```

You can view and manage these in **Cloudinary Dashboard** → **Media Library**

---

## 9️⃣ File Size Limits

| Type | Limit | Location |
|------|-------|----------|
| Images (avatars, covers) | **10 MB** | `cloudinary-upload.js` |
| PDFs (chapters) | **50 MB** | `cloudinary-upload.js` |

Change limits in `backend/src/middleware/cloudinary-upload.js` if needed.

---

## 🔟 Troubleshooting

### Images still not showing?
```bash
# 1. Check environment variables are loaded
console.log(process.env.CLOUDINARY_CLOUD_NAME) // Should print your cloud name

# 2. Verify credentials in Cloudinary Dashboard
# 3. Check browser DevTools → Network tab for Cloudinary URL
```

### Upload fails with error?
- Check file size (under limits?)
- Check file type (images/PDFs supported?)
- Verify Cloudinary credentials in `.env`

### Files orphaned in Cloudinary?
- All delete operations now clean up files
- Old files from before this update won't auto-delete
- You can manually delete them in Cloudinary Dashboard → Media Library

---

## 📚 Resources

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Multer Cloudinary**: https://www.npmjs.com/package/multer-storage-cloudinary
- **Environment Variables on Vercel**: https://vercel.com/docs/projects/environment-variables

---

## ✨ Summary

**Before**: ❌ Images stored locally → Lost on Vercel deployment  
**After**: ✅ Images on Cloudinary CDN → Always available globally + auto-optimized

🚀 **Your app is now production-ready!**
