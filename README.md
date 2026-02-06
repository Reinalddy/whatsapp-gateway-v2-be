# WhatsApp Gateway API

A RESTful API backend for WhatsApp messaging using Baileys library, built with Express.js, Socket.IO, and Prisma ORM.

## Features

- 🔐 **User Authentication** - JWT-based registration & login
- 📱 **Multi-Device Support** - Manage multiple WhatsApp sessions per user
- 💬 **Messaging** - Send text, images, and documents
- 🔄 **Real-time Updates** - Socket.IO for QR codes & connection status
- 📊 **Message History** - Track all sent messages with status

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js 5
- **Database:** PostgreSQL + Prisma ORM
- **WhatsApp:** Baileys
- **WebSocket:** Socket.IO
- **Auth:** JWT + bcrypt

---

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/whatsapp-gateway-be.git
cd whatsapp-gateway-be
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_gateway?schema=public"

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=3001

# CORS (optional, defaults to *)
CORS_ORIGIN=http://localhost:3000
```

### 4. Setup database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 5. Start the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server will run at `http://localhost:3001`

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Create new device/session |
| DELETE | `/api/devices/:id` | Delete device |
| POST | `/api/devices/:id/connect` | Connect/get QR code |
| POST | `/api/devices/:id/disconnect` | Disconnect session |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | Get message history |
| POST | `/api/messages/text` | Send text message |
| POST | `/api/messages/image` | Send image |
| POST | `/api/messages/document` | Send document |

---

## WebSocket Events

Connect to the Socket.IO server for real-time updates:

```javascript
const socket = io('http://localhost:3001')

// Join a session room
socket.emit('join-session', 'session-name')

// Listen for QR code
socket.on('qr', ({ sessionName, qr }) => {
  console.log('QR Code received:', qr)
})

// Listen for connection status
socket.on('connection', ({ sessionName, status }) => {
  console.log('Status:', status)
})
```

---

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start src/server.js --name "whatsapp-gateway"

# Enable auto-restart on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs whatsapp-gateway
```

### Using Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "start"]
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Project Structure

```
whatsapp-gateway-be/
├── prisma/
│   ├── migrations/      # Database migrations
│   └── schema.prisma    # Database schema
├── sessions/            # WhatsApp session files
├── uploads/             # Uploaded media files
├── src/
│   ├── config/          # Database & app config
│   ├── controllers/     # Route handlers
│   ├── middlewares/     # Auth & validation
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── validators/      # Request validation
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── .env                 # Environment variables
└── package.json
```

---

## License

ISC
