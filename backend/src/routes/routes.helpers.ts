import { Express } from 'express';

// Import routes
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import projectRoutes from './project.routes';

export const initializeRoutes = (app: Express) => {
    app.get('/', (_req, res) => {
        res.json({ message: 'Welcome to Time Tracking API' });
    });

    app.use('/auth', authRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/projects', projectRoutes);
};