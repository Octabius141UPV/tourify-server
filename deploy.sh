#!/bin/bash



# Realizar git pull para obtener los últimos cambios
echo "Realizando git pull..."
git pull origin main

# Instalar dependencias
echo "Instalando dependencias..."
npm install

# Ejecutar la compilación del proyecto
echo "Compilando el proyecto..."
npm run build

# Reiniciar la aplicación con PM2
echo "Reiniciando PM2..."
pm2 restart tourify-api

echo "Proceso completado."
