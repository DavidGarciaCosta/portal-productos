import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config.js';

/**
 * Middleware para autenticación JWT
 */
export const authenticateJWT = async (req, res, next) => {
    try {
        console.log('MIDDLEWARE JWT - Headers recibidos:', req.headers);
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            console.log('JWT: No hay header Authorization');
            return res.status(401).json({
                success: false,
                message: 'Token de acceso requerido',
                code: 'MISSING_TOKEN'
            });
        }

        const parts = authHeader.split(' ');
        
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            console.log('JWT: Formato de token inválido');
            return res.status(401).json({
                success: false,
                message: 'Formato de token inválido',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        const token = parts[1];
        console.log('JWT: Verificando token...');

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('JWT: Token válido - Usuario:', decoded.userId);
        
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            console.log('JWT: Usuario no encontrado en BD');
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        };

        console.log('JWT: Autenticación exitosa para:', user.username);
        next();
    } catch (error) {
        console.error('JWT Error:', error.message);

        if (error.name === 'TokenExpiredError') {
            console.log('JWT: Token expirado');
            return res.status(401).json({
                success: false,
                message: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            console.log('JWT: Token inválido');
            return res.status(401).json({
                success: false,
                message: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }

        console.log('JWT: Error interno');
        return res.status(500).json({
            success: false,
            message: 'Error en la autenticación',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Middleware para requerir rol de administrador
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Autenticación requerida',
            code: 'AUTH_REQUIRED'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Se requieren permisos de administrador',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
};

export const generateToken = (user) => {
    console.log('GENERANDO TOKEN PARA:', user.username);
    console.log('Datos del usuario:', {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role
    });
    
    try {
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: '24h',
                issuer: 'portal-productos'
            }
        );
        
        console.log('Token generado exitosamente');
        console.log('Longitud del token:', token.length);
        return token;
        
    } catch (error) {
        console.error('ERROR generando token:', error);
        throw error;
    }
};