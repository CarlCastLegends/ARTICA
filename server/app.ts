import express from 'express';
import { api } from './routes';

const app = express();
app.disable('x-powered-by');
app.use('/api', api);

export default app;
