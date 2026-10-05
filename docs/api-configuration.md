# Translation API configuration

LinguaFlow uses a local translation stack:

- **Argos Translate** is the primary offline provider. The Next.js route starts the configured Python helper and calls the installed language models directly.
- **LibreTranslate** is the optional local HTTP provider for setups that run the pair services. It is configured with `LIBRETRANSLATE_URL` and never requires a paid cloud key in this project.
- No Google Cloud Translation API, OpenAI API, or other paid remote provider is used.

Copy `.env.example` to `.env.local`, install the local runtime described in `README.md`, and restart the website after changing environment values. The route validates supported languages, rejects oversized input, preserves critical URLs, numbers, email addresses, and placeholders, and caches successful translations briefly to make repeated requests faster.
