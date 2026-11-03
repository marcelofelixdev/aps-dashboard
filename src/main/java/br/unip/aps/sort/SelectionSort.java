package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

/**
 * Selection Sort: a cada passada procura o menor elemento da parte ainda não ordenada e o coloca
 * na próxima posição.
 *
 * <ul>
 *   <li>Complexidade: O(n²) em todos os casos — faz sempre n(n-1)/2 comparações, mesmo com a
 *       lista já ordenada.</li>
 *   <li>Estável: não (a troca pode pular um elemento igual que estava antes).</li>
 *   <li>Trocas contadas: no máximo n-1, uma por passada — é o algoritmo que menos move dados.</li>
 * </ul>
 */
public class SelectionSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Selection Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        Comparator<T> contando = (a, b) -> {
            metricas.incrementaComparacoes();
            return comparador.compare(a, b);
        };

        int n = lista.size();
        for (int i = 0; i < n - 1; i++) {
            int menor = i;
            for (int j = i + 1; j < n; j++) {
                if (contando.compare(lista.get(j), lista.get(menor)) < 0) {
                    menor = j;
                }
            }
            if (menor != i) {
                T aux = lista.get(i);
                lista.set(i, lista.get(menor));
                lista.set(menor, aux);
                metricas.incrementaTrocas();
            }
        }
    }
}
