# NestJS Backend Starter

Un projet starter NestJS préconfiguré avec l'authentification JWT, TypeORM, Swagger et les outils de sécurité essentiels. Clone ce repo pour démarrer un nouveau projet backend sans perdre de temps à configurer les bases.

---

## Table des matières

1. [Démarrage rapide](#1-démarrage-rapide)
2. [Dépendances installées](#2-dépendances-installées)
3. [Architecture du projet](#3-architecture-du-projet)
4. [Guide : créer une nouvelle ressource API](#4-guide--créer-une-nouvelle-ressource-api)
   - [Étape 1 — Créer l'entité](#étape-1--créer-lentité)
   - [Étape 2 — Créer les DTOs](#étape-2--créer-les-dtos)
   - [Étape 3 — Créer le Service](#étape-3--créer-le-service)
   - [Étape 4 — Créer le Controller](#étape-4--créer-le-controller)
   - [Étape 5 — Créer le Module](#étape-5--créer-le-module)
   - [Étape 6 — Enregistrer dans AppModule](#étape-6--enregistrer-dans-appmodule)
5. [Authentification](#5-authentification)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Commandes utiles](#7-commandes-utiles)

---

## 1. Démarrage rapide

```bash
# 1. Cloner le projet
git clone <url-du-repo> mon-projet
cd mon-projet

# 2. Installer les dépendances
pnpm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Editer .env avec tes valeurs (DB, JWT_SECRET, etc.)

# 4. Lancer en mode développement
pnpm start:dev
```

L'API est disponible sur `http://localhost:3000/api`  
La documentation Swagger est disponible sur `http://localhost:3000/docs`

---

## 2. Dépendances installées

### Documentation

| Package | Rôle |
|---|---|
| `@nestjs/swagger` | Génère automatiquement la documentation OpenAPI/Swagger à partir des décorateurs TypeScript sur les DTOs et controllers |
| `swagger-ui-express` | Sert l'interface web Swagger UI permettant de visualiser et tester les endpoints directement depuis le navigateur |

### Authentification

| Package | Rôle |
|---|---|
| `@nestjs/passport` | Intégration de Passport.js dans NestJS. Fournit le décorateur `PassportStrategy` et le mixin `AuthGuard` |
| `passport` | Middleware d'authentification Node.js. Gère le concept de "stratégies" (local, jwt, google, etc.) |
| `passport-local` | Stratégie Passport pour l'authentification par email/mot de passe. Utilisée sur la route `/auth/login` |
| `passport-jwt` | Stratégie Passport pour valider les tokens JWT envoyés dans le header `Authorization: Bearer <token>` |
| `@nestjs/jwt` | Module NestJS pour signer et vérifier les tokens JWT (`JwtService.sign()`, `JwtService.verify()`) |
| `bcrypt` | Hashage sécurisé des mots de passe avec salt automatique. Ne jamais stocker un mot de passe en clair |
| `@types/passport-local` | Types TypeScript pour passport-local |
| `@types/passport-jwt` | Types TypeScript pour passport-jwt |
| `@types/bcrypt` | Types TypeScript pour bcrypt |

### Base de données

| Package | Rôle |
|---|---|
| `@nestjs/typeorm` | Intégration de TypeORM dans NestJS. Fournit `TypeOrmModule`, le décorateur `@InjectRepository` et les repositories |
| `typeorm` | ORM TypeScript/JavaScript. Permet de définir les tables via des classes (`@Entity`), de faire des requêtes et de gérer les migrations |
| `pg` | Driver PostgreSQL natif pour Node.js. Utilisé par TypeORM pour communiquer avec la base de données |

### Configuration

| Package | Rôle |
|---|---|
| `@nestjs/config` | Module NestJS pour charger et accéder aux variables d'environnement via `ConfigService`. Supporte le `.env` et la validation de schéma |
| `dotenv` | Charge automatiquement le fichier `.env` dans `process.env` |

### Validation

| Package | Rôle |
|---|---|
| `class-validator` | Fournit des décorateurs de validation (`@IsEmail()`, `@IsString()`, `@MinLength()`, etc.) pour les DTOs. Utilisé par le `ValidationPipe` global |
| `class-transformer` | Transforme les objets plain JS en instances de classes et vice-versa. Permet aussi d'exclure des champs avec `@Exclude()` (ex: le mot de passe) |
| `@nestjs/mapped-types` | Utilitaires pour dériver des DTOs : `PartialType()` (tous les champs optionnels), `PickType()`, `OmitType()`, `IntersectionType()` |

### Sécurité

| Package | Rôle |
|---|---|
| `helmet` | Sécurise l'application en configurant des headers HTTP (Content-Security-Policy, X-Frame-Options, etc.) pour se protéger contre des attaques courantes |
| `@nestjs/throttler` | Rate limiting. Limite le nombre de requêtes par IP sur une période donnée pour se protéger contre le brute-force et les attaques DDoS |

---

## 3. Architecture du projet

```
src/
├── auth/                        # Tout ce qui concerne l'authentification
│   ├── dto/
│   │   └── login.dto.ts         # DTO pour la route POST /auth/login
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    # Guard à appliquer sur les routes protégées
│   │   └── local-auth.guard.ts  # Guard utilisé uniquement sur POST /auth/login
│   ├── strategies/
│   │   ├── jwt.strategy.ts      # Valide le token JWT de chaque requête
│   │   └── local.strategy.ts    # Valide email/password lors du login
│   ├── auth.controller.ts       # Routes: POST /auth/login, POST /auth/register
│   ├── auth.module.ts
│   └── auth.service.ts          # Logique: validateUser(), login(), register()
│
├── users/                       # Module utilisateurs
│   ├── dto/
│   │   └── create-user.dto.ts
│   ├── user.entity.ts           # Table "users" en base de données
│   ├── users.module.ts
│   └── users.service.ts         # CRUD utilisateurs
│
├── app.module.ts                # Module racine : importe tous les modules
└── main.ts                      # Bootstrap : Swagger, Helmet, ValidationPipe
```

---

## 4. Guide : créer une nouvelle ressource API

Exemple concret : créer une API CRUD pour une ressource **Article**.

### Étape 1 — Créer l'entité

L'entité représente la table en base de données.

Créer `src/articles/article.entity.ts` :

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  isPublished: boolean;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### Étape 2 — Créer les DTOs

Les DTOs (Data Transfer Objects) définissent et valident les données reçues par l'API.

Créer `src/articles/dto/create-article.dto.ts` :

```typescript
import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ example: 'Mon premier article' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Contenu de l\'article...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
```

Créer `src/articles/dto/update-article.dto.ts` :

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';

// Tous les champs de CreateArticleDto deviennent optionnels automatiquement
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

---

### Étape 3 — Créer le Service

Le service contient toute la logique métier et interagit avec la base de données.

Créer `src/articles/articles.service.ts` :

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
  ) {}

  create(createArticleDto: CreateArticleDto): Promise<Article> {
    const article = this.articlesRepository.create(createArticleDto);
    return this.articlesRepository.save(article);
  }

  findAll(): Promise<Article[]> {
    return this.articlesRepository.find();
  }

  async findOne(id: number): Promise<Article> {
    const article = await this.articlesRepository.findOne({ where: { id } });
    if (!article) throw new NotFoundException(`Article #${id} not found`);
    return article;
  }

  async update(id: number, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);
    Object.assign(article, updateArticleDto);
    return this.articlesRepository.save(article);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.articlesRepository.remove(article);
  }
}
```

---

### Étape 4 — Créer le Controller

Le controller gère les routes HTTP et fait le lien entre la requête et le service.

Créer `src/articles/articles.controller.ts` :

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Articles')           // Groupe dans Swagger
@ApiBearerAuth()               // Indique que le Bearer Token est requis dans Swagger
@UseGuards(JwtAuthGuard)       // Toutes les routes de ce controller nécessitent un JWT valide
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un article' })
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.create(createArticleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les articles' })
  findAll() {
    return this.articlesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un article par ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un article' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articlesService.update(id, updateArticleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un article' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.remove(id);
  }
}
```

---

### Étape 5 — Créer le Module

Le module regroupe et déclare tous les éléments de la ressource.

Créer `src/articles/articles.module.ts` :

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],  // Enregistre l'entité pour ce module
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
```

---

### Étape 6 — Enregistrer dans AppModule

Importer le nouveau module dans `src/app.module.ts` :

```typescript
import { ArticlesModule } from './articles/articles.module';

@Module({
  imports: [
    // ... autres modules existants ...
    ArticlesModule,  // ← Ajouter ici
  ],
})
export class AppModule {}
```

Les routes suivantes sont maintenant disponibles :

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/articles` | Créer un article |
| `GET` | `/api/articles` | Lister tous les articles |
| `GET` | `/api/articles/:id` | Récupérer un article |
| `PATCH` | `/api/articles/:id` | Mettre à jour un article |
| `DELETE` | `/api/articles/:id` | Supprimer un article |

---

## 5. Authentification

Le starter utilise une authentification **JWT (JSON Web Token)**.

### Flux d'authentification

```
1. POST /api/auth/register  →  Créer un compte  →  Reçoit un access_token
2. POST /api/auth/login     →  Se connecter     →  Reçoit un access_token
3. GET  /api/articles       →  Header: Authorization: Bearer <access_token>
```

### Protéger une route avec JWT

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Sur un controller entier :
@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController { ... }

// Ou sur une route spécifique uniquement :
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile() { ... }
```

### Récupérer l'utilisateur connecté dans un controller

```typescript
import { Request } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Get('me')
getMe(@Request() req) {
  return req.user; // { id, email }
}
```

---

## 6. Variables d'environnement

Copier `.env.example` en `.env` et remplir les valeurs :

```env
# Application
PORT=3000
NODE_ENV=development        # 'production' désactive le synchronize TypeORM

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=ton_mot_de_passe
DB_NAME=nom_de_ta_base

# JWT
JWT_SECRET=une_chaine_tres_longue_et_aleatoire  # IMPORTANT: changer en prod
JWT_EXPIRES_IN=7d           # Format: 60s, 10m, 24h, 7d
```

> **Important** : Ne jamais committer le fichier `.env`. Il est déjà dans le `.gitignore`.

---

## 7. Commandes utiles

```bash
# Développement avec hot-reload
pnpm start:dev

# Build de production
pnpm build

# Lancer en production
pnpm start:prod

# Tests unitaires
pnpm test

# Tests e2e
pnpm test:e2e

# Couverture de tests
pnpm test:cov

# Générer un module complet avec le CLI NestJS
npx nest generate module nom-ressource
npx nest generate service nom-ressource
npx nest generate controller nom-ressource

# Ou tout en une commande (crée module + service + controller + DTOs)
npx nest generate resource nom-ressource
```

---

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
