# 🔐 CHECKLIST SÉCURITÉ - ACTIONS URGENTES

**Date: 2026-09-03**  
**Last Updated: 2026-09-03 (Rate-limiting Upstash + Sentry added)**  
**Status: ⚠️ À compléter AVANT déploiement en production**

---

## 🔴 ACTIONS URGENTES (< 24h)

### 1. Rotationner TOUS les secrets
Les secrets suivants DOIVENT être régénérés dans leurs services respectifs:

#### Supabase
- [ ] Aller sur: https://supabase.com/dashboard
- [ ] Regénérer `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Mettre à jour dans `.env` local
- [ ] Deployer en production après test

#### Resend
- [ ] Aller sur: https://dashboard.resend.com
- [ ] Regénérer `RESEND_API_KEY`
- [ ] Regénérer `RESEND_WEBHOOK_SECRET` (dans Webhooks)
- [ ] Mettre à jour dans `.env`

#### NextAuth
- [ ] Générer un nouveau `NEXTAUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Mettre à jour dans `.env`

#### Cron Jobs
- [ ] Générer un nouveau `CRON_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Mettre à jour dans `.env`

### 2. Vérifier .env configuration PRODUCTION

```bash
# Dans .env.production (NE PAS commiter ce fichier!)
NEXTAUTH_URL=https://yourdomain.com  # Pas localhost!
DATABASE_URL=postgresql://prod-user:prod-password@prod-host...
```

#### À faire:
- [ ] Copier `.env.example` → `.env.local` (dev)
- [ ] Créer `.env.production.local` (prod) avec les vraies URLs/secrets
- [ ] Vérifier que `.env*` est dans `.gitignore`

### 3. Test des nouveaux secrets
```bash
# Tester que les secrets sont bien configurés
npm run dev

# Vérifier les logs:
# ✅ L'authentification fonctionne
# ✅ Les emails s'envoient
# ✅ Les webhooks sont reçus
```

---

## 🟠 À FAIRE CETTE SEMAINE

### 4. Rate-limiting distribué avec Upstash ✅ IMPLÉMENTÉ

Migration de in-memory vers Upstash Redis:

```bash
# 1. Créer un compte Upstash: https://upstash.com/
# 2. Créer une base de données Redis
# 3. Copier UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN
# 4. Ajouter à .env:
```

```env
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io/
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Status:** ✅ Code implémenté dans `src/lib/rate-limit.ts`
- Utilise Upstash en production
- Fallback en-memory en développement
- 6 endpoints protégés: register, contact, jobs apply, messages, job-applications, forgot-password

### 5. Monitoring avec Sentry ✅ IMPLÉMENTÉ

Setup d'error tracking et monitoring:

```bash
# 1. Créer un compte Sentry: https://sentry.io/
# 2. Créer un projet Next.js
# 3. Copier le SENTRY_DSN
# 4. Ajouter à .env:
```

```env
SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

**Status:** ✅ Configuration basique implémentée
- `sentry.config.ts` pour l'initialisation
- Captures les erreurs server et client
- Disable automatiquement si SENTRY_DSN absent

### 5. Configurer RESEND_WEBHOOK_SECRET
- [ ] Vérifier que `.env` a `RESEND_WEBHOOK_SECRET`
- [ ] Si manquant, aller dans Resend Dashboard → Webhooks → copier le secret
- [ ] Redémarrer le serveur après changement

### 6. Auditer les logs en production
- [ ] Vérifier que les logs n'affichent pas les credentials
- [ ] Utilisez des logs structure (structlog ou json) en prod
- [ ] Configurer les niveaux de log (ERROR/WARN seulement en prod)

---

## ✅ DÉJÀ FIXÉ DANS CE COMMIT

- ✅ Extension validation `/api/jobs/apply/upload` → Maintenant type-safe
- ✅ Webhook Resend signature verification → Utilise Svix
- ✅ Logs sensibles supprimés de `auth.ts` → Aucun email/password en logs
- ✅ CSP unsafe-eval retiré → Plus de XSS possible via eval()
- ✅ Validation zod sur addons → Input validation stricte
- ✅ Packages inutilisés supprimés → nodemailer/types

---

## 📋 AVANT PRODUCTION

### Sécurité
- [ ] Tous les secrets sont rotationés et uniques par environment
- [ ] `.env.production.local` configuré et NON commité
- [ ] NEXTAUTH_URL correct (pas localhost)
- [ ] CORS whitelist configurée si API publique
- [ ] Rate limiting distribué en place

### Testing
- [ ] Tester email delivery en production
- [ ] Tester webhooks Resend
- [ ] Tester authentication flow complet
- [ ] Tester file upload avec les nouvelles validations

### Monitoring
- [ ] Sentry configuré (optionnel mais recommandé)
- [ ] Logs centralisés (CloudWatch, Datadog, etc.)
- [ ] Database backups configurés
- [ ] Alert configurées pour les erreurs critiques

### Documentation
- [ ] `.env.example` à jour ✅ (déjà fait)
- [ ] README avec instructions de setup
- [ ] Runbook pour rotation des secrets

---

## 🚀 DEPLOYMENT CHECKLIST

```bash
# 1. Vérifier tout est en place
[ ] git status (aucun .env commité)
[ ] npm audit (aucune vulnérabilité critique)
[ ] npm test (si tests existent)

# 2. Build en production
npm run build

# 3. Déployer
# Selon votre plateforme (Vercel, Railway, Render, etc.)

# 4. Vérifier après déploiement
[ ] Page d'accueil charge
[ ] Authentification fonctionne
[ ] Email de test reçu
[ ] Webhooks actifs (vérifier les logs)
```

---

## 🆘 EN CAS DE PROBLÈME

### Emails ne s'envoient pas
1. Vérifier `RESEND_API_KEY` en production
2. Vérifier domaine vérifié dans Resend Dashboard
3. Vérifier DNS records (SPF, DKIM, CNAME)

### Webhooks non reçus
1. Vérifier `RESEND_WEBHOOK_SECRET` correct
2. Vérifier que l'endpoint `/api/webhooks/resend` est accessible
3. Check les logs pour `Webhook verification failed`

### Authentification cassée après secrets rotation
1. Tous les users connectés seront déconnectés (session JWT invalides)
2. Ils doivent se reconnecter
3. Normal après rotation de `NEXTAUTH_SECRET`

---

**Dernière mise à jour:** 2026-09-03  
**Reviewed by:** Claude Code Security Audit
