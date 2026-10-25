import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';

jest.mock('pg', () => ({ Pool: jest.fn() }));

const AMBIENTE = {
  JWT_SECRET: 'segredo-de-teste',
  JWT_EXPIRES_IN_SEGUNDOS: '900',
  DB_HOST: 'db.interno',
  DB_NAME: 'oficina',
  DB_USER: 'oficina_auth',
  DB_PASSWORD: 's',
  DB_SCHEMA: 'prod',
};

function evento(cpf: string): APIGatewayProxyEventV2 {
  return {
    body: JSON.stringify({ cpf }),
    requestContext: { requestId: 'req-1' },
  } as unknown as APIGatewayProxyEventV2;
}

/** O `handler` exportado monta as dependências a partir das variáveis da Lambda. */
describe('auth-cpf (handler montado pelo ambiente)', () => {
  const original = process.env;

  let Pool: jest.Mock;

  beforeEach(async () => {
    // Módulos novos a cada teste: o handler guarda as dependências montadas.
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    Pool = (await import('pg')).Pool as unknown as jest.Mock;
    Pool.mockImplementation(() => ({
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'cli-9' }] }),
    }));
  });

  afterEach(() => {
    process.env = original;
    jest.restoreAllMocks();
  });

  it('usa o schema e o segredo do ambiente', async () => {
    process.env = { ...original, ...AMBIENTE };
    const { handler } = await import('./handler');

    const resposta = await handler(evento('52998224725'));

    expect(resposta.statusCode).toBe(200);
    const { accessToken, expiresIn } = JSON.parse(resposta.body ?? '{}');
    expect(expiresIn).toBe(900);
    expect(jwt.verify(accessToken, 'segredo-de-teste')).toMatchObject({
      sub: 'cli-9',
      papel: 'CLIENTE',
    });
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ port: 5432, options: '-c search_path=prod' }),
    );
  });

  it('falha logo se faltar configuração', async () => {
    process.env = { ...original, ...AMBIENTE, DB_HOST: '' };
    const { handler } = await import('./handler');
    await expect(handler(evento('52998224725'))).rejects.toThrow('DB_HOST');
  });
});
