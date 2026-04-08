import { ZodError } from 'zod';

export class ApiHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

export const formatError = (error: unknown): { status: number; body: Record<string, unknown> } => {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: 'Invalid request payload',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }

  if (error instanceof ApiHttpError) {
    return {
      status: error.status,
      body: {
        error: error.message,
      },
    };
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  return {
    status: 500,
    body: { error: message },
  };
};

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
