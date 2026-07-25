# Lembrar.me

Voice-first task lists from an Android/WearOS watch, synced through Firebase Firestore to a web Kanban dashboard.

## Apps

| Folder | Description |
| --- | --- |
| `VoiceNoteWatch` | Kotlin Android/WearOS app (voice capture, list, reminders) |
| `VoiceNoteWeb` | React + Vite dashboard (Kanban + analytics), hosted on Firebase Hosting |

## Web — local development

```bash
cd VoiceNoteWeb
npm install
npm run dev
```

## Web — production build

```bash
cd VoiceNoteWeb
npm install
npm run build
```

Output goes to `VoiceNoteWeb/dist/`. Deploy is automated via GitHub Actions on pushes to `main` that touch `VoiceNoteWeb/`.

## Watch — build

Requires JDK 17, Android SDK, and `VoiceNoteWatch/app/google-services.json` (not committed).

```bash
cd VoiceNoteWatch
.\gradlew.bat clean assembleDebug
```

## Continuous deployment

Pushing changes under `VoiceNoteWeb/` to `main` builds the site and deploys it to Firebase Hosting project `voice-notes-54e1a`.

Required GitHub Actions secret:

- `FIREBASE_SERVICE_ACCOUNT_VOICE_NOTES_54E1A` — JSON key of a Firebase/Google service account with Hosting Admin access
