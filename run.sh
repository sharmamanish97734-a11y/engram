#!/bin/bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8080 &
cd ../frontend
python -m http.server 5173
