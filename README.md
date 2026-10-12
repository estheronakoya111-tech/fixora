# Fixora

Fixora is a proof of concept that helps people make sense of billing or payment problems, build a clear case, and decide what to do next.

## Run locally

1. Install dependencies with `npm install`.
2. Create a local `.env.local` file and add your Groq API key as `GROQ_API_KEY` (optionally `GROQ_MODEL`). This file is ignored by git.
3. Start the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The conversation and complaint drafting use the Groq API. Fixora reflects what it heard, responds to answers or corrections, and asks one follow-up at a time. The API key stays in the local server environment; do not add a `NEXT_PUBLIC_` prefix. Restart the dev server after changing `.env.local`.

## Demo boundaries

- Email/password registration is a local demo flow. Passwords are not stored or verified.
- Profiles and cases are saved in this browser's `localStorage`; they do not sync between devices.
- Evidence selection saves the filename and basic metadata only. File contents are not uploaded, stored, or analyzed.
- Company names are recognized from story text for conversational clarification only; the POC does not search for or verify companies online.
- The company reply is a fictional demo message. Groq explains the reply; Fixora does not monitor real inboxes or send complaints.

Use fictional billing details when trying or recording the proof of concept.
