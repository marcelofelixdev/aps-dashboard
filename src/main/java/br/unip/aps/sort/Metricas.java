package br.unip.aps.sort;

/**
 * Contadores de operações de uma execução de ordenação.
 */
public class Metricas {

    private long comparacoes;
    private long trocas;

    public void incrementaComparacoes() {
        comparacoes++;
    }

    public void incrementaTrocas() {
        trocas++;
    }

    public long getComparacoes() {
        return comparacoes;
    }

    public long getTrocas() {
        return trocas;
    }
}
