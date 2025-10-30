import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/authenticateJWT.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

console.log('🛠️ === INICIALIZANDO AUTH ROUTES ===');

// Ruta de diagnóstico del servidor
router.get('/debug', (req, res) => {
    console.log('🔧 DEBUG: Ruta de autenticación accesible');
    res.json({
        success: true,
        message: 'Servidor de autenticación funcionando',
        timestamp: new Date().toISOString()
    });
});

// Registro de usuario - VERSIÓN CORREGIDA
router.post('/register', async (req, res) => {
    try {
        console.log('📝 === INICIANDO REGISTRO ===');
        console.log('📦 Datos recibidos COMPLETOS:', req.body);

        // ⚠️ CORREGIDO: Incluir role en la destructuración
        const { username, email, password, role } = req.body;

        // Validaciones básicas
        if (!username || !email || !password) {
            console.log('❌ Faltan campos requeridos');
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // ⚠️ DIAGNÓSTICO DETALLADO DEL ROL
        console.log('🔍 DIAGNÓSTICO ROL:');
        console.log('   - Rol recibido:', role);
        console.log('   - Tipo de dato:', typeof role);
        console.log('   - Es "admin"?:', role === 'admin');
        console.log('   - Es "user"?:', role === 'user');
        console.log('   - Está definido?:', role !== undefined);
        console.log('   - Está vacío?:', !role);

        // ⚠️ DETERMINAR ROL FINAL - Lógica corregida
        let finalRole = 'user'; // Valor por defecto
        
        if (role && typeof role === 'string') {
            const cleanRole = role.trim().toLowerCase();
            if (cleanRole === 'admin') {
                finalRole = 'admin';
                console.log('🎭 ROL ASIGNADO: ADMINISTRADOR');
            } else {
                console.log('🎭 ROL ASIGNADO: USUARIO NORMAL');
            }
        } else {
            console.log('🎭 ROL POR DEFECTO: USUARIO (no se recibió rol válido)');
        }

        // Verificar si el usuario ya existe
        console.log('🔍 Verificando usuario existente...');
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            console.log('❌ Usuario ya existe:', existingUser.email);
            return res.status(400).json({
                success: false,
                message: 'El usuario o email ya está registrado'
            });
        }

        // ⚠️ CORREGIDO: Crear usuario con rol explícito
        console.log('👤 Creando nuevo usuario con rol:', finalRole);
        const user = new User({
            username,
            email,
            password,
            role: finalRole  // ⚠️ ASIGNACIÓN EXPLÍCITA DEL ROL
        });

        console.log('💾 Guardando usuario en BD...');
        await user.save();
        
        // Verificación después de guardar
        console.log('✅ Usuario guardado con ID:', user._id);
        console.log('🎭 Rol guardado en usuario:', user.role);
        
        // Verificación directa en BD
        const userFromDB = await User.findById(user._id);
        console.log('🔍 Verificación BD - Rol almacenado:', userFromDB.role);

        // Generar token
        console.log('🛠️ Generando JWT para nuevo usuario...');
        const token = generateToken(user);

        console.log('🎉 Registro exitoso');
        console.log('👤 Datos finales:', {
            username: user.username,
            email: user.email,
            role: user.role
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: user.toProfileJSON()
        });

    } catch (error) {
        console.error('💥 ERROR en registro:', error);
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
        console.log('🔐 === INICIANDO LOGIN ===');
        console.log('📧 Email recibido:', req.body.email);
        console.log('🔑 Password recibido:', req.body.password ? '***' : 'VACÍO');

        const { email, password } = req.body;

        if (!email || !password) {
            console.log('❌ Faltan credenciales');
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario
        console.log('🔍 Buscando usuario en BD...');
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        console.log('✅ Usuario encontrado:', user.username);
        console.log('🎭 ROL DEL USUARIO EN BD:', user.role); // ⚠️ DIAGNÓSTICO DEL ROL

        // Verificar contraseña
        console.log('🔑 Verificando contraseña...');
        const isValidPassword = await user.comparePassword(password);
        
        if (!isValidPassword) {
            console.log('❌ Contraseña incorrecta');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        console.log('✅ Contraseña válida');

        // Generar token
        console.log('🛠️ Generando JWT...');
        const token = generateToken(user);
        
        if (!token) {
            console.log('❌ ERROR: No se pudo generar el token');
            return res.status(500).json({
                success: false,
                message: 'Error al generar token'
            });
        }

        console.log('✅ JWT generado correctamente');
        console.log('👤 Datos en el token:', {
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

        console.log(' Login completado exitosamente');

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
    console.log('Token verificado correctamente para:', req.user.username);
    console.log('Rol del usuario verificado:', req.user.role);
    res.json({
        success: true,
        user: req.user
    });
});

// Obtener perfil de usuario
router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        console.log('Perfil solicitado para:', user.username);
        console.log('Rol en perfil:', user.role);
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
        console.log('Listando todos los usuarios...');
        const users = await User.find().select('-password');
        console.log('👥 Usuarios en BD:', users.length);
        
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
        console.log('DIAGNÓSTICO DETALLADO DE ROLES');
        
        const users = await User.find().select('username email role createdAt updatedAt');
        console.log('👥 Total usuarios en BD:', users.length);
        
        const roleCount = {
            admin: 0,
            user: 0
        };
        
        users.forEach(user => {
            roleCount[user.role]++;
            console.log(`    ${user.username} (${user.email})`);
            console.log(`      Rol: ${user.role}`);
            console.log(`      Creado: ${user.createdAt}`);
            console.log(`      Actualizado: ${user.updatedAt}`);
            console.log(`      ---`);
        });
        
        console.log('Estadísticas de roles:', roleCount);
        
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

        console.log( {
            username: user.username,
            email: user.email,
            role: user.role
        });

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