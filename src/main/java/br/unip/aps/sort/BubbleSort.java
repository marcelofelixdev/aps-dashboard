package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

public class BubbleSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Bubble Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        // TODO: implementar
        //  - embrulhar o comparador para contar comparações (metricas.incrementaComparacoes())
        //  - a cada troca de posição: metricas.incrementaTrocas()
        throw new UnsupportedOperationException("BubbleSort ainda não implementado");
    }
}
