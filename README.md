# ማረፊያ | Hostel Management System

A full-stack hostel operations app built with React, Vite, Tailwind CSS, Express, and MongoDB. It provides role-based tools for residents, staff, and administrators to manage room assignments, maintenance, announcements, and billing.

## What the System Does

- **Residents** can register and sign in, view their dashboard and assigned room, submit maintenance requests, view invoices, pay invoices through Chapa, and read in-app notifications.
- Residents can ask Gemini to summarize a maintenance draft, suggest its category and priority, and identify details that may be missing. Suggestions must be reviewed and are not submitted automatically.
- All signed-in roles can use Gemini chat for general questions. It does not access live hostel database records; users should verify important answers and avoid sharing sensitive information.
- **Staff** can manage resident records and rooms, assign or remove residents from rooms, review maintenance requests, generate invoices, and send announcements.
- Staff can request an AI review of an existing maintenance ticket; it does not change the saved ticket or its priority.
- **Administrators** have staff-management permissions in addition to the staff workflows.
- Maintenance status changes and newly generated invoices create notifications for the affected resident.
- Room records include room number, capacity, AC type, monthly price, status, and assigned occupants.
- Invoice totals include the room fee, optional additional charges, discounts, and late fees.

Public pages include Home, About, Contact, Login, and Signup. Dashboard pages are protected and display features according to the signed-in user's role. Public signup always creates a resident account; staff accounts are created by administrators.

## How It Works

1. The React app renders the public site and protected dashboard pages. Vite serves it locally, normally at `http://localhost:5173`.
2. The frontend sends HTTP requests to the Express API. Its default API prefix is `/api`; during local development, Vite proxies these requests to `http://localhost:5000`.
3. Express mounts routers for authentication, rooms, users, maintenance, notifications, and billing. The API checks the MongoDB connection before handling requests.
4. Mongoose reads and writes users, rooms, maintenance requests, invoices, and notifications in MongoDB.
5. Login verifies the stored password hash and returns a signed JWT. The frontend stores the token and sends it as a Bearer token for protected API requests. The backend verifies the token and checks the user's role before allowing protected actions.
6. The maintenance assistance endpoint sends only the draft title and description to Gemini, along with the MySQL `maintenance_requests` schema as static context. Its structured response is displayed as a suggestion; applying a suggestion changes only the editable form, and the resident must still submit the request. Gemini does not query or update the database.
7. The signed-in chat sends the user's question to Gemini for a general response. It does not include live hostel records or conversation history.
8. Chapa payment requests redirect the resident to its checkout page. The backend verifies callback and return status with Chapa before updating an invoice.

## API Route Groups

All routes are under `/api`:

