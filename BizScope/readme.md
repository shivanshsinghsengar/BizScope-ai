# 🚀 BizScope AI - Deployment Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)
- API Keys:
  - OpenAI API Key
  - Google Maps API Key

## Quick Start (Development)

1. **Clone & Install**
```bash
git clone <repo>
cd bizscope-ai

# Backend
cd backend
npm install
cp .env.example .env
# Add your API keys to .env

# Frontend  
cd ../frontend
npm install
cp .env.local.example .env.local
# Add your Google Maps key