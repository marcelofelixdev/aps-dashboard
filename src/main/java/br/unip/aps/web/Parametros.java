package br.unip.aps.web;

import br.unip.aps.sort.Algoritmo;
import br.unip.aps.sort.Criterio;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Converte e valida os parâmetros das requisições. Não depende do Javalin, então dá para testar
 * sem subir o servidor.
 *
 * <p>É tolerante na forma de escrever: {@code municipio}, {@code Município} e {@code MUNICIPIO}
 * valem o mesmo; {@code merge}, {@code MergeSort} e {@code MERGE_SORT} também.
 */
public final class Parametros {

    private Parametros() {
    }

    /** Parâmetro ausente ou inválido. Vira resposta HTTP 400. */
    public static class ParametroInvalidoException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public ParametroInvalidoException(String mensagem) {
            super(mensagem);
        }
    }

    public static Criterio criterio(String valor) {
        String v = normalizar(obrigatorio(valor, "criterio", Criterio.values()));
        for (Criterio c : Criterio.values()) {
            if (c.name().equals(v)) {
                return c;
            }
        }
        throw invalido("criterio", valor, Criterio.values());
    }

    public static Algoritmo algoritmo(String valor) {
        String v = normalizar(obrigatorio(valor, "algoritmo", Algoritmo.values()));
        if (v.endsWith("SORT")) {
            v = v.substring(0, v.length() - 4);
        }
        for (Algoritmo a : Algoritmo.values()) {
            if (a.name().equals(v)) {
                return a;
            }
        }
        throw invalido("algoritmo", valor, Algoritmo.values());
    }

    /**
     * Ano opcional. Ausente, vazio ou "todos" → {@code null} (todos os anos).
     */
    public static Integer ano(String valor, List<Integer> disponiveis) {
        if (valor == null || valor.isBlank() || valor.trim().equalsIgnoreCase("todos")) {
            return null;
        }
        int ano;
        try {
            ano = Integer.parseInt(valor.trim());
        } catch (NumberFormatException e) {
            throw new ParametroInvalidoException(
                    "'ano' deve ser um número (ex.: 2024) ou 'todos'; recebido: '" + valor + "'");
        }
        if (!disponiveis.contains(ano)) {
            throw new ParametroInvalidoException(
                    "não há dados de " + ano + ". Anos disponíveis: " + disponiveis);
        }
        return ano;
    }

    /** Inteiro opcional entre {@code min} e {@code max}; ausente → {@code padrao}. */
    public static int inteiro(String valor, String nome, int padrao, int min, int max) {
        if (valor == null || valor.isBlank()) {
            return padrao;
        }
        try {
            int n = Integer.parseInt(valor.trim());
            if (n < min || n > max) {
                throw new ParametroInvalidoException(
                        "'" + nome + "' deve estar entre " + min + " e " + max + "; recebido: " + n);
            }
            return n;
        } catch (NumberFormatException e) {
            throw new ParametroInvalidoException("'" + nome + "' deve ser um número; recebido: '" + valor + "'");
        }
    }

    // ---------- auxiliares ----------

    private static String obrigatorio(String valor, String nome, Enum<?>[] aceitos) {
        if (valor == null || valor.isBlank()) {
            throw new ParametroInvalidoException(
                    "parâmetro '" + nome + "' é obrigatório. Valores aceitos: " + lista(aceitos));
        }
        return valor;
    }

    private static ParametroInvalidoException invalido(String nome, String valor, Enum<?>[] aceitos) {
        return new ParametroInvalidoException(
                "valor inválido para '" + nome + "': '" + valor + "'. Valores aceitos: " + lista(aceitos));
    }

    /** "Município Sort" → "MUNICIPIOSORT": sem acento, maiúsculo, sem espaço/hífen/sublinhado. */
    private static String normalizar(String valor) {
        String semAcento = Normalizer.normalize(valor.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.toUpperCase(Locale.ROOT).replaceAll("[\\s_-]", "");
    }

    private static String lista(Enum<?>[] valores) {
        return Arrays.stream(valores).map(Enum::name).collect(Collectors.joining(", "));
    }
}
