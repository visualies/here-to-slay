# AGENTS.md

Rules for each session: 

For each change implemented, you MUST run the API tests afterwards with `npm run test:api`.

You can run npm run dev to restart the dev server, this automatically kills all previous dev servers.

If implementing tests, the existing TESTING.md file must be read to understand the testing patterns and conventions.

Do not run  build to verify a working state but use tsc instead and use it after each task completion.

If you are working on ui bugs or implementations always verify they are truly solved by using playwrite.

When using playwrite you can use the PLAYWRIGHT_UI_NOTES.md to take notes on which elements do what to easier find your way through the app.