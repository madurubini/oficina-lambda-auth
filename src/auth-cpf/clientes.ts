import { Pool } from 'pg';
import { log } from '../compartilhado/log';

/** O que a Lambda precisa saber do cliente para emitir o token. */
export interface ClienteAtivo {
  id: string;
}

export interface Clientes {
  /** Cliente pessoa física (CPF) e ativo com esse documento, ou null. */
  buscarAtivoPorCpf(cpf: string): Promise<ClienteAtivo | null>;
}

export interface ConfigBanco {
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  senha: string;
  /** Schema do ambiente (homolog ou prod): é o que separa os dados no mesmo RDS. */
  schema: string;
}

/**
 * Lê a tabela `cliente` do oficina-app direto no RDS, com o usuário
 * `oficina_auth`, que só tem SELECT nela (menor privilégio).
 *
 * O pool fica fora do handler: a Lambda reaproveita a conexão entre
 * invocações enquanto o container estiver quente. `max: 1` porque cada
 * container atende uma requisição por vez.
 */
export class ClientesPostgres implements Clientes {
  private readonly pool: Pool;

  constructor(config: ConfigBanco) {
    this.pool = new Pool({
      host: config.host,
      port: config.porta,
      database: config.banco,
      user: config.usuario,
      password: config.senha,
      // O schema entra como opção da conexão, não concatenado no SQL.
      options: `-c search_path=${config.schema}`,
      // O RDS exige TLS. Sem o pacote de CAs da AWS embutido, o tráfego é
      // cifrado mas o certificado não é conferido; o banco só existe dentro
      // da VPC, o que limita quem poderia se passar por ele.
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    // O RDS pode fechar a conexão parada enquanto o container dorme. O pg avisa
    // com um evento 'error' no pool; sem quem o escute, o processo da Lambda cai.
    // A próxima consulta abre outra conexão sozinha.
    this.pool.on('error', (falha) => {
      log('warn', 'Conexão ociosa com o banco perdida', { erro: falha.message });
    });
  }

  async buscarAtivoPorCpf(cpf: string): Promise<ClienteAtivo | null> {
    const resultado = await this.pool.query<ClienteAtivo>(
      `SELECT id FROM cliente
        WHERE documento = $1 AND "tipoDocumento" = 'CPF' AND ativo = true
        LIMIT 1`,
      [cpf],
    );
    return resultado.rows[0] ?? null;
  }
}
