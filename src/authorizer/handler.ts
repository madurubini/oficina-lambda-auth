import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from 'aws-lambda';
import { verificarToken } from '../compartilhado/jwt';
import { log } from '../compartilhado/log';

type Resultado = APIGatewaySimpleAuthorizerWithContextResult<{
  sub: string;
  papel: string;
}>;

const NEGADO = { isAuthorized: false, context: { sub: '', papel: '' } };

/**
 * Lambda Authorizer do API Gateway (HTTP API, resposta simples).
 *
 * Só responde "este token é legítimo?": assinatura com o JWT_SECRET e validade.
 * Aceita tanto o token do gestor (login no app) quanto o do cliente (login por
 * CPF). Qual rota cada um pode usar continua sendo decisão do oficina-app.
 *
 * Requisição sem o cabeçalho Authorization nem chega aqui: o próprio Gateway
 * responde 401. Token inválido → isAuthorized false → o Gateway responde 403.
 */
export function criarAutorizador(segredo: string) {
  return async (evento: APIGatewayRequestAuthorizerEventV2): Promise<Resultado> => {
    const cabecalho =
      evento.headers?.authorization ?? evento.identitySource?.[0] ?? '';
    const token = cabecalho.startsWith('Bearer ')
      ? cabecalho.slice('Bearer '.length)
      : '';

    const conteudo = token ? verificarToken(token, segredo) : null;
    if (!conteudo) {
      log('info', 'Token recusado no Gateway', {
        requestId: evento.requestContext?.requestId,
        rota: evento.routeKey,
      });
      return NEGADO;
    }
    return { isAuthorized: true, context: conteudo };
  };
}

let autorizador: ReturnType<typeof criarAutorizador> | undefined;

/** Ponto de entrada da Lambda (template.yaml → Handler: handler.handler). */
export const handler = async (
  evento: APIGatewayRequestAuthorizerEventV2,
): Promise<Resultado> => {
  if (!autorizador) {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw new Error('Variável de ambiente JWT_SECRET não configurada.');
    }
    autorizador = criarAutorizador(segredo);
  }
  return autorizador(evento);
};
