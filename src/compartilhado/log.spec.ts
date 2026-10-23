import { log } from './log';

describe('log', () => {
  afterEach(() => jest.restoreAllMocks());

  it('escreve uma linha de JSON com nível, mensagem e campos', () => {
    const saida = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    log('info', 'ok', { requestId: 'r1' });
    expect(JSON.parse(saida.mock.calls[0][0])).toMatchObject({
      nivel: 'info',
      mensagem: 'ok',
      requestId: 'r1',
    });
  });

  it('erros vão para o console.error', () => {
    const saida = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    log('error', 'falhou');
    expect(JSON.parse(saida.mock.calls[0][0]).nivel).toBe('error');
  });
});
