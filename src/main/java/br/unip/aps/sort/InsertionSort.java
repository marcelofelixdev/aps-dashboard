package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

/**
 * Insertion Sort: mantém o início da lista ordenado e insere cada novo elemento na posição certa,
 * deslocando para a direita os maiores que ele (como quem organiza cartas na mão).
 *
 * <ul>
 *   <li>Complexidade: O(n²) no pior e no caso médio; O(n) no melhor caso (lista já ordenada),
 *       quando cada elemento é comparado só com o anterior.</li>
 *   <li>Estável: sim (para de deslocar ao encontrar um elemento igual).</li>
 *   <li>Trocas contadas: cada deslocamento de um elemento uma posição para a direita.
 *       Em uma lista já ordenada são zero.</li>
 * </ul>
 */
public class InsertionSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Insertion Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        Comparator<T> contando = (a, b) -> {
            metricas.incrementaComparacoes();
            return comparador.compare(a, b);
        };

        for (int i = 1; i < lista.size(); i++) {
            T atual = lista.get(i);
            int j = i - 1;
            while (j >= 0 && contando.compare(lista.get(j), atual) > 0) {
                lista.set(j + 1, lista.get(j)); // desloca o maior para a direita
                metricas.incrementaTrocas();
                j--;
            }
            if (j + 1 != i) {
                lista.set(j + 1, atual);
            }
        }
    }
}
