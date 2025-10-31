import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/authenticateJWT.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();


        // Ruta de diagnóstico del servidor
        router.get('/debug', (req, res) => {
            res.json({
        success: true,
        message: 'Servidor de autenticación funcionando',
        timestamp: new Date().toISOString()
            });
        });

        // Registro de usuario
        router.post('/register', async (req, res) => {
         try {
            console.log('INICIANDO REGISTRO');
            console.log('Datos recibidos COMPLETOS:', req.body);

        // Incluir role en la destructuración
        const { username, email, password, role } = req.body;

        // Validaciones básicas
        if (!username || !email || !password) {
            console.log('❌ Faltan campos requeridos');
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Rol Final
        let finalRole = 'user'; // Valor por defecto
        
        if (role && typeof role === 'string') {
            const cleanRole = role.trim().toLowerCase();
            if (cleanRole === 'admin') {
                finalRole = 'admin';
                console.log('ROL ASIGNADO: ADMINISTRADOR');
            } else {
                console.log('ROL ASIGNADO: USUARIO NORMAL');
            }
        } else {
            console.log('🎭 ROL POR DEFECTO: USUARIO (no se recibió rol válido)');
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

        // ⚠️ CORREGIDO: Crear usuario con rol explícito
        const user = new User({
            username,
            email,
            password,
            role: finalRole 
        });
        await user.save();
        
        // Verificación directa en BD
        const userFromDB = await User.findById(user._id);

        // Generar token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: user.toProfileJSON()
        });

    } catch (error) {
        console.error('ERROR en registro:', error);
        console.error('🔍 Detalles del error:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
});

// Login de usuario - Con diagnóstico mejorado
router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }


        // Verificar contraseña
        const isValidPassword = await user.comparePassword(password);
        
        if (!isValidPassword) {
            console.log('❌ Contraseña incorrecta');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generar token
        const token = generateToken(user);
        
        if (!token) {
            console.log('❌ ERROR: No se pudo generar el token');
            return res.status(500).json({
                success: false,
                message: 'Error al generar token'
            });
        }

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: user.toProfileJSON()
        });

    } catch (error) {
        console.error('ERROR en login:', error);
        console.error(' Stack trace:', error.stack);
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
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil',
            error: error.message
        });
    }
});

// Diagnóstico: Listar todos los usuarios
router.get('/debug/users', async (req, res) => {
    try {

        const users = await User.find().select('-password');
        
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
        });
        
        res.json({
            success: true,
            count: users.length,
            users: users
        });
    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar usuarios',
            error: error.message
        });
    }
});

// Diagnóstico completo de roles
router.get('/debug/roles-detailed', async (req, res) => {
    try {
        
        const users = await User.find().select('username email role createdAt updatedAt');
        
        const roleCount = {
            admin: 0,
            user: 0
        };
        
        
        res.json({
            success: true,
            totalUsers: users.length,
            roleCount,
            users: users
        });
        
    } catch (error) {
        console.error('Error en diagnóstico detallado:', error);
        res.status(500).json({
            success: false,
            message: 'Error en diagnóstico',
            error: error.message
        });
    }
});

// Ruta para crear un usuario admin manualmente (solo para desarrollo)
router.post('/debug/create-admin', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Verificar si ya existe
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya existe'
            });
        }

        // Crear usuario admin
        const user = new User({
            username,
            email,
            password,
            role: 'admin' 
        });

        await user.save();

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Usuario administrador creado exitosamente',
            token,
            user: user.toProfileJSON()
        });

    } catch (error) {
        console.error('Error creando admin manual:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando usuario admin',
            error: error.message
        });
    }
});

export default router;