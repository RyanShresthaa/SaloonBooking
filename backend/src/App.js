import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/Swagger.js';
import routes from './routes/Index.js';
import { errorHandler, notFound } from './middlewares/ErrorMiddleware.js';
import requestLogger from './middlewares/RequestLogMiddleware.js';
import env from './config/Env.js';
import { getPublicMailStatus } from './utils/emailHelper.js';

const app = express();

app.use(helmet());

const developmentOrigins = [
  ...env.clientOrigins,
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

const allowedOrigins = new Set(
  env.nodeEnv === 'production' ? env.clientOrigins : developmentOrigins
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.use('/uploads', express.static('uploads'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mail: getPublicMailStatus(),
  });
});

app.use(notFound);

app.use(errorHandler);

export default app;