# ZenithGym

Sistema de administración integral para gimnasios. Centraliza la gestión de miembros, planes, suscripciones, pagos, asistencia, clases, inventario y ventas, con control de acceso por roles, auditoría de operaciones y un portal para los miembros del gimnasio.

El proyecto está organizado como un monorepo con tres componentes: una API REST (backend), una aplicación web (frontend) y una aplicación de escritorio empaquetada con Electron.

## Características principales

- Autenticación con JWT, recuperación de contraseña por correo y control de acceso basado en roles.
- Gestión de miembros con perfil detallado, fotografía, historial y estado de la membresía.
- Catálogo de planes y administración de suscripciones, con cobros parciales y vencimientos.
- Registro de pagos y generación de comprobantes.
- Control de asistencia mediante códigos QR.
- Programación de clases y asignación de entrenadores.
- Punto de venta (tienda) con catálogo de productos e inventario.
- Panel de indicadores y métricas del gimnasio.
- Registro de auditoría de las acciones realizadas por el personal.
- Portal para miembros con acceso al catálogo de productos.
- Recordatorios automáticos de pagos y suscripciones por correo electrónico.
- Actualizaciones en tiempo real mediante Socket.IO.
- Exportación de reportes a Excel y PDF desde la interfaz.

## Tecnologías

| Componente | Tecnologías |
| --- | --- |
| Backend | Node.js, TypeScript, Express 5, Mongoose, MongoDB, Zod, JWT, Bcrypt, Pino, Socket.IO, Nodemailer, Node-cron |
| Frontend | React 19, TypeScript, Vite, React Router, Axios, Chart.js, Socket.IO Client, html5-qrcode |
| Escritorio | Electron, mongodb-memory-server |
| Infraestructura | Docker, Docker Compose, Nginx, GitHub Actions |
| Pruebas | Vitest, Supertest, Testing Library |

## Requisitos previos

- Node.js 20 o superior
- pnpm 10
- MongoDB 7 (local o mediante Docker)
- Docker y Docker Compose (opcional, para el despliegue en contenedores)

## Estructura del proyecto

```
gym-management-system/
├── backend/            API REST (Express + TypeScript)
│   └── src/
│       ├── modules/    Módulos de dominio (auth, members, payments, etc.)
│       ├── shared/     Middlewares, servicios, utilidades y trabajos programados
│       ├── config/     Conexión a la base de datos
│       ├── seed.ts     Creación del administrador inicial
│       └── server.ts   Punto de entrada del servidor
├── frontend/           Aplicación web (React + Vite)
│   └── src/
│       ├── pages/      Vistas de la aplicación
│       ├── components/ Componentes reutilizables
│       ├── routes/     Definición y protección de rutas
│       ├── services/   Clientes de la API
│       └── hooks/      Hooks personalizados
├── electron/           Aplicación de escritorio (Electron)
├── bruno/              Colección de peticiones para probar la API
├── .github/workflows/  Integración y despliegue continuo
├── docker-compose.yml  Orquestación de servicios
└── package.json        Scripts raíz (build y ejecución de escritorio)
```

## Configuración

### Variables de entorno del backend

Crea un archivo `backend/.env` a partir de `.env.example`:

```env
# Administrador creado automáticamente en el primer inicio
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=ZenithGym
ADMIN_EMAIL=admin@zenithgym.com
ADMIN_PASSWORD=Admin123!

# Autenticación
JWT_SECRET=cambia-esta-clave
JWT_EXPIRES_IN=7d

# Servidor
PORT=3000
MONGO_URI=mongodb://localhost:27017/zenithgym
FRONTEND_URL=http://localhost:5173

# Correo electrónico (recuperación de contraseña y recordatorios)
EMAIL_USER=
EMAIL_PASS=

# Opcionales
NODE_ENV=development
LOG_LEVEL=info
SERVE_FRONTEND=false
```

### Variables de entorno del frontend

Crea un archivo `frontend/.env` a partir de `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:3000/api
```

## Instalación y ejecución

### Desarrollo local

