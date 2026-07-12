# GauSeva Connect - Complete Development Documentation

**Date:** July 1, 2026
**Project:** GauSeva Connect (gauseva-connect.pages.dev)
**Developer:** MiMo Code Agent

---

## 1. Authentication System

### Migration from Clerk to Firebase Auth
- Removed Clerk authentication completely
- Implemented Firebase Auth with email/password
- Email verification required during sign-up
- Password reset via "Forgot Password" link on sign-in page
- Sign-in goes directly to home page
- Sign-up flow: Email/Password → Email Verification → Onboarding

### Files Modified
- `src/main.tsx` - Removed ClerkProvider, added lazy-loaded routes
- `src/lib/firebase.ts` - Firebase Auth initialization
- `src/hooks/useAuth.ts` - Firebase onAuthStateChanged hook
- `src/components/SignInPage.tsx` - Custom sign-in form with forgot password
- `src/components/SignUpPage.tsx` - Custom sign-up with email verification
- `src/components/AuthModal.tsx` - Modal version of auth forms

---

## 2. Onboarding System

### Features
- Full Name field
- Mobile Number with +91 prefix (not deletable, only 10 digits)
- Full Address textarea
- Pincode (6 digits)
- State/UT dropdown (all 36 states and union territories)
- City dropdown (populated based on selected state)
- All fields are compulsory
- Data saved to D1 database via `/api/users` endpoint

### Bug Fixes
- Fixed city being wiped when modal opens (useEffect race condition)
- Fixed onboarding redirect loop (added `isInitialLoad` ref guard)
- Fixed `onboarded` flag check in App.tsx

### Files Modified
- `src/components/OnboardingPage.tsx` - Complete rewrite
- `src/data/indianLocations.ts` - All states and cities data
- `src/App.tsx` - Onboarding redirect check

---

## 3. Profile Settings

### Features
- Edit display name
- Edit mobile number (+91 prefix)
- Edit full address, pincode, state, city
- Upload profile photo to R2 storage
- Email field (read-only)
- All changes save to Firebase Auth (name/photo) and D1 database

### Bug Fixes
- Fixed save button not working (changed from form submit to onClick)
- Added proper error handling for API calls
- Fixed city/state loading bug

### Files Modified
- `src/components/ProfileModal.tsx` - Complete settings tab rewrite

---

## 4. Support Tickets System

### Features
- Create tickets with category, subject, description
- Optional file attachment (max 500KB, stored in R2)
- View all tickets with status badges
- Add one comment per ticket
- Delete tickets
- Admin can view all tickets, change status, reply, delete

