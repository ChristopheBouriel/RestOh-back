#!/bin/bash

# Script pour démarrer le backend en nettoyant les conflits

echo "🧹 Nettoyage des processus nodemon existants..."

# Tuer tous les processus nodemon
pkill -f nodemon 2>/dev/null

echo "🧹 Nettoyage du port 3001..."

# Tuer tous les processus sur le port 3001
lsof -ti:3001 | xargs -r kill -9 2>/dev/null

# Attendre un moment pour que tout se libère
sleep 2

echo "🚀 Démarrage du serveur backend..."

# Démarrer le serveur
npm run dev