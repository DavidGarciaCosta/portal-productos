import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import cors from 'cors';

import { PORT, MONGODB_URI, JWT_SECRET } from './config.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { authenticateJWT } from './middleware/authenticateJWT.js';
import Message from './models/Message.js';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Ruta para obtener mensajes del chat - CORREGIDA
app.get('/api/chat/messages', authenticateJWT, async (req, res) => {
    try {
        const messages = await Message.find()
            .populate('userId', 'username role')
            .sort({ createdAt: -1 })
            .limit(100);
        
        const formattedMessages = messages.reverse().map(msg => {
            // Manejar caso donde el usuario fue eliminado
            if (!msg.userId) {
                return {
                    id: msg._id,
                    user: 'Usuario Eliminado',
                    userId: null,
                    text: msg.message,
                    color: '#999999',
                    time: new Date(msg.createdAt).toLocaleTimeString(),
                    timestamp: msg.createdAt,
                    type: 'user',
                    role: 'user'
                };
            }
            
            return {
                id: msg._id,
                user: msg.userId.username,
                userId: msg.userId._id,
                text: msg.message,
                color: getUserColor(msg.userId._id.toString()),
                time: new Date(msg.createdAt).toLocaleTimeString(),
                timestamp: msg.createdAt,
                type: 'user',
                role: msg.userId.role
            };
        });
        
        res.json({
            success: true,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('Error al cargar mensajes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar mensajes',
            error: error.message
        });
    }
});

// Ruta para obtener usuarios conectados
app.get('/api/chat/online-users', authenticateJWT, async (req, res) => {
    try {
        const onlineUsers = await User.find({ isOnline: true })
            .select('username role isOnline lastSeen');
        
        const formattedUsers = onlineUsers.map(user => ({
            id: user._id,
            name: user.username,
            role: user.role,
            status: 'online',
            color: getUserColor(user._id.toString())
        }));
        
        res.json({
            success: true,
            users: formattedUsers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cargar usuarios',
            error: error.message
        });
    }
});

// Endpoint para verificar estado del servidor
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Servir archivos HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Función para generar colores consistentes por usuario
function getUserColor(userId) {
    const colors = [
        '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C', 
        '#F39C12', '#E67E22', '#2ECC71', '#8E44AD',
        '#16A085', '#2980B9', '#C0392B', '#D35400'
    ];
    
    // Generar un índice basado en el ID del usuario para mantener el color consistente
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    
    return colors[hash % colors.length];
}

// Socket.IO middleware para autenticación
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Token no proporcionado'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Token inválido'));
        }
        
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;
        socket.userColor = getUserColor(decoded.userId);
        next();
    });
});

// Almacen de usuarios conectados
const connectedUsers = new Map();

