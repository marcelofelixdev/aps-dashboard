package br.unip.aps.sort;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Merge Sort (top-down): divide a lista ao meio, ordena cada metade recursivamente e depois intercala
 * (merge) as duas metades ordenadas.
 *
 * <ul>
 *   <li>Complexidade: O(n log n) em todos os casos.</li>
 *   <li>Memória extra: O(n) para o vetor auxiliar.</li>
 *   <li>Estável: sim (no empate, pega primeiro o elemento da metade esquerda).</li>
 *   <li>Trocas contadas: o Merge não troca, ele copia. Conta-se cada elemento escrito de volta na
 *       lista durante a intercalação.</li>
 * </ul>
 */
public class MergeSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Merge Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        Comparator<T> contando = (a, b) -> {
            metricas.incrementaComparacoes();
            return comparador.compare(a, b);
        };

        List<T> aux = new ArrayList<>(lista); // vetor auxiliar, alocado uma vez só
        mergeSort(lista, aux, 0, lista.size() - 1, contando, metricas);
    }

    private <T> void mergeSort(List<T> lista, List<T> aux, int inicio, int fim,
                               Comparator<T> cmp, Metricas metricas) {
        if (inicio >= fim) {
            return;
        }
        int meio = inicio + (fim - inicio) / 2;
        mergeSort(lista, aux, inicio, meio, cmp, metricas);
        mergeSort(lista, aux, meio + 1, fim, cmp, metricas);
        intercalar(lista, aux, inicio, meio, fim, cmp, metricas);
    }

    private <T> void intercalar(List<T> lista, List<T> aux, int inicio, int meio, int fim,
                                Comparator<T> cmp, Metricas metricas) {
        for (int k = inicio; k <= fim; k++) {
            aux.set(k, lista.get(k));
        }

        int i = inicio;     // percorre a metade esquerda
        int j = meio + 1;   // percorre a metade direita
        for (int k = inicio; k <= fim; k++) {
            if (i > meio) {
                lista.set(k, aux.get(j++));
            } else if (j > fim) {
                lista.set(k, aux.get(i++));
            } else if (cmp.compare(aux.get(j), aux.get(i)) < 0) {
                lista.set(k, aux.get(j++));
            } else {
                lista.set(k, aux.get(i++)); // empate: esquerda primeiro → estável
            }
            metricas.incrementaTrocas();
        }
    }
}
