import jwt from 'jsonwebtoken';

/** Papel gravado no token do cliente; o oficina-app só abre /acompanhamento com ele. */
export const PAPEL_CLIENTE = 'CLIENTE';

export interface TokenGerado {
  accessToken: string;
  expiresIn: number;
}

/**
 * Token do cliente no formato que o oficina-app espera:
 * `{ sub: clienteId, papel: 'CLIENTE' }`, HS256, assinado com o JWT_SECRET
 * compartilhado com a aplicação.
 */
export function assinarTokenDoCliente(
  clienteId: string,
  segredo: string,
  expiraEmSegundos: number,
): TokenGerado {
  const accessToken = jwt.sign({ sub: clienteId, papel: PAPEL_CLIENTE }, segredo, {
    algorithm: 'HS256',
    expiresIn: expiraEmSegundos,
  });
  return { accessToken, expiresIn: expiraEmSegundos };
}

export interface ConteudoVerificado {
  sub: string;
  papel: string;
}

/**
 * Confere assinatura e validade. Fixar o algoritmo impede o truque do
 * `alg: none` e a troca por outro algoritmo. Devolve null se não passar.
 */
export function verificarToken(
  token: string,
  segredo: string,
): ConteudoVerificado | null {
  try {
    const conteudo = jwt.verify(token, segredo, { algorithms: ['HS256'] });
    if (
      typeof conteudo !== 'object' ||
      typeof conteudo.sub !== 'string' ||
      typeof conteudo.papel !== 'string'
    ) {
      return null;
    }
    return { sub: conteudo.sub, papel: conteudo.papel };
  } catch {
    return null;
  }
}
