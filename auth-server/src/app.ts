import process from 'process';
import express from 'express';
import sign from './signer';
import fs from 'fs';
import cors from 'cors';
import loginRouter from './controllers/login';
import loginCheck from './middleware/loginCheck';

const app = express();
const KEY_PATH = process.env.KEY_PATH || 'pkey.pem';
const PKEY = fs.readFileSync(KEY_PATH);

app.use(cors());
app.use(express.json());
app.use(loginCheck);
app.use('/login', loginRouter);

app.post('/sign', async (req, res) => {
  const message = req.body.message;
  const signed = await sign(PKEY, message);
  res.json(signed);
});

export default app;
