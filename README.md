## Technology Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Testing**: Jest
- **Port**: 3001

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Port**: 5173

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

### 1. Clone the Repository
```bash
git clone git@github.com:g3Bg2/uniblox_assignment.git
cd uniblox_assignment
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

## Running the Application

### Start Backend Server
```bash
cd backend
npm run dev
```
The backend server will run on `http://localhost:3001`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:5173`

### Build Frontend for Production
```bash
cd frontend
npm run build
```

## Running Tests

### Run Backend Tests
```bash
cd backend
npm test
```

Run tests in watch mode:
```bash
cd backend
npm run test:watch
```