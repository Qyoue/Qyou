import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
});

app.listen(port, () => {
  console.log(`[api]: Server is running at http://localhost:${port}`);
});