### Backend Endpoints
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:userId` - Get user's tickets
- `PUT /api/tickets/:id` - Update ticket (status, admin reply)
- `DELETE /api/tickets/:id` - Delete ticket

### Database
- Table: `tickets` (id, userId, data)

---

## 5. Verification System

### Features
- Custom verification form (replaced Google Form)
- Upload ID proof (Aadhaar/PAN/Voter ID/Driving License/Passport)
- Upload selfie with ID
- Files stored in R2 storage (max 500KB each)
- Admin can approve/reject verification requests
- Verified users get green shield badge

### Files Modified
- `src/components/ProfileModal.tsx` - VerificationForm component

---

## 6. Gaumata Listing System

### Features
- Simplified single-column form
- All fields compulsory: Name, Breed, Age, Status, Milk Yield, State, City, Photo, Description
- Image compression to 500KB max
- Images stored in R2 (not in database)
- 30+ indigenous cattle breeds listed
- Category: Adoption or Sale
- Price field for sale listings

### Bug Fixes
- Fixed image upload (created missing `/api/upload` Pages Function)
- Changed from presigned URL to direct R2 upload
- Made all fields compulsory with validation

### Files Modified
- `src/components/CreateListingModal.tsx` - Complete rewrite
- `functions/api/upload.ts` - Direct R2 upload endpoint

---

## 7. Listing Detail Page

### Features
- Individual URL for each listing (`/listing/:id`)
- Full page view with image, details, description
- Call Now and WhatsApp buttons
- Share button (native share or copy link)
- Favorite/Watchlist button
- Star rating system (1-5)
- Comments section
- Report listing feature
- SEO meta tags (og:title, og:description, og:image)

### Files Modified
- `src/components/ListingPage.tsx` - Complete rewrite

---

## 8. Listing Card Design

### Features
- Clean modern card with rounded corners
- Status badge with icon and milk yield
- Price badge for sale listings
- Urgent Adoption badge
- Featured badge (admin-set)
- Quick info chips: Breed, Age, Milk Yield
- Location with icon
- "Today", "Yesterday", "X days ago" date format
- Call button (direct phone call)
- Share button
- View detail arrow button
- User avatar with verified badge

### Files Modified
- `src/components/ListingCard.tsx` - Complete rewrite

---

## 9. Filter System

### Features
- Server-side pagination (20 listings per page)
- Server-side filtering via SQL queries
- Debounced search (400ms delay)
- Category pills: All, Adoption, For Sale, Watchlist
- Status dropdown: All, Milking, Dry, Pregnant, Heifer, Retired, Calf
- Sort dropdown: Newest, Price Low→High, Price High→Low, Age Youngest
- Budget slider (₹1,000 to ₹1,50,000)
- Clear All button
- Load More button with count display
- Database indexes on type, status, price, postedAt

### Backend Endpoint
- `GET /api/listings` - Paginated listings with filtering

### Files Modified
- `src/App.tsx` - Server-side filtering, debounced search
- `src/hooks/useFirebaseData.ts` - fetchListings function
- `functions/api/listings.ts` - Paginated endpoint
- `migrations/0004_add_indexes.sql` - Database indexes

---

## 10. Admin Panel

### Login
- Single-session login (only one browser at a time)
- Session token stored in D1 database
- Periodic session validation (every 30 seconds)
- Auto-logout if another browser logs in
- Credentials: shivamthedon / shivamthedon

### Dashboard
- Total Users, Listings, Tickets, Verifications, Reports, Alerts, Verified Users, Sponsorships
- Recent listings preview

### Listings Management
- Search by name/location
- Edit any listing (title, breed, age, price, location, description)
- Feature/Unfeature listings
- Bulk select + bulk delete
- View listing page directly
- Delete listings

### Users Management
- Verify/Revoke user verification
- Ban/Unban users
- Delete user + all their data
- Shows banned status with red highlight

### Support Tickets
- View all tickets with status badges
- Update status (Open/In Progress/Resolved/Closed)
- Reply to tickets
- Delete tickets
- View user comments and attachments (images displayed inline)

### Verification Requests
- Approve/Reject with one click
- View ID proof and selfie documents

### Reports
- View user-submitted reports
- Resolve reports

### Contacts
- View contact form submissions
- Mark as read

### Reviews
- View all reviews with ratings
- Delete reviews

### Analytics
- Listings by type (adoption vs sale)
- Top locations by listing count
- Listings by milking status
- User stats

### Settings
- Site banner (message + toggle on/off)
- Maintenance mode toggle
- Audit log (last 50 actions)
- Export all data (JSON) or listings (CSV)

### Backend Endpoints
- `POST /api/admin-session` - Login
- `GET /api/admin-session?token=` - Validate session
- `DELETE /api/admin-session?token=` - Logout
- `GET /api/settings` - Get site settings
- `PUT /api/settings` - Update settings
- `GET /api/audit-log` - Get audit log
- `POST /api/audit-log` - Create audit entry
- `GET /api/reports` - Get reports
- `POST /api/reports` - Create report
- `GET /api/contacts` - Get contacts
- `POST /api/contacts` - Create contact
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review
- `GET /api/comments` - Get comments
- `POST /api/comments` - Create comment

### Database Tables
- `site_settings` (key, value)
- `audit_log` (id, data)
- `reports` (id, data)
- `contacts` (id, data)
- `reviews` (id, listingId, userId, data)
- `comments` (id, listingId, userId, data)
- `tickets` (id, userId, data)

---

## 11. Website Integration Features

### Site Banner
- Shows at top of homepage when activated by admin
- Controlled from admin Settings

### Maintenance Mode
- When enabled, all users see maintenance page
- Admins can still access the site
- Controlled from admin Settings

### Banned Users
- Banned users see "Account Suspended" screen
- Can't access any part of the site
- Controlled from admin Users tab

### Featured Listings
- Admin can feature/unfeature listings
- Featured listings show "Featured" badge
- Featured listings appear at top of grid

### Report System
- Flag button on every listing detail page
- Users can report: Fake, Scam, Abuse, Duplicate, Wrong Info
- Reports stored in database
- Admin can view/resolve reports

### Contact Form
- `/contact` page with name, email, subject, message
- Messages stored in database
- Admin can view in Contacts tab

---

## 12. Performance Optimizations

### Code Splitting
- Routes lazy-loaded with React.lazy()
- Each route is a separate chunk
- Main bundle: 670KB → 185KB gzipped

### Image Optimization
- Lazy loading on all listing images
- Image compression to 500KB before upload
- Async decoding

### Search Optimization
- Debounced search (400ms delay)
- Server-side filtering via SQL
- Database indexes on frequently queried columns

### Preconnect Hints
- Firebase, R2, font servers pre-connected
- Font preloading

---

## 13. Security Features

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- Strict-Transport-Security (HSTS)

### Admin Security
- Single-session login
- Session token validation
- Audit logging for all admin actions

---

## 14. Database Schema (D1)

### Tables
1. `listings` (id, data)
2. `gaushalas` (id, data)
3. `alerts` (id, data)
4. `transports` (id, data)
5. `vets` (id, data)
6. `sponsorships` (id, data)
7. `verificationRequests` (id, data)
8. `users` (id, data)
9. `tickets` (id, userId, data)
10. `site_settings` (key, value)
11. `reports` (id, data)
12. `audit_log` (id, data)
13. `contacts` (id, data)
14. `reviews` (id, listingId, userId, data)
15. `comments` (id, listingId, userId, data)

### Indexes
- idx_listings_type
- idx_listings_status
- idx_listings_price
- idx_listings_posted

---

## 15. Cloudflare Pages Functions

### API Endpoints
- `/api/data` - GET all data from all tables
- `/api/data/[collection]` - POST new item
- `/api/data/[collection]/[id]` - PUT update, DELETE item
- `/api/users` - POST create/update user, DELETE user
- `/api/users/[id]` - GET user by ID
- `/api/listings` - GET paginated listings with filters
- `/api/upload` - POST direct R2 upload
- `/api/upload-url` - POST presigned R2 URL
- `/api/tickets` - POST create ticket
- `/api/tickets/[id]` - PUT update, DELETE ticket
- `/api/settings` - GET/PUT site settings
- `/api/admin-session` - POST login, GET validate, DELETE logout
- `/api/audit-log` - GET/POST audit entries
- `/api/reports` - GET/POST reports
- `/api/contacts` - GET/POST contacts
- `/api/reviews` - GET/POST reviews
- `/api/comments` - GET/POST comments

---

## 16. Environment Variables

### Frontend (VITE_ prefixed)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_BACKEND_URL (empty for same domain)

### Backend (Secrets)
- ADMIN_USER
- ADMIN_PASS
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY

### Backend (Vars in wrangler.jsonc)
- R2_PUBLIC_URL_PREFIX
- R2_ENDPOINT
- R2_BUCKET_NAME

---

## 17. Deployment

### Platform
- Cloudflare Pages
- Project name: gauseva-connect
- Domain: gauseva-connect.pages.dev

### Build Command
```
npx vite build
```

### Deploy Command
```
npx wrangler pages deploy ./dist --project-name=gauseva-connect
```

### Wrangler Version
- 4.106.0

---

## 18. Known Issues / Future Improvements

### Current Issues
- Ticket attachments may not display correctly (presigned URL vs direct upload)
- Some admin panel actions may be slow due to D1 cold starts
- Onboarding redirect can be aggressive in some edge cases

### Future Improvements
- Rich text editor for listing descriptions
- Draft/Publish workflow for listings
- Categories and tags system
- Email newsletter system
- User roles (admin, moderator, user)
- Rating/review system on listings
- Multi-language support (Hindi/English)
- Google Analytics integration
- Sitemap.xml generation

---

*This document was auto-generated by MiMo Code Agent on July 1, 2026.*
