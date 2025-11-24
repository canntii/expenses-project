# Configuración de Seguridad - Firebase App Check

## 1. Instalar Firebase App Check

```bash
npm install firebase/app-check
```

## 2. Configurar reCAPTCHA v3

1. Ve a https://www.google.com/recaptcha/admin/create
2. Selecciona reCAPTCHA v3
3. Agrega tus dominios:
   - `localhost` (para desarrollo)
   - Tu dominio de producción
4. Copia la Site Key

## 3. Actualizar .env.local

Agrega esta variable:
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu-site-key-aqui
```

## 4. Actualizar src/lib/firebase/client.ts

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Inicializar App Check (solo en el navegador)
if (typeof window !== 'undefined') {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
```

## 5. Activar App Check en Firebase Console

1. Ve a Firebase Console → App Check
2. Haz clic en "Get Started"
3. Registra tu app web
4. Selecciona reCAPTCHA v3
5. Pega tu Site Key
6. Haz clic en "Save"

## 6. Aplicar App Check a Firestore

En Firebase Console → App Check → Apps:
1. Encuentra Cloud Firestore
2. Haz clic en "Enforce"
3. Esto bloqueará todas las requests que no tengan un token de App Check válido

## Beneficios

✅ Protege contra uso no autorizado incluso si las API keys se filtran
✅ Previene ataques de bots y scrapers
✅ Reduce costos bloqueando tráfico malicioso
✅ No requiere cambios en el código de la aplicación (transparente)
