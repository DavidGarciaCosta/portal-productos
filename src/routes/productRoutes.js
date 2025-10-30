import express from 'express';
import Product from '../models/Product.js';
import { authenticateJWT, requireAdmin } from '../middleware/authenticateJWT.js';

const router = express.Router();

// Obtener todos los productos (público)
router.get('/', async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        
        let filter = { isActive: true };
        
        // Filtros opcionales
        if (category) {
            filter.category = new RegExp(category, 'i');
        }
        
        if (search) {
            filter.$text = { $search: search };
        }
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: {
                path: 'createdBy',
                select: 'username'
            }
        };

        // Usar paginación simple
        const skip = (options.page - 1) * options.limit;
        const products = await Product.find(filter)
            .populate('createdBy', 'username')
            .sort(options.sort)
            .skip(skip)
            .limit(options.limit);
            
        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            products,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                pages: Math.ceil(total / options.limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos',
            error: error.message
        });
    }
});

// Obtener un producto por ID (público)
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'username');
            
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener producto',
            error: error.message
        });
    }
});

// Crear producto (solo admin)
router.post('/', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category, image, stock } = req.body;

        // Validaciones
        if (!name || !description || !price || !category || stock === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos requeridos deben ser proporcionados'
            });
        }

        const product = new Product({
            name,
            description,
            price: parseFloat(price),
            category,
            image: image || '',
            stock: parseInt(stock),
            createdBy: req.user.userId
        });

        await product.save();
        await product.populate('createdBy', 'username');

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            product
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear producto',
            error: error.message
        });
    }
});

// Actualizar producto (solo admin)
router.put('/:id', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category, image, stock } = req.body;

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                price: parseFloat(price),
                category,
                image,
                stock: parseInt(stock)
            },
            { 
                new: true, 
                runValidators: true 
            }
        ).populate('createdBy', 'username');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            product
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar producto',
            error: error.message
        });
    }
});

// Eliminar producto (solo admin)
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar producto',
            error: error.message
        });
    }
});

export default router;