1. Instala las dependencias de cada componente:

   ```bash
   cd backend && pnpm install
   cd ../frontend && pnpm install
   ```

2. Inicia el backend en modo desarrollo (recarga automática):

   ```bash
   cd backend && pnpm dev
   ```

   La API queda disponible en `http://localhost:3000`.

3. En otra terminal, inicia el frontend:

   ```bash
   cd frontend && pnpm dev
   ```

   La aplicación queda disponible en `http://localhost:5173`.

Al iniciar el backend por primera vez, se crea automáticamente el usuario administrador con las credenciales definidas en las variables `ADMIN_*`.

### Docker Compose

El archivo `docker-compose.yml` define tres servicios: MongoDB, el backend y el frontend servido por Nginx.

1. Crea un archivo `.env` en la raíz con las variables que consume la orquestación (`JWT_SECRET`, `JWT_EXPIRES_IN` y las credenciales `ADMIN_*`).

2. Levanta los servicios:

   ```bash
   docker compose up --build
   ```

   El frontend se expone en `http://localhost` (puerto 80) y el backend en `http://localhost:3000`.

### Aplicación de escritorio (Electron)

La aplicación de escritorio empaqueta el frontend, el backend y una instancia local de MongoDB, por lo que no requiere servicios externos.

```bash
pnpm build   # Compila backend y frontend
pnpm start   # Inicia la aplicación Electron
```

El comando `pnpm dev` compila y arranca la aplicación en un solo paso.

## Roles y permisos

El sistema define un usuario propietario y tres roles de personal:

| Rol | Descripción |
| --- | --- |
| Propietario | Cuenta principal, no visible en la gestión de usuarios. Acceso total. |
| `admin` | Administración completa del sistema, incluidos usuarios y auditoría. |
| `receptionist` | Gestión de miembros, suscripciones, pagos, asistencia y ventas. |
| `trainer` | Consulta de miembros, clases y asistencia. |

Los miembros del gimnasio acceden a un portal reducido con el catálogo de productos.

## API REST

Todas las rutas se sirven bajo el prefijo `/api`. Excepto la autenticación y el portal de miembros, requieren un token JWT válido.

| Recurso | Ruta base | Descripción |
| --- | --- | --- |
| Autenticación | `/api/auth` | Inicio de sesión, recuperación y restablecimiento de contraseña |
| Miembros | `/api/members` | CRUD de miembros y perfiles |
| Portal de miembros | `/api/member` | Catálogo y categorías para miembros |
| Planes | `/api/plans` | CRUD de planes de membresía |
| Suscripciones | `/api/subscriptions` | Gestión de suscripciones |
| Asistencia | `/api/attendance` | Registro y consulta de asistencia |
| Clases | `/api/classes` | Programación de clases |
| Pagos | `/api/payments` | Registro y consulta de pagos |
| Panel | `/api/dashboard` | Indicadores y métricas |
| Usuarios | `/api/users` | Gestión del personal |
| Auditoría | `/api/audit-logs` | Registro de acciones del personal |
| Productos | `/api/products` | Catálogo e inventario |
| Ventas | `/api/sales` | Punto de venta |
| Estado | `/api/health` | Verificación de disponibilidad del servicio |

La colección de peticiones en la carpeta `bruno/` permite probar estos endpoints.

## Pruebas

Cada componente define su propia configuración de Vitest.

```bash
cd backend && pnpm test    # Pruebas de la API con Supertest y mongo-memory-server
cd frontend && pnpm test   # Pruebas de componentes con Testing Library
```

## Integración y despliegue continuo

El flujo definido en `.github/workflows/ci.yml` se ejecuta en cada `push` y `pull request` hacia la rama `main`:

1. Ejecuta las pruebas del backend y del frontend en Node.js 22.
2. Si ambas pasan y existen las credenciales de Docker Hub configuradas, construye y publica las imágenes `zenithgym-backend` y `zenithgym-frontend`.

## Licencia

Este proyecto se distribuye con fines educativos y de uso interno. Consulta con los mantenedores antes de su redistribución.
