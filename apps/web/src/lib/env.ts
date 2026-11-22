export function validateWebEnvironment(): { apiUrl: string } {
  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (isProduction && !apiUrl) {
    throw new Error(
      'MissingRequiredEnv: NEXT_PUBLIC_API_URL must be defined for production builds of @qyou/web.'
    );
  }

  return {
    apiUrl: apiUrl ?? 'http://localhost:4000',
  };
}

export const { apiUrl: API_URL } = validateWebEnvironment();
