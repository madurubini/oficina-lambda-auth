import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Clientes } from './clientes';
import { criarHandler } from './handler';

function evento(body: unknown, base64 = false): APIGatewayProxyEventV2 {
  const texto = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    body: base64 ? Buffer.from(texto).toString('base64') : texto,
    isBase64Encoded: base64,
    requestContext: { requestId: 'req-1' },
  } as unknown as APIGatewayProxyEventV2;
}

function corpo(resposta: { body?: string }) {
  return JSON.parse(resposta.body ?? '{}');
}

describe('auth-cpf', () => {
  let clientes: jest.Mocked<Clientes>;
  let gerarToken: jest.Mock;
  let handler: ReturnType<typeof criarHandler>;

  beforeEach(() => {
    clientes = { buscarAtivoPorCpf: jest.fn() };
    gerarToken = jest.fn().mockReturnValue({ accessToken: 'tok', expiresIn: 3600 });
    handler = criarHandler({ clientes, gerarToken });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('200 com o token quando o CPF é de um cliente ativo', async () => {
    clientes.buscarAtivoPorCpf.mockResolvedValue({ id: 'cli-1' });
    const resposta = await handler(evento({ cpf: '529.982.247-25' }));
    expect(resposta.statusCode).toBe(200);
    expect(corpo(resposta)).toEqual({ accessToken: 'tok', expiresIn: 3600 });
    // Busca pelos dígitos, que é como o app grava o documento.
    expect(clientes.buscarAtivoPorCpf).toHaveBeenCalledWith('52998224725');
    expect(gerarToken).toHaveBeenCalledWith('cli-1');
  });

  it('aceita o corpo em base64 (como o Gateway às vezes entrega)', async () => {
    clientes.buscarAtivoPorCpf.mockResolvedValue({ id: 'cli-1' });
    const resposta = await handler(evento({ cpf: '52998224725' }, true));
    expect(resposta.statusCode).toBe(200);
  });

  it('400 quando o CPF é inválido, sem consultar o banco', async () => {
    const resposta = await handler(evento({ cpf: '123.456.789-00' }));
    expect(resposta.statusCode).toBe(400);
    expect(corpo(resposta).erro.codigo).toBe('VALIDACAO');
    expect(clientes.buscarAtivoPorCpf).not.toHaveBeenCalled();
  });

  it('400 quando falta o CPF', async () => {
    const resposta = await handler(evento({}));
    expect(resposta.statusCode).toBe(400);
  });

  it('400 quando não vem corpo', async () => {
    const resposta = await handler({
      requestContext: { requestId: 'req-1' },
    } as unknown as APIGatewayProxyEventV2);
    expect(resposta.statusCode).toBe(400);
  });

  it('400 quando o corpo não é JSON', async () => {
    const resposta = await handler(evento('cpf=52998224725'));
    expect(resposta.statusCode).toBe(400);
    expect(corpo(resposta).erro.codigo).toBe('VALIDACAO');
  });

  it('401 quando não há cliente ativo com o CPF (não diz se existe)', async () => {
    clientes.buscarAtivoPorCpf.mockResolvedValue(null);
    const resposta = await handler(evento({ cpf: '52998224725' }));
    expect(resposta.statusCode).toBe(401);
    expect(corpo(resposta).erro).toEqual({
      codigo: 'NAO_AUTENTICADO',
      mensagem: 'CPF não cadastrado ou cliente inativo.',
      detalhes: null,
    });
    expect(gerarToken).not.toHaveBeenCalled();
  });

  it('500 genérico quando o banco falha, sem vazar o detalhe', async () => {
    clientes.buscarAtivoPorCpf.mockRejectedValue(new Error('senha errada para oficina_auth'));
    const resposta = await handler(evento({ cpf: '52998224725' }));
    expect(resposta.statusCode).toBe(500);
    expect(resposta.body).not.toContain('oficina_auth');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('oficina_auth'));
  });
});
