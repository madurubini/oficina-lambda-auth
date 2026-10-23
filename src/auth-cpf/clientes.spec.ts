import { Pool } from 'pg';
import { ClientesPostgres } from './clientes';

jest.mock('pg', () => ({ Pool: jest.fn() }));

describe('ClientesPostgres', () => {
  const query = jest.fn();

  beforeEach(() => {
    query.mockReset();
    (Pool as unknown as jest.Mock).mockImplementation(() => ({ query }));
  });

  const config = {
    host: 'db.interno',
    porta: 5432,
    banco: 'oficina',
    usuario: 'oficina_auth',
    senha: 's',
    schema: 'homolog',
  };

  it('conecta no schema do ambiente, com TLS e uma conexão só', () => {
    new ClientesPostgres(config);
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'db.interno',
        user: 'oficina_auth',
        options: '-c search_path=homolog',
        ssl: { rejectUnauthorized: false },
        max: 1,
      }),
    );
  });

  it('busca só cliente pessoa física e ativo, com o CPF como parâmetro', async () => {
    query.mockResolvedValue({ rows: [{ id: 'cli-1' }] });
    const clientes = new ClientesPostgres(config);

    await expect(clientes.buscarAtivoPorCpf('52998224725')).resolves.toEqual({
      id: 'cli-1',
    });
    const [sql, parametros] = query.mock.calls[0];
    expect(sql).toContain(`"tipoDocumento" = 'CPF'`);
    expect(sql).toContain('ativo = true');
    expect(parametros).toEqual(['52998224725']);
  });

  it('devolve null quando não encontra', async () => {
    query.mockResolvedValue({ rows: [] });
    const clientes = new ClientesPostgres(config);
    await expect(clientes.buscarAtivoPorCpf('52998224725')).resolves.toBeNull();
  });
});
