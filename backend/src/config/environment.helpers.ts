import dotenv from 'dotenv';

export const initializeEnvironmentVariables = (): void => {
  const environment = process.env.NODE_ENV || 'development';
  dotenv.config({ 
    path: `.env.${environment}`,
    override: true 
  });
  dotenv.config(); // Also load default .env for shared variables
  validateEnv();
}

const validateEnv = (): void => {
  const requiredEnvVars = [
    'MONGODB_URI',
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
};