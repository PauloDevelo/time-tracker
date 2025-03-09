import { Express } from 'express';

// Import routes
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import timeEntryRoutes from './time-entry.routes';
import reportRoutes from './report.routes';
import userSettingsRoutes from './user-settings.routes';

export const initializeRoutes = (app: Express) => {
    app.get('/', (_req, res) => {
        res.json({ message: 'Welcome to Time Tracking API' });
    });

    app.use('/auth', authRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/time-entries', timeEntryRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/user-settings', userSettingsRoutes);
};