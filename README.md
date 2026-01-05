# Sustify Backend

Fast, scalable, type-safe NestJS backend following SOLID principles, Design patterns and Clean Architecture.

## 🚀 Features

- ✅ **Clean Architecture** with layered design (Config, Core, Common, Modules, Integrations)
- ✅ **SOLID Principles** applied throughout
- ✅ **Repository Pattern** for data access abstraction
- ✅ **Global Exception Handling** with standardized error responses
- ✅ **Request/Response Logging** with timing
- ✅ **Automatic Validation** using class-validator
- ✅ **Type-Safe Configuration** with environment validation
- ✅ **HashiCorp Vault Integration** for secrets management
- ✅ **Health Checks** for monitoring
- ✅ **Comprehensive Testing** setup

## 📁 Project Structure

```
src/
├── config/              # Configuration layer
├── core/                # Domain layer (entities, interfaces, abstracts)
├── common/              # Shared utilities (filters, interceptors, decorators, DTOs)
├── modules/             # Feature modules (business logic)
├── integrations/        # External service integrations
├── health/              # Health check endpoints
└── validators/          # Validation utilities
```

## 🏗️ Architecture

This project follows **Clean Architecture** and **Domain-Driven Design** principles:

- **Config Layer**: Type-safe configuration management
- **Core Layer**: Base entities, repository interfaces, and abstracts
- **Common Layer**: Reusable components (filters, interceptors, decorators, DTOs, utils)
- **Modules Layer**: Feature-based business logic
- **Integrations Layer**: External service integrations (Vault, Email, etc.)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## 🎯 SOLID Principles

- **S**ingle Responsibility: Each class has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes can replace base types
- **I**nterface Segregation: Small, focused interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

## 🛠️ Quick Start

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Start in development mode
npm run start:dev

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

### Production

```bash
# Build the project
npm run build

# Start in production mode
npm run start:prod
```

## 📝 Environment Variables

```env
# Application
APP_PORT=3000
NODE_ENV=development
API_PREFIX=api

# Database (example)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=sustify
DB_SYNCHRONIZE=false
DB_LOGGING=false

# JWT (example)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Vault
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token
```

## 🧩 Creating a New Module

```bash
# Create module structure
mkdir -p src/modules/products/{controllers,services,repositories,entities,dto,interfaces,tests}

# Follow the pattern:
# 1. Create entity (extends BaseEntity)
# 2. Create repository (extends BaseRepository)
# 3. Create service (extends BaseService)
# 4. Create controller
# 5. Create DTOs
# 6. Create module
# 7. Register in AppModule
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed examples.

## 📚 API Documentation

### Health Endpoints

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health with memory, uptime

### Standard Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-11-21T12:00:00.000Z",
  "path": "/api/resource"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Additional context",
  "timestamp": "2025-11-21T12:00:00.000Z",
  "path": "/api/resource"
}
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Debug tests
npm run test:debug
```

## 🔒 Security Features

- ✅ Global validation pipe (whitelist, forbidNonWhitelisted)
- ✅ CORS enabled
- ✅ Request timeout protection
- ✅ Standardized error handling
- ✅ Vault integration for secrets

## 📊 Code Quality

- **ESLint**: TypeScript linting with recommended rules
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **TypeScript**: Type safety

## 🤝 Contributing

1. Follow the existing folder structure
2. Use the provided base classes and interfaces
3. Write tests for new features
4. Follow SOLID principles
5. Use DTOs for validation
6. Use BaseResponseDto for responses

## 📖 Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - Detailed architecture guide
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Original implementation plan

## 🎓 Design Patterns Used

- **Repository Pattern**: Data access abstraction
- **Service Layer Pattern**: Business logic encapsulation
- **DTO Pattern**: Data validation and transformation
- **Strategy Pattern**: Authentication strategies
- **Factory Pattern**: Configuration factory
- **Decorator Pattern**: Custom decorators
- **Interceptor Pattern**: Request/response transformation
- **Filter Pattern**: Exception handling

## 📄 License

UNLICENSED

## 🙏 Acknowledgments

Built with:
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [class-validator](https://github.com/typestack/class-validator) - Validation
- [class-transformer](https://github.com/typestack/class-transformer) - Transformation

---

**Happy Coding! 🚀**
