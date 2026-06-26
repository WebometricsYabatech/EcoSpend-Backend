# TODO - Remote API accessibility fixes

## Step 1: Baseline audit
- [x] Inspect entry points (`src/server.js`, `src/app.js`) and route/middleware wiring
- [x] Inspect auth, upload, and controller implementations

## Step 2: Implement remote-access fixes
- [x] Update `src/app.js`
  - [x] Fix CORS to allow remote clients via `CORS_ORIGIN` / `*`
  - [x] Serve uploads from the same absolute directory multer writes to
  - [x] Add centralized error handler (JWT/multer/misc)
  - [x] Add 404 handler
- [x] Update `src/middleware/upload.js`
  - [x] Align `UPLOADS_DIR` and stored paths with `src/app.js`
  - [x] Improve multer error messages (file type / size)
- [x] Update `src/server.js`
  - [x] Bind to `0.0.0.0` by default for remote access
- [x] Update Prisma usage for reliability
  - [x] Reuse `src/lib/prisma.js` in controllers (avoid per-request PrismaClient)
- [x] Update `src/middleware/auth.js`
  - [x] Handle missing/invalid `JWT_SECRET` safely
  - [x] Standardize error responses


## Step 3: Verification
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Validate via Postman:
  - [ ] `/api/auth/register`
  - [ ] `/api/auth/login`
  - [ ] `/api/expenses` CRUD with Authorization header
  - [ ] `/api/ai/scan-receipt` image upload and confirm returned URL is accessible

