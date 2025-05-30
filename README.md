# HoBom API Gateway

**HoBom API Gateway** is the centralized entry point for the HoBom microservices ecosystem. It is responsible for routing requests, handling authentication and authorization, and managing common API concerns such as logging, error handling, and response formatting. This project is built with **NestJS** and **TypeScript**, emphasizing scalability and maintainability.

---

## 🧭 Overview

- **Repository**: [HoBom-s/hobom-api-gateway](https://github.com/HoBom-s/hobom-api-gateway)
- **Main Tech Stack**: NestJS, TypeScript
- **Key Features**:
    - Routes incoming client requests to appropriate microservices
    - Handles authentication and access control
    - Provides logging, monitoring, and standardized error responses

---

## ⚙️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient, scalable server-side applications
- **Language**: TypeScript
- **Package Manager**: npm
- **Linting & Formatting**:
    - ESLint
    - Prettier

---

## 🔑 Authentication

This API Gateway enforces an API key authentication mechanism. Every request **must** include the API key in the `X-Hobom-Api-Key` header. Requests without a valid API key will receive a `401 Unauthorized` response.

---

## 📁 Project Structure
```
hobom-api-gateway
├── src/ # Main application source code
│ ├── main.ts # Application entry point
│ ├── app.module.ts # Root module
│ └── ... # Other modules, controllers, and services
├── test/ # Unit and integration tests
├── .github/ # GitHub workflow configurations
├── .gitignore # Git ignore rules
├── package.json # Project metadata and dependencies
├── tsconfig.json # TypeScript compiler settings
├── eslint.config.mjs # ESLint configuration
├── .prettierrc # Prettier formatting configuration
└── README.md # Project documentation
```

