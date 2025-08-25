const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Task = require('../models/Task');
const database = require('../database/database');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Winston logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

// Simple in-memory cache for task lists
const taskListCache = new Map();
function getCacheKey(userId, query) {
    return userId + ':' + JSON.stringify(query);
}

// Rate limiting por usuário
const userRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por janela
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for user ${req.user?.id || req.ip}`);
        res.status(429).json({ success: false, message: 'Limite de requisições atingido' });
    }
});

router.use(userRateLimiter);

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar tarefas com paginação, cache, filtros avançados
router.get('/', async (req, res) => {
    const startTime = process.hrtime();
    try {
        const { completed, priority, page = 1, limit = 10, startDate, endDate, category, tags } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let sql = 'SELECT * FROM tasks WHERE userId = ?';
        const params = [req.user.id];

        if (completed !== undefined) {
            sql += ' AND completed = ?';
            params.push(completed === 'true' ? 1 : 0);
        }
        if (priority) {
            sql += ' AND priority = ?';
            params.push(priority);
        }
        if (startDate) {
            sql += ' AND createdAt >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND createdAt <= ?';
            params.push(endDate);
        }
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (tags) {
            // tags: string separada por vírgula
            const tagList = tags.split(',').map(t => t.trim());
            tagList.forEach(tag => {
                sql += ' AND tags LIKE ?';
                params.push(`%${tag}%`);
            });
        }

        sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        // Cache key
        const cacheKey = getCacheKey(req.user.id, req.query);
        if (taskListCache.has(cacheKey)) {
            logger.info(`Cache hit for user ${req.user.id}`);
            const elapsed = process.hrtime(startTime);
            logger.info(`GET /tasks (cached) - user ${req.user.id} - ${elapsed[0] * 1000 + elapsed[1] / 1e6} ms`);
            return res.json({
                success: true,
                cached: true,
                data: taskListCache.get(cacheKey)
            });
        }

        const rows = await database.all(sql, params);
        const tasks = rows.map(row => new Task({ ...row, completed: row.completed === 1 }));

        // Cache result
        taskListCache.set(cacheKey, tasks.map(task => task.toJSON()));

        const elapsed = process.hrtime(startTime);
        logger.info(`GET /tasks - user ${req.user.id} - ${elapsed[0] * 1000 + elapsed[1] / 1e6} ms`);
        res.json({
            success: true,
            data: tasks.map(task => task.toJSON()),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        logger.error(`Error listing tasks for user ${req.user.id}: ${error.message}`);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Criar tarefa
router.post('/', validate('task'), async (req, res) => {
    const startTime = process.hrtime();
    try {
        const taskData = { 
            id: uuidv4(), 
            ...req.body, 
            userId: req.user.id 
        };
        
        const task = new Task(taskData);
        const validation = task.validate();
        
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: validation.errors
            });
        }

        await database.run(
            'INSERT INTO tasks (id, title, description, priority, userId) VALUES (?, ?, ?, ?, ?)',
            [task.id, task.title, task.description, task.priority, task.userId]
        );

        const elapsed = process.hrtime(startTime);
        logger.info(`POST /tasks - user ${req.user.id} - ${elapsed[0] * 1000 + elapsed[1] / 1e6} ms`);
        res.status(201).json({
            success: true,
            message: 'Tarefa criada com sucesso',
            data: task.toJSON()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Estatísticas (deve vir antes das rotas com parâmetros)
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await database.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending
            FROM tasks WHERE userId = ?
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                ...stats,
                completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Buscar tarefa por ID
router.get('/:id', async (req, res) => {
    const startTime = process.hrtime();
    try {
        const row = await database.get(
            'SELECT * FROM tasks WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }

        const task = new Task({...row, completed: row.completed === 1});
        const elapsed = process.hrtime(startTime);
        logger.info(`GET /tasks/:id - user ${req.user.id} - ${elapsed[0] * 1000 + elapsed[1] / 1e6} ms`);
        res.json({
            success: true,
            data: task.toJSON()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Atualizar tarefa
router.put('/:id', async (req, res) => {
    const startTime = process.hrtime();
    try {
        const { title, description, completed, priority } = req.body;
        
        const result = await database.run(
            'UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ? WHERE id = ? AND userId = ?',
            [title, description, completed ? 1 : 0, priority, req.params.id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }

        const updatedRow = await database.get(
            'SELECT * FROM tasks WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        const task = new Task({...updatedRow, completed: updatedRow.completed === 1});
        const elapsed = process.hrtime(startTime);
        logger.info(`PUT /tasks/:id - user ${req.user.id} - ${elapsed[0] * 1000 + elapsed[1] / 1e6} ms`);
        res.json({
            success: true,
            message: 'Tarefa atualizada com sucesso',
            data: task.toJSON()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Deletar tarefa
router.delete('/:id', async (req, res) => {
    const startTime = process.hrtime();
    try {
        const result = await database.run(
            'DELETE FROM tasks WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }

        const elapsed = process.hrtime(startTime);
        logger.info(`DELETE /tasks/:id - user ${req.user.id} - ${elapsed[0] * 1000 + elapsed[1] / 1e6} ms`);
        res.json({
            success: true,
            message: 'Tarefa deletada com sucesso'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

module.exports = router;