| Route group      | Main operations                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/auth`          | Resident registration and login (`/register`, `/login`)                                                                      |
| `/rooms`         | List rooms, view a resident's room, create/update/delete rooms, assign/remove residents                                      |
| `/users`         | List and manage residents; administrator-only staff management                                                               |
| `/maintenance`   | Get AI suggestions (`/assist`), submit a request, list a resident's requests, review requests, update status                 |
| `/assistant`     | Generate Gemini chat responses for signed-in users (`/chat`)                                                                 |
| `/notifications` | Send notifications, list the signed-in user's notifications, mark notifications read                                         |
| `/billing`       | Generate and list invoices, view a resident's invoices, initiate/verify Chapa payments, administrator/staff payment override |

Most routes require a valid JWT. Admin/staff-only actions are additionally checked by role. Authentication endpoints and the Chapa callback are exceptions to the JWT requirement.

## Project Structure

```text
Hostel-management-system-main/
├── .gitignore
├── README.md
├── DEPLOYMENT.md
├── report/
│   ├── Hostel_Management_System_Project_Report.docx
│   └── Hostel_Management_System_Presentation.pptx
├── backend/
│   ├── api/
│   │   └── index.js                     # Serverless entry point
│   ├── config/
│   │   └── chapa.js                 # Chapa configuration
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT authentication and role checks
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Maintenance.js
│   │   ├── Billing.js               # Active invoice model
│   │   ├── Notification.js
│   │   └── Bill.js                  # Legacy model; not used by current billing routes
│   ├── routes/
│   │   ├── assistantRoutes.js
│   │   ├── authRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── maintenanceRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── roomRoutes.js
│   │   └── userRoutes.js
│   ├── utils/
│   │   ├── gemini.js                # Gemini chat and maintenance suggestions
│   │   └── chapa.js                 # Chapa API helpers
│   ├── schema.mysql.sql             # MySQL practice schema; runtime uses MongoDB
│   ├── seed.js                       # Development admin seed script
│   ├── server.js                     # Express app and MongoDB connection
│   ├── vercel.json
│   └── package.json
└── frontend/
	├── public/
	│   ├── favicon.svg
	│   ├── icons.svg
	│   └── logo.jpg
	├── src/
	│   ├── assets/
	│   │   ├── hero.png
	│   │   ├── react.svg
	│   │   └── vite.svg
	│   ├── components/
	│   │   ├── FloatingAssistant.jsx
	│   │   ├── NotificationBell.jsx
	│   │   ├── ProtectedRoute.jsx
	│   │   └── RoomsDashboard.jsx
	│   ├── config/
	│   │   └── api.js
	│   ├── context/
	│   │   └── AuthContext.jsx
	│   ├── layouts/
	│   │   ├── DashboardLayout.jsx
	│   │   └── PublicLayout.jsx
	│   ├── pages/
	│   │   ├── About.jsx
	│   │   ├── AnnouncementsManager.jsx
	│   │   ├── Assistant.jsx
	│   │   ├── Billing.jsx
	│   │   ├── Contact.jsx
	│   │   ├── DashboardHome.jsx
	│   │   ├── Home.jsx
	│   │   ├── Login.jsx
	│   │   ├── Maintenance.jsx
	│   │   ├── ManageResidents.jsx
	│   │   ├── ManageRooms.jsx
	│   │   ├── ManageStaff.jsx
	│   │   ├── MyRoom.jsx
	│   │   └── Signup.jsx
	│   ├── App.css
	│   ├── App.jsx
	│   ├── index.css
	│   └── main.jsx
	├── eslint.config.js
	├── index.html
	├── postcss.config.js
	├── tailwind.config.js
	├── vercel.json
	├── vite.config.js
	└── package.json
```

`backend` contains the Express API, database models, route handlers, authentication middleware, and external-service helpers. `frontend` contains the React pages and shared layouts/components. Dependency folders and generated build output are omitted from this tree.

## Run Locally

### Prerequisites

- Node.js and npm
- A MongoDB database reachable from your machine (local MongoDB or MongoDB Atlas)

### 1. Configure and start the backend

From the project root:

```bash
cd backend
npm install
```

Create `backend/.env` with at least:

```env
PORT=5000
MONGO_URI=mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_gemini_api_key
# Optional; defaults to gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
```

Start the API:

```bash
npm start
```

The current backend connects to MongoDB before it starts listening. Keep this terminal open. If the database connection fails, the API will not start; check `MONGO_URI`, database credentials, and MongoDB network access. The MySQL schema file is for SQL practice; adding MySQL context to Gemini does not migrate the application database.
Get `GEMINI_API_KEY` from Google AI Studio. The key stays on the backend; without it, maintenance requests still work but AI assistance returns an unavailable response.

### 2. Start the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Keep both the backend and frontend terminals running. Local frontend requests use the Vite proxy configured in `frontend/vite.config.js`.

For a separately deployed frontend, set `VITE_API_BASE_URL` to the backend API URL ending in `/api`, for example `https://your-api.example.com/api`.

## Chapa Configuration

Set the Chapa secret key only in the backend environment. `BACKEND_URL` must be publicly reachable by Chapa for callbacks. Keep the frontend and backend currency values aligned.

```env
CHAPA_SECRET_KEY=your_chapa_secret_key
CHAPA_API_BASE_URL=https://api.chapa.co/v1
CHAPA_CURRENCY=ETB
BACKEND_URL=https://your-backend.example.com
FRONTEND_URL=https://your-frontend.example.com
```

Set `VITE_BILLING_CURRENCY` to the same currency in `frontend/.env` (for example, `ETB`). The default is `ETB`. Configure Chapa credentials and account currency for the environment where you deploy.

## Development Admin Account

After configuring `backend/.env`, you can run the seed script from the `backend` directory:

```bash
node seed.js
```

It creates `admin@gmail.com` with the development password `admin123` if that email does not already exist. Change or remove these credentials before using the system with real data. Never commit `.env` files or production secrets.
