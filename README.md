# Attendance App

This is a NextJS Attendance management system with AI-powered intrusion detection and location tracking.

## How to find your App URL?

### 1. Local URL (Development)
When you run the app locally using `npm run dev`, it will be available at:
**[http://localhost:9002](http://localhost:9002)**

### 2. Live URL (Deployment)
Once you deploy your code (e.g., using Firebase App Hosting), the platform will provide a public URL. 
- If using **Firebase**, look for the Hosting URL in your Firebase Console under the "App Hosting" or "Hosting" tab.
- It usually looks like: `https://your-project-id.web.app` or `https://your-project-id.firebaseapp.com`

---

## Git ఇన్‌స్టాలేషన్ (Git Installation - "command not found" వస్తే)

మీరు `git init` టైప్ చేసినప్పుడు "command not found" అని వస్తే, మీ కంప్యూటర్‌లో Git సాఫ్ట్‌వేర్ లేదని అర్థం. దీన్ని ఇలా ఇన్‌స్టాల్ చేయండి:

1. **డౌన్‌లోడ్ చేయండి:** [https://git-scm.com/downloads](https://git-scm.com/downloads) కు వెళ్లి మీ కంప్యూటర్ (Windows/Mac) కి తగ్గట్టుగా డౌన్‌లోడ్ చేయండి.
2. **ఇన్‌స్టాల్ చేయండి:** డౌన్‌లోడ్ అయిన ఫైల్‌ను ఓపెన్ చేసి, అన్నింటికీ 'Next' నొక్కుతూ ఇన్‌స్టాల్ పూర్తి చేయండి.
3. **టెర్మినల్ రీస్టార్ట్ చేయండి:** ఇన్‌స్టాలేషన్ అయ్యాక, ఇప్పుడు వాడుతున్న టెర్మినల్ లేదా VS Code ని క్లోజ్ చేసి మళ్లీ ఓపెన్ చేయండి.
4. **చెక్ చేయండి:** ఇప్పుడు టెర్మినల్‌లో `git --version` అని టైప్ చేయండి. వెర్షన్ నంబర్ కనిపిస్తే Git సిద్ధంగా ఉన్నట్లు.

---

## GitHub కి అప్‌లోడ్ చేసే విధానం (How to push to GitHub)

Git ఇన్‌స్టాల్ అయిన తర్వాత, మీ కోడ్‌ను GitHub లోకి పంపడానికి ఈ క్రింది కమాండ్లను వరుసగా టైప్ చేయండి:

1. **Git ప్రారంభించండి:**
   ```bash
   git init
   ```

2. **ఫైళ్లను జోడించండి:**
   ```bash
   git add .
   ```

3. **మార్పులను సేవ్ చేయండి (Commit):**
   ```bash
   git commit -m "Initial commit of Attendance App"
   ```

4. **GitHub రిపోజిటరీని కనెక్ట్ చేయండి:**
   (గమనిక: క్రింద ఉన్న లింక్ ప్లేస్‌లో మీ GitHub రిపోజిటరీ లింక్ ఇవ్వండి)
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

5. **కోడ్‌ను పంపండి (Push):**
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Mobile App Installation
దీన్ని మీ మొబైల్‌లో యాప్‌లాగా ఉపయోగించడానికి:
1. మీ మొబైల్ బ్రౌజర్ (Chrome/Safari) లో మీ సైట్ లింక్ ఓపెన్ చేయండి.
2. బ్రౌజర్ మెనూలో **"Add to Home Screen"** ఆప్షన్‌ను ఎంచుకోండి.

## Local Development
Run the following commands to start the app locally:
```bash
npm install
npm run dev
```

Remember to set your `GEMINI_API_KEY` in the `.env` file for AI features to work.
