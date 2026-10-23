/**
 * Normaliza e valida um CPF. Aceita com ou sem máscara ("529.982.247-25" ou
 * "52998224725") e devolve só os dígitos, que é como o oficina-app grava o
 * `documento`. Devolve null se não for um CPF válido.
 *
 * Mesma regra do value object `Documento` do oficina-app: 11 dígitos, não
 * todos iguais e com os dois dígitos verificadores certos.
 */
export function normalizarCpf(entrada: unknown): string | null {
  if (typeof entrada !== 'string') {
    return null;
  }
  const cpf = entrada.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return null;
  }
  const digito = (ateIndice: number, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < ateIndice; i++) {
      soma += Number(cpf[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const valido =
    digito(9, 10) === Number(cpf[9]) && digito(10, 11) === Number(cpf[10]);
  return valido ? cpf : null;
}
