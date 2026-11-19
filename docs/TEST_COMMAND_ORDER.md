# SNCBT Library Management System — Test Command Order

Use one frontend test command at a time. Keep Strapi running on its configured backend port. Do not run Nuxt development mode while Phase 35/36 production-preview commands are running.

## 1. Frontend source gates

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_frontend
npm run test
npm run typecheck
npm run verify:compatibility:contract
```

Stop if any command fails.

## 2. Optional local write acceptance

Run this only when the dedicated transactional fixtures are clean and the configured write confirmation is present.

```cmd
npm run test:acceptance:local:write
```

This command is localhost-only. Do not enable acceptance writes against staging or production data.

## 3. Prepare the production preview

Stop every Nuxt development/test process using port 3000. Keep Strapi running.

```cmd
netstat -ano | findstr :3000
npm run phase35:preview:prepare
```

If `netstat` reports a frontend listener, identify and stop that frontend process before preparation. Do not stop Strapi on port 1337.

## 4. Phase 35 browser acceptance

Run each browser only after the previous command has returned to the command prompt and the production-preview runner reports that port 3000 was released.

```cmd
npm run phase35:chromium
npm run phase35:firefox
```

WebKit and Docker are intentionally outside the current validation round. They can be run later when explicitly required.

## 5. Phase 36 local frontend gate

```cmd
npm run phase36:local
```

## 6. Backend gates

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_backend
npm test
npm run typecheck
npm run build
npm run verify:cors
npm run phase36:local
```

Do not declare production readiness until all required frontend and backend gates for the release are green.
