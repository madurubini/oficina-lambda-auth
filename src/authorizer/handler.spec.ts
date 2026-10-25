import type { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { criarAutorizador } from './handler';

const SEGREDO = 'segredo-de-teste';

function evento(authorization?: string): APIGatewayRequestAuthorizerEventV2 {
  return {
    headers: authorization ? { authorization } : {},
    routeKey: 'ANY /api/v1/{proxy+}',
    requestContext: { requestId: 'req-1' },
  } as unknown as APIGatewayRequestAuthorizerEventV2;
}

describe('authorizer', () => {
  const autorizar = criarAutorizador(SEGREDO);

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('libera o token do cliente e repassa sub e papel', async () => {
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, SEGREDO);
    await expect(autorizar(evento(`Bearer ${token}`))).resolves.toEqual({
      isAuthorized: true,
      context: { sub: 'cli-1', papel: 'CLIENTE' },
    });
  });

  it('libera o token do gestor', async () => {
    const token = jwt.sign({ sub: 'u-1', username: 'gestor', papel: 'GESTOR' }, SEGREDO);
    const resultado = await autorizar(evento(`Bearer ${token}`));
    expect(resultado.isAuthorized).toBe(true);
  });

  it('nega token com outro segredo', async () => {
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, 'outro');
    const resultado = await autorizar(evento(`Bearer ${token}`));
    expect(resultado.isAuthorized).toBe(false);
  });

  it('nega cabeçalho que não é Bearer', async () => {
    const resultado = await autorizar(evento('Basic dXNlcjpzZW5oYQ=='));
    expect(resultado.isAuthorized).toBe(false);
  });

  it('nega quando não há cabeçalho', async () => {
    const resultado = await autorizar(evento());
    expect(resultado.isAuthorized).toBe(false);
  });

  it('lê o token do identitySource quando o cabeçalho não vem em headers', async () => {
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, SEGREDO);
    const ev = { ...evento(), identitySource: [`Bearer ${token}`] };
    const resultado = await autorizar(ev as APIGatewayRequestAuthorizerEventV2);
    expect(resultado.isAuthorized).toBe(true);
  });
});

describe('authorizer (handler montado pelo ambiente)', () => {
  const original = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = original;
    jest.restoreAllMocks();
  });

  it('usa o JWT_SECRET do ambiente', async () => {
    process.env = { ...original, JWT_SECRET: SEGREDO };
    const { handler } = await import('./handler');
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, SEGREDO);
    const resultado = await handler(evento(`Bearer ${token}`));
    expect(resultado.isAuthorized).toBe(true);
  });

  it('falha logo se o JWT_SECRET não estiver configurado', async () => {
    process.env = { ...original, JWT_SECRET: '' };
    const { handler } = await import('./handler');
    await expect(handler(evento('Bearer x'))).rejects.toThrow('JWT_SECRET');
  });
});
