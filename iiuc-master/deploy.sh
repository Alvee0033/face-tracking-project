#!/bin/bash
# Quick Deployment Script for IIUC Master
# This script prepares and optionally deploys the app to Render + Firebase

set -e

echo "🚀 IIUC Master Deployment Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js found${NC}"
    
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git found${NC}"
    
    if ! command -v firebase &> /dev/null; then
        echo -e "${YELLOW}⚠ Firebase CLI not found. Installing...${NC}"
        npm install -g firebase-tools
    else
        echo -e "${GREEN}✓ Firebase CLI found${NC}"
    fi
    
    echo ""
}

# Setup backend environment
setup_backend_env() {
    echo "⚙️  Setting up backend environment..."
    
    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}Creating backend/.env from .env.example${NC}"
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}⚠️  Please edit backend/.env with your Supabase credentials${NC}"
        echo "   Edit: backend/.env"
        echo ""
        read -p "Press Enter once you've updated backend/.env..."
    else
        echo -e "${GREEN}✓ backend/.env exists${NC}"
    fi
    echo ""
}

# Setup frontend environment
setup_frontend_env() {
    echo "⚙️  Setting up frontend environment..."
    
    read -p "Enter your Render backend URL (e.g., https://iiuc-master-api.onrender.com): " BACKEND_URL
    
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=${BACKEND_URL}/api/v1
EOF
    
    echo -e "${GREEN}✓ frontend/.env.local created${NC}"
    echo "   NEXT_PUBLIC_API_URL=${BACKEND_URL}/api/v1"
    echo ""
}

# Build frontend
build_frontend() {
    echo "🏗️  Building frontend..."
    
    cd frontend
    npm install
    npm run build
    cd ..
    
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
    echo "   Output: frontend/out"
    echo ""
}

# Deploy frontend
deploy_frontend() {
    echo "🌐 Deploying frontend to Firebase..."
    
    cd frontend
    firebase deploy --only hosting
    cd ..
    
    echo -e "${GREEN}✓ Frontend deployed${NC}"
    echo ""
}

# Deploy backend
deploy_backend_instructions() {
    echo ""
    echo "📦 Backend Deployment to Render"
    echo "================================"
    echo ""
    echo "1. Go to https://dashboard.render.com"
    echo "2. Create a new Web Service"
    echo "3. Connect your GitHub repository"
    echo "4. Use render.yaml for configuration"
    echo ""
    echo "📋 Quick Setup:"
    echo "   - Name: iiuc-master-api"
    echo "   - Build: npm install"
    echo "   - Start: npm run start"
    echo ""
    echo "After deployment, update NEXT_PUBLIC_API_URL in frontend/.env.local"
    echo ""
}

# Main menu
main_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1. Check prerequisites only"
    echo "2. Setup environment files only"
    echo "3. Build frontend only"
    echo "4. Deploy frontend to Firebase (requires build)"
    echo "5. Full setup and deploy frontend"
    echo "6. Show deployment guides"
    echo "q. Quit"
    echo ""
    
    read -p "Choose option (1-6 or q): " choice
    
    case $choice in
        1)
            check_prerequisites
            ;;
        2)
            check_prerequisites
            setup_backend_env
            setup_frontend_env
            ;;
        3)
            check_prerequisites
            build_frontend
            ;;
        4)
            check_prerequisites
            build_frontend
            deploy_frontend
            ;;
        5)
            check_prerequisites
            setup_backend_env
            setup_frontend_env
            build_frontend
            echo ""
            read -p "Deploy to Firebase now? (y/n): " deploy_choice
            if [ "$deploy_choice" = "y" ]; then
                deploy_frontend
                deploy_backend_instructions
            else
                deploy_backend_instructions
            fi
            ;;
        6)
            echo ""
            cat DEPLOY_BACKEND_RENDER.md
            echo ""
            echo "===================="
            echo ""
            cat DEPLOY_FRONTEND_FIREBASE.md
            ;;
        q)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            main_menu
            ;;
    esac
}

# Start
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master
main_menu
