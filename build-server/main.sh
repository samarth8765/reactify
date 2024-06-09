#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

echo "Cloning the repository"

if git clone "$GIT_REPOSITORY_URL" /home/app/output/$PROJECT_ID; then
    echo "Cloning completed"
else
    echo "Error: Cloning failed"
    exit 1
fi

cd /home/app/output/$PROJECT_ID

echo "Installing dependencies and building the project"

if npm ci; then
    echo "Dependencies installed successfully"
else
    echo "Error: Failed to install dependencies"
    exit 1
fi

if npm run build; then
    echo "Build completed successfully"
else
    echo "Error: Build failed"
    exit 1
fi
