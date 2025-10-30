import { config } from 'dotenv';
config();

export const PORT = process.env.PORT || 3000;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-productos';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_cambiar_en_produccion_muy_segura';
export const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('CONFIGURACIÓN CARGADA:');
console.log('Puerto:', PORT);
console.log('MongoDB URI:', MONGODB_URI ? 'Definida' : 'No definida');
console.log('JWT Secret:', JWT_SECRET ? 'Definido' : 'No definido');
console.log('Entorno:', NODE_ENV);