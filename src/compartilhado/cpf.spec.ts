import { normalizarCpf } from './cpf';

describe('normalizarCpf', () => {
  it('aceita CPF válido sem máscara', () => {
    expect(normalizarCpf('52998224725')).toBe('52998224725');
  });

  it('aceita CPF válido com máscara e devolve só os dígitos', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725');
  });

  it('aceita CPF cujo dígito verificador é 0', () => {
    expect(normalizarCpf('11144477735')).toBe('11144477735');
  });

  it.each([
    ['dígito verificador errado', '52998224726'],
    ['todos os dígitos iguais', '11111111111'],
    ['curto demais', '1234567890'],
    ['comprido demais (CNPJ)', '11222333000181'],
    ['vazio', ''],
  ])('recusa %s', (_caso, cpf) => {
    expect(normalizarCpf(cpf)).toBeNull();
  });

  it.each([[undefined], [null], [52998224725], [{}]])(
    'recusa o que não é texto (%p)',
    (valor) => {
      expect(normalizarCpf(valor)).toBeNull();
    },
  );
});
