#!/bin/bash

# Briefly project runner script
# This script helps with running and testing the application

print_header() {
  echo "======================================="
  echo "  Briefly - Todoist-iCal-AI Integration"
  echo "======================================="
  echo ""
}

check_env() {
  if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your API keys before running the application."
    echo ""
    return 1
  fi
  return 0
}

run_dev() {
  print_header
  if check_env; then
    echo "🚀 Starting development server..."
    npm run start:dev
  fi
}

run_tests() {
  print_header
  echo "🧪 Running tests..."
  
  if [ "$1" == "unit" ]; then
    echo "Running unit tests..."
    npm run test:unit
  elif [ "$1" == "integration" ]; then
    echo "Running integration tests..."
    npm run test:integration
  elif [ "$1" == "coverage" ]; then
    echo "Running tests with coverage..."
    npm run test:cov
  else
    echo "Running all tests..."
    npm run test
  fi
}

install_deps() {
  print_header
  echo "📦 Installing dependencies..."
  npm install
}

build_app() {
  print_header
  if check_env; then
    echo "🏗️  Building application..."
    npm run build
  fi
}

lint_fix() {
  print_header
  echo "🧹 Linting and fixing code..."
  npm run lint
}

case "$1" in
  "dev")
    run_dev
    ;;
  "test")
    run_tests "$2"
    ;;
  "install")
    install_deps
    ;;
  "build")
    build_app
    ;;
  "lint")
    lint_fix
    ;;
  *)
    print_header
    echo "Usage: ./run.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  dev         - Start development server"
    echo "  test        - Run tests (all tests)"
    echo "  test unit   - Run unit tests only"
    echo "  test integration - Run integration tests only"
    echo "  test coverage - Run tests with coverage"
    echo "  install     - Install dependencies"
    echo "  build       - Build the application"
    echo "  lint        - Run linter and fix issues"
    echo ""
    ;;
esac
