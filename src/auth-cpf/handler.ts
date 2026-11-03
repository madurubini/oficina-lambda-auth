import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { normalizarCpf } from '../compartilhado/cpf';
import { erro, json } from '../compartilhado/http';
import { TokenGerado, assinarTokenDoCliente } from '../compartilhado/jwt';
import { log } from '../compartilhado/log';
import { Clientes, ClientesPostgres } from './clientes';

export interface Dependencias {
  clientes: Clientes;
  gerarToken: (clienteId: string) => TokenGerado;
}

/**
 * POST /auth/cpf com `{ "cpf": "529.982.247-25" }`.
 *
 * 1. Valida o CPF (formato e dígitos)                → 400 se inválido
 * 2. Procura cliente pessoa física e ativo no banco  → 401 se não houver
 * 3. Devolve o token do cliente `{ accessToken, expiresIn }`, no mesmo
 *    formato do login do gestor no oficina-app.
 *
 * "Não cadastrado" e "inativo" dão a mesma resposta de propósito: assim a rota
 * não serve para descobrir quais CPFs são clientes da oficina.
 */
export function criarHandler(deps: Dependencias) {
  return async (
    evento: APIGatewayProxyEventV2,
    contexto?: Context,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const requestId =
      evento.requestContext?.requestId ?? contexto?.awsRequestId;

    let corpo: { cpf?: unknown };
    try {
      const bruto = evento.isBase64Encoded
        ? Buffer.from(evento.body ?? '', 'base64').toString('utf8')
        : (evento.body ?? '');
      corpo = JSON.parse(bruto || '{}');
    } catch {
      return erro(400, 'VALIDACAO', 'Corpo da requisição não é um JSON válido.');
    }

    const cpf = normalizarCpf(corpo?.cpf);
    if (!cpf) {
      log('info', 'CPF inválido', { requestId });
      return erro(400, 'VALIDACAO', 'CPF inválido.', { campo: 'cpf' });
    }

    try {
      const cliente = await deps.clientes.buscarAtivoPorCpf(cpf);
      if (!cliente) {
        log('info', 'CPF sem cliente ativo', { requestId });
        return erro(
          401,
          'NAO_AUTENTICADO',
          'CPF não cadastrado ou cliente inativo.',
        );
      }
      log('info', 'Cliente autenticado por CPF', {
        requestId,
        clienteId: cliente.id,
      });
      return json(200, deps.gerarToken(cliente.id));
    } catch (falha) {
      // O detalhe vai só para o log; quem chamou recebe uma mensagem genérica.
      log('error', 'Falha ao consultar o cliente', {
        requestId,
        erro: falha instanceof Error ? falha.message : String(falha),
      });
      return erro(500, 'ERRO_INTERNO', 'Não foi possível autenticar agora.');
    }
  };
}

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não configurada.`);
  }
  return valor;
}

/** Dependências reais, montadas uma vez por container (fora do handler). */
function dependenciasDoAmbiente(): Dependencias {
  const segredo = obrigatoria('JWT_SECRET');
  const expiraEm = Number(process.env.JWT_EXPIRES_IN_SEGUNDOS ?? 3600);
  if (!Number.isInteger(expiraEm) || expiraEm <= 0) {
    throw new Error('JWT_EXPIRES_IN_SEGUNDOS deve ser um número inteiro de segundos.');
  }
  return {
    clientes: new ClientesPostgres({
      host: obrigatoria('DB_HOST'),
      porta: Number(process.env.DB_PORT ?? 5432),
      banco: obrigatoria('DB_NAME'),
      usuario: obrigatoria('DB_USER'),
      senha: obrigatoria('DB_PASSWORD'),
      schema: obrigatoria('DB_SCHEMA'),
    }),
    gerarToken: (clienteId) =>
      assinarTokenDoCliente(clienteId, segredo, expiraEm),
  };
}

let handlerReal: ReturnType<typeof criarHandler> | undefined;

/** Ponto de entrada da Lambda (template.yaml → Handler: handler.handler). */
export const handler = async (
  evento: APIGatewayProxyEventV2,
  contexto?: Context,
): Promise<APIGatewayProxyStructuredResultV2> => {
  handlerReal ??= criarHandler(dependenciasDoAmbiente());
  return handlerReal(evento, contexto);
};
