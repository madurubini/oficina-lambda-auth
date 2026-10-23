/**
 * Log em uma linha de JSON: o CloudWatch (e, depois, o New Relic) consegue
 * filtrar por campo. O `requestId` liga a linha à requisição do Gateway.
 */
export function log(
  nivel: 'info' | 'warn' | 'error',
  mensagem: string,
  campos: Record<string, unknown> = {},
): void {
  const linha = JSON.stringify({
    nivel,
    mensagem,
    em: new Date().toISOString(),
    ...campos,
  });
  if (nivel === 'error') {
    console.error(linha);
  } else {
    console.log(linha);
  }
}
