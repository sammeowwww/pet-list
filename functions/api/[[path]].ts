import { z } from 'zod';
import {
  currentUser,
  loginChallenge,
  requireUser,
  signIn,
  signOut,
  type Env,
} from '../../server/auth';
import {
  HttpError,
  json,
  readJson,
  requireSameOrigin,
} from '../../server/http';
import { commitCommand, settledSnapshot } from '../../server/planner';
import { commandSchema } from '../../src/domain/commands';

export const onRequest = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    const path = new URL(request.url).pathname;
    if (request.method === 'POST') requireSameOrigin(request);
    if (!env.DB)
      throw new HttpError(
        503,
        'Cloud sync is not configured yet. Your device data is safe.',
      );
    if (path === '/api/session' && request.method === 'GET') {
      const user = await currentUser(request, env);
      const challenge =
        env.GOOGLE_CLIENT_ID && !user
          ? await loginChallenge(request, env)
          : null;
      return json(
        {
          user,
          clientId: env.GOOGLE_CLIENT_ID ?? null,
          nonce: challenge?.nonce ?? null,
        },
        200,
        challenge ? { 'Set-Cookie': challenge.header } : {},
      );
    }
    if (path === '/api/login' && request.method === 'POST') {
      const { credential } = z
        .object({ credential: z.string().min(1).max(12000) })
        .parse(await readJson(request));
      const result = await signIn(request, env, credential);
      const response = json({ user: result.user });
      for (const value of result.cookies)
        response.headers.append('Set-Cookie', value);
      return response;
    }
    if (path === '/api/logout' && request.method === 'POST')
      return json({ ok: true }, 200, {
        'Set-Cookie': await signOut(request, env),
      });
    const user = await requireUser(request, env);
    if (path === '/api/planner' && request.method === 'GET')
      return json(await settledSnapshot(env.DB, user.id, Date.now()));
    if (path === '/api/sync' && request.method === 'POST') {
      const { commands } = z
        .object({ commands: z.array(commandSchema).min(1).max(50) })
        .parse(await readJson(request));
      const now = Date.now();
      const receipts = [];
      for (const command of commands)
        receipts.push(await commitCommand(env.DB, user.id, command, now));
      return json({
        ...(await settledSnapshot(env.DB, user.id, now)),
        receipts,
      });
    }
    throw new HttpError(404, 'Not found.');
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: 'This request contains invalid planner data.' },
        400,
      );
    console.error('PetList API request failed');
    return json(
      {
        error:
          'Cloud sync is temporarily unavailable. Your changes stay on this device.',
      },
      503,
    );
  }
};
