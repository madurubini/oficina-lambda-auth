import jwt from 'jsonwebtoken';
import { assinarTokenDoCliente, verificarToken } from './jwt';

const SEGREDO = 'segredo-de-teste';

describe('assinarTokenDoCliente', () => {
  it('gera o token no formato que o oficina-app espera', () => {
    const { accessToken, expiresIn } = assinarTokenDoCliente('cli-1', SEGREDO, 3600);
    const conteudo = jwt.verify(accessToken, SEGREDO) as jwt.JwtPayload;
    expect(conteudo.sub).toBe('cli-1');
    expect(conteudo.papel).toBe('CLIENTE');
    expect(conteudo.exp! - conteudo.iat!).toBe(3600);
    expect(expiresIn).toBe(3600);
    expect(jwt.decode(accessToken, { complete: true })?.header.alg).toBe('HS256');
  });
});

describe('verificarToken', () => {
  it('aceita token do cliente', () => {
    const { accessToken } = assinarTokenDoCliente('cli-1', SEGREDO, 60);
    expect(verificarToken(accessToken, SEGREDO)).toEqual({
      sub: 'cli-1',
      papel: 'CLIENTE',
    });
  });

  it('aceita token do gestor (login no app)', () => {
    const token = jwt.sign({ sub: 'u-1', username: 'gestor', papel: 'GESTOR' }, SEGREDO);
    expect(verificarToken(token, SEGREDO)).toEqual({ sub: 'u-1', papel: 'GESTOR' });
  });

  it('recusa token assinado com outro segredo', () => {
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, 'outro');
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa token expirado', () => {
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, SEGREDO, { expiresIn: -10 });
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa token sem assinatura (alg none)', () => {
    const token = jwt.sign({ sub: 'cli-1', papel: 'CLIENTE' }, '', { algorithm: 'none' });
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa token sem papel', () => {
    const token = jwt.sign({ sub: 'cli-1' }, SEGREDO);
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa texto que não é JWT', () => {
    expect(verificarToken('nao-e-jwt', SEGREDO)).toBeNull();
  });
});
