# FraudForge

An AI-powered payment fraud defense prototype designed to simulate the red-team / blue-team adversarial loop. 

FraudForge provides a controlled environment to generate synthetic fraud attack vectors, train detection models (XGBoost), analyze false-negative vulnerabilities, and deploy iterative AI evasion techniques using Google Gemini as a red-team strategist.

## Key Features

1. **Simulate (Red Team)**
   - Generate phishing emails, smishing texts, and voice-clone phone scripts using Gemini APIs.
   - Inject realistic parameters (victim profile, urgency, etc.) into the AI generation.
   - Fallbacks to structured mock responses if the API is offline or rate-limited.
   
2. **Defend (Blue Team)**
   - Trains baseline Machine Learning models (XGBoost) against a combination of legitimate data (`data/paysim_sample.csv` or synthetic fallback) and basic synthetic fraud.
   - Runs an automated adversarial evasion loop:
     1. Analyze false-negative features
     2. Prompt Gemini for an evasion plan
     3. Distribute a new, harder batch of synthetic fraud based on those recommendations
   - Outputs side-by-side performance metrics across different "rounds" of training, dynamically shifting feature importance.

## Installation

### Dependencies

Requires **Python 3.10+** and **Node.js 18+**.

#### Backend (FastAPI + XGBoost + Gemini API)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Set up your `.env` file in the `backend` directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

The optional Hackathon Test email sends only a harmless labeled notification. Configure
these variables in the backend deployment when you want to enable it (use a Gmail App
Password, not the normal account password):
```
SMTP_USERNAME=your_gmail_address
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM=your_gmail_address
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

#### Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
```

## Running the Application

1. Start the API Server (Terminal 1)
```bash
cd backend
uvicorn main:app --reload --port 8000
```
2. Start the Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173** to use the application!
