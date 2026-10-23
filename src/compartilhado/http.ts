import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

/** Corpo de sucesso em JSON. */
export function json(
  statusCode: number,
  corpo: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  };
}

/** Mesmo envelope de erro do oficina-app: `{ erro: { codigo, mensagem, detalhes } }`. */
export function erro(
  statusCode: number,
  codigo: string,
  mensagem: string,
  detalhes: unknown = null,
): APIGatewayProxyStructuredResultV2 {
  return json(statusCode, { erro: { codigo, mensagem, detalhes } });
}
