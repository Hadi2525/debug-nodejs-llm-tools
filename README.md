# 🔍 debug-nodejs-llm-tools

> A comprehensive guide to debugging LLM function calling in Node.js with practical examples and best practices.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](#license)

---

## 📋 Overview

This repository provides production-ready Node.js and Python applications that demonstrate how to architect, debug, and deploy applications using Large Language Models (LLMs) with function calling capabilities. It includes:

- ✅ Multi-LLM support (OpenAI & Google Gemini)
- ✅ Multiple tools (news, places, unit converter, time)
- ✅ Docker containerization for both Node.js and Python
- ✅ Cloud deployment to Google Cloud Container Registry
- ✅ Comprehensive error handling and logging
- ✅ Python FastAPI alternative implementation

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ or **Python** 3.8+
- **Docker** (optional, for containerized deployment)
- **Google Cloud SDK** (for GCR deployment)
- API Keys: OpenAI, Google Gemini, NewsAPI, Apify

### Installation

```bash
# Clone the repository
git clone https://github.com/hadi2525/debug-nodejs-llm-tools.git
cd debug-nodejs-llm-tools

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API keys
```

### Run Locally

```bash
# Start Node.js server (port 3000)
node server.js

# In another terminal, test the API
curl -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query": "What time is it?"}'
```

---

## 📁 Project Structure

```
.
├── server.js              # Express server with OpenAI & Gemini endpoints
├── functions.js           # Tool implementations (news, places, converter, time)
├── tools.js               # Function calling registry & dispatcher
├── package.json           # Node.js dependencies
├── Dockerfile             # Docker image for Node.js server
├── .dockerignore           # Files to exclude from Docker build
├── HowToRun.md            # Detailed setup and deployment guide
├── prompts.md             # Generation prompts for this project
│
└── python/                # Python FastAPI equivalent
    ├── server.py
    ├── functions.py
    ├── tools.py
    ├── Dockerfile
    ├── requirements.txt
    └── .dockerignore
```

---

## 🛠️ Available Tools

| Tool | Description | Example Query |
|------|-------------|----------------|
| **get_latest_news** | Fetch current news articles | "What's happening in the world today?" |
| **get_google_places** | Find locations and businesses | "Find coffee shops near me" |
| **convert_units** | Unit conversion (C↔F, km↔mi) | "Convert 32 Celsius to Fahrenheit" |
| **get_time** | Current server time | "What time is it?" |

---

## 🤖 Supported LLM Providers

### OpenAI (gpt-4o)
```bash
POST /query
Content-Type: application/json
{ "query": "Your question here" }
```

### Google Gemini (gemini-2.5-flash)
```bash
POST /query-gemini
Content-Type: application/json
{ "query": "Your question here" }
```

---

## 🐳 Docker Deployment

### Build Docker Images

```bash
# Node.js image
docker build -t debug-nodejs-llm-tools .

# Python image
docker build -t debug-python-llm-tools ./python
```

### Run with Docker

```bash
# Start Node.js server
docker run -d --name nodejs-server \
  -p 3000:3000 \
  --env-file .env \
  debug-nodejs-llm-tools

# Start Python server
docker run -d --name python-server \
  -p 8000:8000 \
  --env-file python/.env \
  debug-python-llm-tools
```

---

## ☁️ Deploy to Google Cloud Container Registry

### Step 1: Authenticate & Configure

```bash
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>
gcloud auth configure-docker gcr.io
```

### Step 2: Enable API & Tag Image

```bash
gcloud services enable artifactregistry.googleapis.com

docker tag debug-nodejs-llm-tools gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1
```

### Step 3: Push to GCR

```bash
docker push gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1
```

### Step 4: Verify & Deploy

```bash
gcloud container images list --repository=gcr.io/<YOUR_PROJECT_ID>
```

### Step 5: Deploy to Google Cloud Run

```bash
gcloud run deploy debug-nodejs-llm-tools \
  --image gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=<YOUR_KEY>,GEMINI_API_KEY=<YOUR_KEY>,NEWS_API_KEY=<YOUR_KEY>,APIFY_TOKEN=<YOUR_TOKEN>,PORT=3000"
```

Your service will be available at: `https://<SERVICE_NAME>-<HASH>.a.run.app`

📚 **See [HowToRun.md](HowToRun.md) for complete GCR, Cloud Run & Artifact Registry deployment instructions with testing and troubleshooting.**

---

## 📖 Documentation

- **[HowToRun.md](HowToRun.md)** - Complete setup, examples, and cloud deployment guide
- **[prompts.md](prompts.md)** - Prompts used to generate this project
- **[python/README.md](python/README.md)** - Python FastAPI documentation

---

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
NEWS_API_KEY=...
APIFY_TOKEN=...
PORT=3000
```

---

## 🎯 Key Features

- **Multi-LLM Support**: Switch between OpenAI and Google Gemini
- **Extensible Tool Registry**: Easy to add new tools and functions
- **Production Ready**: Proper error handling, logging, and JSON formatting
- **Cloud Native**: Docker and GCR support out of the box
- **Dual Stack**: Node.js and Python implementations for flexibility
- **Well Documented**: Comprehensive guides for local and cloud deployment

---

## 🐛 Debugging & Troubleshooting

Common issues and solutions are documented in [HowToRun.md](HowToRun.md).

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👤 Author

Built by FullStackAI for learning and production use.

