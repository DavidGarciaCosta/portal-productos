import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: [true, 'El mensaje no puede estar vacío'],
        trim: true,
        maxlength: [500, 'El mensaje no puede exceder 500 caracteres']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    room: {
        type: String,
        default: 'general'
    }
}, {
    timestamps: true
});

// Índices para consultas
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ userId: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model('Message', messageSchema);