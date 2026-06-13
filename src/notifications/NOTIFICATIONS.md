# Module Notifications

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Dépendances installées](#2-dépendances-installées)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Le Module — `notifications.module.ts`](#4-le-module--notificationsmoduletts)
5. [Les DTOs](#5-les-dtos)
   - [SendEmailDto](#sendemailDto)
   - [SendSmsDto](#sendsmsdto)
6. [Les Services de canal](#6-les-services-de-canal)
   - [EmailService](#emailservice)
   - [SmsService](#smsservice)
7. [Le Service principal — `NotificationsService`](#7-le-service-principal--notificationsservice)
8. [Le Controller — `NotificationsController`](#8-le-controller--notificationscontroller)
9. [Variables d'environnement requises](#9-variables-denvironnement-requises)
10. [Utiliser `NotificationsService` depuis un autre module](#10-utiliser-notificationsservice-depuis-un-autre-module)

---

## 1. Vue d'ensemble

Le module `Notifications` centralise tous les envois de messages sortants de l'application.
Il est conçu pour être **extensible** : chaque canal de communication (email, SMS, push…) est
isolé dans son propre service dans le dossier `channels/`, et le `NotificationsService` principal
sert de **façade unique** pour le reste de l'application.

**Canaux implémentés :**
- **Email** via SMTP (Nodemailer) — compatible Gmail, Mailgun, SendGrid, tout serveur SMTP
- **SMS** via Twilio

**Flux général :**
```
Requête HTTP  ──►  NotificationsController
                          │
                          ▼
                  NotificationsService  (façade)
                   ┌──────┴──────┐
                   ▼             ▼
             EmailService    SmsService
             (Nodemailer)    (Twilio)
                   │             │
                   ▼             ▼
              Serveur SMTP   API Twilio
```

---

## 2. Dépendances installées

| Package | Version | Rôle |
|---|---|---|
| `nodemailer` | ^8.x | Envoi d'emails via protocole SMTP. Gère l'authentification, les pièces jointes, le HTML et le texte brut |
| `@types/nodemailer` | dev | Types TypeScript pour nodemailer |
| `twilio` | ^6.x | SDK officiel Twilio pour Node.js. Permet d'envoyer des SMS, appels, WhatsApp via l'API REST Twilio |

---

## 3. Structure des fichiers

```
src/notifications/
│
├── dto/
│   ├── send-email.dto.ts       — Données attendues pour envoyer un email
│   └── send-sms.dto.ts         — Données attendues pour envoyer un SMS
│
├── channels/
│   ├── email.service.ts        — Service bas niveau : connexion SMTP + envoi email
│   └── sms.service.ts          — Service bas niveau : connexion Twilio + envoi SMS
│
├── notifications.service.ts    — Façade : point d'entrée unique pour les autres modules
├── notifications.controller.ts — Expose les routes HTTP de l'API
├── notifications.module.ts     — Déclare et assemble tous les composants
└── NOTIFICATIONS.md            — Cette documentation
```

---

## 4. Le Module — `notifications.module.ts`

```typescript
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, SmsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

**Rôle de chaque déclaration :**

- **`controllers`** — Déclare `NotificationsController` afin que NestJS enregistre ses routes HTTP
- **`providers`** — Enregistre les trois services dans le conteneur d'injection de dépendances de ce module :
  - `NotificationsService` : la façade
  - `EmailService` : le canal email
  - `SmsService` : le canal SMS
- **`exports`** — Expose uniquement `NotificationsService` vers l'extérieur. Les autres modules
  qui importent `NotificationsModule` n'ont accès qu'à la façade, pas aux services de canal internes.
  C'est un principe d'**encapsulation** : les détails d'implémentation (quel provider SMTP, quel SDK SMS)
  restent cachés.

---

## 5. Les DTOs

Les DTOs (Data Transfer Objects) définissent la forme exacte des données acceptées par l'API.
Le `ValidationPipe` global (configuré dans `main.ts`) rejette automatiquement toute requête
dont les données ne respectent pas ces contraintes.

### `SendEmailDto`

```typescript
export class SendEmailDto {
  @IsEmail()
  to: string;           // OBLIGATOIRE — adresse email du destinataire, validée en format RFC 5322

  @IsString()
  @MinLength(1)
  subject: string;      // OBLIGATOIRE — sujet de l'email, au moins 1 caractère

  @IsString()
  @IsOptional()
  html?: string;        // OPTIONNEL — corps de l'email en HTML (ex: template avec <h1>, couleurs...)

  @IsString()
  @IsOptional()
  text?: string;        // OPTIONNEL — corps en texte brut (fallback pour clients mail sans HTML)
}
```

> Au moins `html` ou `text` doit être fourni pour que l'email ait un contenu visible.
> Les deux peuvent être envoyés simultanément : le client mail choisira lequel afficher.

---

### `SendSmsDto`

```typescript
export class SendSmsDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  to: string;    // OBLIGATOIRE — numéro au format international E.164 (ex: +33612345678)

  @IsString()
  body: string;  // OBLIGATOIRE — contenu du SMS (max 160 caractères pour 1 segment)
}
```

**Format E.164 expliqué :**
- Commence toujours par `+`
- Suivi du code pays sans zéro (France = `33`, USA = `1`)
- Puis le numéro sans le `0` initial
- Exemples : `+33612345678` (France), `+12025551234` (USA)

> Twilio rejette tout numéro qui ne respecte pas ce format. La validation côté serveur
> (`@Matches(...)`) prévient l'erreur avant même d'appeler l'API Twilio.

---

## 6. Les Services de canal

### `EmailService`

**Fichier :** `channels/email.service.ts`

Ce service est responsable de toute la communication avec le serveur SMTP.
Il est instancié une seule fois (singleton NestJS) et maintient un **transporteur Nodemailer**
réutilisable pendant toute la durée de vie de l'application.

#### Initialisation (constructeur)

```typescript
constructor(private readonly configService: ConfigService) {
  this.transporter = nodemailer.createTransport({
    host: configService.getOrThrow('MAIL_HOST'),   // ex: smtp.gmail.com
    port: configService.get('MAIL_PORT', 587),      // 587 par défaut (STARTTLS)
    secure: configService.get('MAIL_SECURE') === 'true', // true = port 465 (SSL)
    auth: {
      user: configService.getOrThrow('MAIL_USER'),  // votre adresse email
      pass: configService.getOrThrow('MAIL_PASS'),  // mot de passe ou App Password
    },
  });
}
```

- `getOrThrow()` est utilisé à la place de `get()` : si une variable est absente du `.env`,
  l'application plante **au démarrage** avec un message explicite, plutôt que de découvrir
  le problème lors du premier envoi.
- Le transporteur est créé **une seule fois** et réutilisé pour tous les envois (performant).

#### Méthode `send(dto: SendEmailDto): Promise<void>`

Envoie un email via le transporteur SMTP initialisé.

```
1. Construit le champ "from" avec le nom d'affichage et l'adresse (ex: "MonApp" <app@gmail.com>)
2. Appelle transporter.sendMail() avec to, subject, html, text
3. Logue un message de confirmation avec l'adresse destinataire et le sujet
```

Si l'envoi échoue (SMTP injoignable, mauvais identifiants, etc.), Nodemailer lève une exception
qui remonte automatiquement en erreur HTTP 500 via le filtre d'exceptions global de NestJS.

#### Méthode `verifyConnection(): Promise<boolean>`

Teste la connexion SMTP sans envoyer d'email réel. Utile pour un health check au démarrage.
Retourne `true` si la connexion est établie, `false` sinon (sans lever d'exception).

---

### `SmsService`

**Fichier :** `channels/sms.service.ts`

Ce service encapsule le SDK Twilio et gère l'envoi de SMS.
Comme `EmailService`, il est un singleton qui initialise le client Twilio une seule fois.

#### Initialisation (constructeur)

```typescript
constructor(private readonly configService: ConfigService) {
  const accountSid = configService.getOrThrow('TWILIO_ACCOUNT_SID'); // ex: ACxxxxxxxx...
  const authToken  = configService.getOrThrow('TWILIO_AUTH_TOKEN');  // token secret
  this.from        = configService.getOrThrow('TWILIO_PHONE_NUMBER'); // ex: +15551234567
  this.client = twilio(accountSid, authToken);
}
```

- `TWILIO_ACCOUNT_SID` : identifiant unique de votre compte Twilio (commence par `AC`)
- `TWILIO_AUTH_TOKEN` : clé secrète — ne jamais la committer dans le code source
- `TWILIO_PHONE_NUMBER` : numéro Twilio acheté dans votre console, format E.164

#### Méthode `send(dto: SendSmsDto): Promise<void>`

Envoie un SMS via l'API REST Twilio.

```
1. Appelle client.messages.create({ from, to, body })
2. Twilio retourne un objet message avec un SID unique (identifiant de traçabilité)
3. Le SID est loggé pour permettre le suivi dans la console Twilio
```

**Pourquoi logger le SID ?**
Le SID Twilio (ex: `SM1234abcd...`) permet de retrouver le SMS dans la console Twilio,
de voir son statut de livraison (delivered, failed…), et de déboguer en cas de problème.

---

## 7. Le Service principal — `NotificationsService`

**Fichier :** `notifications.service.ts`

C'est le **point d'entrée unique** pour tout le reste de l'application qui veut envoyer
une notification. C'est une **façade** au sens du design pattern du même nom.

```typescript
@Injectable()
export class NotificationsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  sendEmail(dto: SendEmailDto): Promise<void> {
    return this.emailService.send(dto);
  }

  sendSms(dto: SendSmsDto): Promise<void> {
    return this.smsService.send(dto);
  }
}
```

**Pourquoi cette couche intermédiaire ?**

Sans façade, chaque module qui veut envoyer un email devrait importer `EmailService`
directement. Si demain on change de provider (Nodemailer → SendGrid), il faudrait modifier
tous ces modules. Avec la façade :

- Le `AuthModule` appelle `notificationsService.sendEmail(...)` sans savoir que c'est Nodemailer
- Si on change de provider, on modifie uniquement `EmailService` — aucun autre fichier ne change
- C'est également ici que l'on pourrait ajouter de la logique transverse : logs centralisés,
  gestion des erreurs unifiée, file d'attente (queue), etc.

---

## 8. Le Controller — `NotificationsController`

**Fichier :** `notifications.controller.ts`

Expose les fonctionnalités du module via des routes HTTP REST. Toutes les routes sont
**protégées par JWT** : un token valide est obligatoire dans le header `Authorization`.

```typescript
@ApiTags('Notifications')   // Groupe "Notifications" dans Swagger
@ApiBearerAuth()            // Indique dans Swagger que le Bearer Token est requis
@UseGuards(JwtAuthGuard)    // Bloque toute requête sans JWT valide — s'applique à TOUTES les routes
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  // ...
}
```

### Route `POST /api/notifications/email`

```typescript
@Post('email')
@HttpCode(HttpStatus.NO_CONTENT)   // Retourne HTTP 204 (succès sans corps de réponse)
@ApiOperation({ summary: 'Envoyer un email' })
sendEmail(@Body() dto: SendEmailDto): Promise<void>
```

| Élément | Détail |
|---|---|
| Méthode HTTP | `POST` |
| URL complète | `http://localhost:3000/api/notifications/email` |
| Auth requise | Oui — `Authorization: Bearer <token>` |
| Corps attendu | JSON avec `to`, `subject`, et `html` et/ou `text` |
| Réponse succès | `204 No Content` (pas de corps) |
| Réponse échec | `400` si validation échoue, `401` si token absent/invalide, `500` si SMTP échoue |

**Exemple de corps JSON :**
```json
{
  "to": "client@example.com",
  "subject": "Votre commande a été confirmée",
  "html": "<h1>Merci pour votre achat !</h1><p>Votre commande #1234 est en cours.</p>",
  "text": "Merci pour votre achat ! Votre commande #1234 est en cours."
}
```

---

### Route `POST /api/notifications/sms`

```typescript
@Post('sms')
@HttpCode(HttpStatus.NO_CONTENT)   // Retourne HTTP 204 (succès sans corps de réponse)
@ApiOperation({ summary: 'Envoyer un SMS via Twilio' })
sendSms(@Body() dto: SendSmsDto): Promise<void>
```

| Élément | Détail |
|---|---|
| Méthode HTTP | `POST` |
| URL complète | `http://localhost:3000/api/notifications/sms` |
| Auth requise | Oui — `Authorization: Bearer <token>` |
| Corps attendu | JSON avec `to` (format E.164) et `body` |
| Réponse succès | `204 No Content` (pas de corps) |
| Réponse échec | `400` si validation échoue, `401` si token absent/invalide, `500` si Twilio échoue |

**Exemple de corps JSON :**
```json
{
  "to": "+33612345678",
  "body": "Votre code de vérification est : 847291. Valable 10 minutes."
}
```

---

## 9. Variables d'environnement requises

À renseigner dans le fichier `.env` à la racine du projet.

### Email (SMTP)

| Variable | Obligatoire | Exemple | Description |
|---|---|---|---|
| `MAIL_HOST` | Oui | `smtp.gmail.com` | Adresse du serveur SMTP |
| `MAIL_PORT` | Non (587) | `587` | Port SMTP — 587 pour STARTTLS, 465 pour SSL |
| `MAIL_SECURE` | Non (false) | `false` | `true` uniquement si port 465 |
| `MAIL_USER` | Oui | `app@gmail.com` | Identifiant de connexion SMTP |
| `MAIL_PASS` | Oui | `xxxx xxxx xxxx` | Mot de passe ou App Password Gmail |
| `MAIL_FROM_NAME` | Non (App) | `MonApp` | Nom d'affichage de l'expéditeur |

> **Gmail** : il faut activer la validation en 2 étapes puis générer un
> [App Password](https://myaccount.google.com/apppasswords) dédié. Ne pas utiliser
> le mot de passe principal du compte.

### SMS (Twilio)

| Variable | Obligatoire | Exemple | Description |
|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | Oui | `ACxxxxxxxxxxxxxxxx` | SID de compte — dans la console Twilio |
| `TWILIO_AUTH_TOKEN` | Oui | `xxxxxxxxxxxxxxxx` | Token secret — dans la console Twilio |
| `TWILIO_PHONE_NUMBER` | Oui | `+15551234567` | Numéro Twilio acheté, format E.164 |

---

## 10. Utiliser `NotificationsService` depuis un autre module

Pour envoyer des notifications depuis un autre module (ex: `AuthModule`, `OrdersModule`),
il suffit de deux étapes.

### Étape 1 — Importer `NotificationsModule`

```typescript
// orders.module.ts
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],   // ← rend NotificationsService injectable ici
  providers: [OrdersService],
})
export class OrdersModule {}
```

### Étape 2 — Injecter et utiliser `NotificationsService`

```typescript
// orders.service.ts
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrder(order: Order) {
    // ... logique de création de commande ...

    // Envoyer un email de confirmation
    await this.notificationsService.sendEmail({
      to: order.customerEmail,
      subject: `Commande #${order.id} confirmée`,
      html: `<h1>Merci !</h1><p>Votre commande est confirmée.</p>`,
    });

    // Envoyer un SMS de confirmation
    await this.notificationsService.sendSms({
      to: order.customerPhone,
      body: `Commande #${order.id} confirmée. Livraison prévue sous 48h.`,
    });
  }
}
```
