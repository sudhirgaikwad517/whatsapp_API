# 🚀 Prowexa WhatsApp — Quick Setup, Login Credentials & Meta API Guide

## 🔐 Default Admin Login Credentials

| Attribute | Value |
| :--- | :--- |
| **Email** | `admin@prowexa.com` |
| **Password** | `Admin123!` |
| **Organization** | `Prowexa Enterprise` |
| **Role** | `BUSINESS_OWNER` |

---

## 📱 Meta Portal Extracted Identifiers (WP_API_SaaS)

| Parameter | Value |
| :--- | :--- |
| **Meta App ID** | `1965990760786807` |
| **WABA ID** | `2251442372294214` |
| **Phone Number ID** | `1181142285092556` |
| **Test Phone Number** | `+1 (555) 667-7453` |
| **Webhook Verify Token** | `prowexa_whatsapp_webhook_secret_123` |

---

## 🌐 Local Application Endpoints

- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend Express API**: [http://localhost:5050](http://localhost:5050)
- **Prisma Database Studio**: [http://localhost:5555](http://localhost:5555)

---

## 🛠️ Step-by-Step System Execution

### 1. Start Infrastructure Services (PostgreSQL & Redis)
```bash
docker-compose up -d
```

### 2. Database Migration & Seeding
```bash
npm run prisma:migrate
npm run prisma:generate
```
To re-seed default admin credentials and test templates:
```bash
npx prisma db seed
```

### 3. Run Development Servers
```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Frontend Dashboard
npm run dev:frontend
```

---

## ⚡ Meta WhatsApp Cloud API & Webhooks Setup Guide

### Step 1: Meta Developer Portal Setup
1. Log in to [Meta for Developers](https://developers.facebook.com/).
2. Create a new App of type **Business**.
3. Under App Dashboard, click **Set up** under **WhatsApp**.
4. In **WhatsApp -> API Setup**, note down your:
   - **WABA ID** (WhatsApp Business Account ID)
   - **Phone Number ID**
   - **Temporary / Permanent Access Token**
5. In **App Settings -> Basic**, copy your **App ID** and **App Secret**.

### Step 2: Configure Environment Variables (`.env`)
Update your `.env` file in the project root:
```env
META_API_VERSION="v20.0"
META_GRAPH_BASE_URL="https://graph.facebook.com"
META_APP_ID="<YOUR_META_APP_ID>"
META_APP_SECRET="<YOUR_META_APP_SECRET>"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="prowexa_whatsapp_webhook_secret_123"
```

### Step 3: HTTPS Local Tunneling for Webhooks
Meta requires an HTTPS endpoint to deliver webhook callbacks. Expose backend port `5050`:
```bash
ngrok http 5050
```
Copy your forwarding HTTPS URL (e.g. `https://a1b2c3d4.ngrok-free.app`).

### Step 4: Webhook Subscription on Meta Dashboard
1. In Meta Dashboard, navigate to **WhatsApp -> Configuration**.
2. Click **Edit Webhook**:
   - **Callback URL**: `https://<YOUR_NGROK_DOMAIN>.ngrok-free.app/api/v1/webhooks/whatsapp`
   - **Verify Token**: `prowexa_whatsapp_webhook_secret_123`
3. Click **Verify and Save**.
4. Under **Webhook Fields**, click **Manage** and subscribe to:
   - ✅ `messages`
   - ✅ `message_template_status_update`

### Step 5: Connect Account & Sync Templates
1. Log in to Prowexa Dashboard ([http://localhost:5173](http://localhost:5173)) using `admin@prowexa.com` / `Admin123!`.
2. Go to **Settings -> WhatsApp Connection**, enter your WABA credentials and token, and click **Connect**.
3. Go to **Templates** and click **Sync Meta Templates**.

---

## 🧪 Testing & Simulation Commands

- **Simulate Inbound Webhook**:
  ```bash
  npm run simulate:webhook
  ```
- **Run System Typechecks**:
  ```bash
  npm run typecheck
  ```
