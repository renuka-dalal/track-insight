#!/bin/sh
set -e

echo "Running database migrations..."
npm run migrate:up

echo "Seeding database with realistic data..."
npm run db:seed:realistic

echo "Starting server on port ${PORT:-10000}..."
exec npm start
