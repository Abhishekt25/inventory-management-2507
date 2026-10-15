# Inventory Management (Node + Express + PostgreSQL + React/Vite)

## Prerequisites
Node.js 18+ and PostgreSQL running locally.

## 1. Backend
cd backend
# edit .env -> set your postgres password in DATABASE_URL
npm install
npm run db:init      # creates DB "inventory", tables, and the 3 sample products
npm run dev          # http://localhost:5000

## 2. Frontend (new terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173

## API
POST /products | GET /products
POST /stock/in | POST /stock/out   body: {"product_id":1,"quantity":5}
GET  /stock/:product_id | GET /stock/:product_id/transactions
