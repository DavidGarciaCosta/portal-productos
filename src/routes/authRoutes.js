import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/authenticateJWT.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validaciones básicas
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El usuario o email ya está registrado'
            });
        }

        // Crear nuevo usuario
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Generar token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: user.toProfileJSON()
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
});

// Login de usuario
router.post('/login', async (req, res) => {
    try {
        console.log('LOGIN ATTEMPT:');
        console.log('Email recibido:', req.body.email);
        console.log('Password recibido:', req.body.password ? '***' : 'vacío');

        const { email, password } = req.body;

        if (!email || !password) {
            console.log(' Faltan credenciales');
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario
        console.log('🔍 Buscando usuario en BD...');
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('Usuario no encontrado:', email);
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        console.log('Usuario encontrado:', user.username);

        // Verificar contraseña
        console.log('🔑 Verificando contraseña...');
        const isValidPassword = await user.comparePassword(password);
        
        if (!isValidPassword) {
            console.log('Contraseña incorrecta');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        console.log('Contraseña válida');

        // Generar token
        console.log('🛠️ Generando JWT...');
        const token = generateToken(user);
        
        if (!token) {
            console.log('ERROR: No se pudo generar el token');
            return res.status(500).json({
                success: false,
                message: 'Error al generar token'
            });
        }

        console.log('JWT generado correctamente');
        console.log('Datos del token:', {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        });

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: user.toProfileJSON()
        });

        console.log('Respuesta enviada al cliente');

    } catch (error) {
        console.error('ERROR en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
});

// Verificar token
router.get('/verify', authenticateJWT, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Obtener perfil de usuario
router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json({
            success: true,
            user: user.toProfileJSON()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil',
            error: error.message
        });
    }
});

// Ruta de diagnóstico para ver usuarios (temporal)
router.get('/debug/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        console.log('👥 Usuarios en BD:', users);
        res.json(users);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});

export default router;