// Manejar conexiones de Socket.IO
    io.on('connection', async (socket) => {
    console.log(`✅ Usuario conectado: ${socket.username} (ID: ${socket.userId})`);
    
    try {
        // Verificar que el usuario no esté ya conectado desde otra pestaña
        const existingConnection = connectedUsers.get(socket.userId);
        if (existingConnection) {
            // Desconectar la sesión anterior
            io.to(existingConnection.socketId).emit('force_disconnect', 'Nueva sesión detectada desde otra pestaña');
            io.to(existingConnection.socketId).disconnectSockets(true);
        }
        
        // Guardar usuario conectado
        const userInfo = {
            id: socket.userId,
            name: socket.username,
            role: socket.role,
            color: socket.userColor,
            socketId: socket.id,
            lastActivity: new Date()
        };
        
        connectedUsers.set(socket.userId, userInfo);

        // Actualizar estado en BD
        await User.findByIdAndUpdate(socket.userId, { 
            isOnline: true,
            lastSeen: new Date()
        });

        // Emitir actualización de usuarios conectados
        const onlineUsers = Array.from(connectedUsers.values());
        io.emit('user count', onlineUsers.length);
        io.emit('users update', onlineUsers);

        // Enviar historial de mensajes al nuevo usuario - CORREGIDO
        try {
            const messages = await Message.find()
                .populate('userId', 'username role')
                .sort({ createdAt: -1 })
                .limit(100);
            
            const formattedMessages = messages.reverse().map(msg => {
                // Manejar caso donde el usuario fue eliminado
                if (!msg.userId) {
                    return {
                        id: msg._id,
                        user: 'Usuario Eliminado',
                        userId: null,
                        text: msg.message,
                        color: '#999999',
                        time: new Date(msg.createdAt).toLocaleTimeString(),
                        timestamp: msg.createdAt,
                        type: 'user',
                        role: 'user'
                    };
                }
                
                return {
                    id: msg._id,
                    user: msg.userId.username,
                    userId: msg.userId._id,
                    text: msg.message,
                    color: getUserColor(msg.userId._id.toString()),
                    time: new Date(msg.createdAt).toLocaleTimeString(),
                    timestamp: msg.createdAt,
                    type: 'user',
                    role: msg.userId.role
                };
            });
            
            socket.emit('message history', formattedMessages);
        } catch (error) {
            console.error('Error cargando mensajes anteriores:', error);
        }

        // Notificar que un usuario se conectó
        io.emit('chat message', {
            user: 'Sistema',
            text: `🟢 ${socket.username} se ha conectado`,
            color: '#00cc88',
            time: new Date().toLocaleTimeString(),
            type: 'system'
        });
        
        // Manejar mensajes de chat
        socket.on('chat message', async (msg) => {
            try {
                if (!msg || msg.trim().length === 0) return;

                const messageData = {
                    user: socket.username,
                    userId: socket.userId,
                    text: msg.trim().substring(0, 500),
                    color: socket.userColor,
                    time: new Date().toLocaleTimeString(),
                    timestamp: Date.now(),
                    type: 'user',
                    role: socket.role
                };

                // Guardar mensaje en la base de datos
                const newMessage = new Message({
                    user: socket.username,
                    message: msg.trim().substring(0, 500),
                    userId: socket.userId
                });
                
                await newMessage.save();
                messageData.id = newMessage._id;

                // Emitir mensaje a todos los clientes
                io.emit('chat message', messageData);
                
                console.log(`💬 Mensaje de ${socket.username}: ${msg.trim()}`);
            } catch (error) {
                console.error('Error guardando mensaje:', error);
                socket.emit('chat error', 'Error al enviar mensaje');
            }
        });

        // Manejar typing indicators
        socket.on('typing', () => {
            socket.broadcast.emit('typing', { 
                user: socket.username, 
                color: socket.userColor 
            });
        });

        socket.on('stop typing', () => {
            socket.broadcast.emit('stop typing', socket.username);
        });

        // Manejar desconexión
        socket.on('disconnect', async () => {
            console.log(`❌ Usuario desconectado: ${socket.username} (${socket.userId})`);
            
            connectedUsers.delete(socket.userId);

            try {
                // Actualizar estado en la base de datos
                await User.findByIdAndUpdate(socket.userId, { 
                    isOnline: false,
                    lastSeen: new Date()
                });
                
                // Emitir actualizaciones
                const onlineUsers = Array.from(connectedUsers.values());
                io.emit('user count', onlineUsers.length);
                io.emit('users update', onlineUsers);

                // Notificar desconexión
                io.emit('chat message', {
                    user: 'Sistema',
                    text: `🔴 ${socket.username} se ha desconectado`,
                    color: '#ff3366',
                    time: new Date().toLocaleTimeString(),
                    type: 'system'
                });

                console.log(`👥 Usuarios conectados restantes: ${onlineUsers.length}`);
            } catch (error) {
                console.error('Error actualizando estado de desconexión:', error);
            }
        });

        // Manejar errores
        socket.on('error', (error) => {
            console.error('Error de Socket:', error);
        });

    } catch (error) {
        console.error('Error en conexión de socket:', error);
        socket.emit('connection error', 'Error en la conexión');
    }
});

// Limpiar sesiones inactivas cada 5 minutos
setInterval(async () => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        let cleanedCount = 0;
        
        for (const [userId, userInfo] of connectedUsers.entries()) {
            if (userInfo.lastActivity < fiveMinutesAgo) {
                console.log(`🧹 Limpiando sesión inactiva: ${userInfo.name}`);
                connectedUsers.delete(userId);
                cleanedCount++;
                
                // Actualizar estado en BD
                await User.findByIdAndUpdate(userId, { 
                    isOnline: false 
                });
            }
        }
        
        if (cleanedCount > 0) {
            const onlineUsers = Array.from(connectedUsers.values());
            io.emit('users update', onlineUsers);
            io.emit('user count', onlineUsers.length);
        }
    } catch (error) {
        console.error('Error en limpieza de sesiones:', error);
    }
}, 5 * 60 * 1000);

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
    });
});

// Para cualquier otra ruta, servir el index.html (SPA)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Conectar a MongoDB y iniciar servidor
async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Crear usuario admin por defecto si no existe
        await createDefaultAdmin();
        
        httpServer.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Crear usuario admin por defecto
async function createDefaultAdmin() {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            const adminUser = new User({
                username: 'admin',
                email: 'admin@portal.com',
                password: 'admin123',
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('👤 Usuario admin creado por defecto');
        } else {
            console.log('👤 Usuario admin ya existe');
        }
    } catch (error) {
        console.error('❌ Error creando usuario admin:', error);
    }
}

// Manejo graceful de cierre
process.on('SIGINT', async () => {
    console.log('\n Cerrando servidor...');
    
    try {
        await User.updateMany(
            { isOnline: true },
            { 
                isOnline: false,
                lastSeen: new Date()
            }
        );
        console.log('Estados de usuario actualizados');
    } catch (error) {
        console.error('Error actualizando estados de usuario:', error);
    }
    
    process.exit(0);
});

startServer();