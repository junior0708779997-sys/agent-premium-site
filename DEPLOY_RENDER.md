# Deploiement Render (site + API Wave)

## 1. Creer les 2 services
- Service 1 (site): `agent-premium`, type `Static Site`
- Service 2 (API): `agent-premium-api`, type `Web Service (Node)`

## 2. Valeurs exactes a mettre (service API `agent-premium-api`)
- `Build Command`: `npm install`
- `Start Command`: `npm start`
- `Auto-Deploy`: `Yes`
- `Root Directory`: vide

## 3. Variables exactes (service API)
- `WAVE_API_KEY` = ta cle Wave Business (obligatoire)
- `WAVE_WEBHOOK_SECRET` = secret webhook Wave (obligatoire pour verifier signature)
- `WAVE_BASE_URL` = `https://api.wave.com`
- `RESEND_API_KEY` = cle API Resend (pour reset mot de passe par email)
- `RESET_FROM_EMAIL` = expediteur verifie (ex: `no-reply@tondomaine.com`)
- `FRONTEND_BASE_URL` = URL publique du site (ex: `https://agent-premium.onrender.com`)
- `PORT` = laisser vide (Render le gere)

## 4. URL a copier dans le front
Apres deploy de `agent-premium-api`, recupere son URL publique:
- exemple: `https://agent-premium-api.onrender.com`

Puis dans `backend-config.js` mets:
- `apiBaseUrl: "https://agent-premium-api.onrender.com"`

## 5. URL webhook a mettre chez Wave
- `https://agent-premium-api.onrender.com/api/wave/webhook`

## 6. Verification rapide
- Ouvre `https://agent-premium-api.onrender.com/health`
- Attendu: `{"ok":true,"service":"agent-premium-payments"}`

## 7. Si le paiement direct ne passe pas
- Le site utilisera automatiquement le fallback `paymentLinks.wave|orange|mtn` de `backend-config.js`.

## 8. Sauvegarde cloud
- Endpoint sauvegarde: `POST /api/backup`
- Endpoint lecture: `GET /api/backup/latest`

## 9. Reset mot de passe par email
- Demande lien: `POST /api/auth/request-reset`
- Verifier token: `POST /api/auth/verify-reset-token`
- Consommer token: `POST /api/auth/consume-reset-token`
