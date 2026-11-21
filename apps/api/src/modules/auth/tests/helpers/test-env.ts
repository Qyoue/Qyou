process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/qyou_test';
process.env.JWT_SECRET ??= 'test-secret-at-least-32-characters-long-!!';
process.env.JWT_EXPIRES_IN ??= '1h';
