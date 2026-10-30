package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

/**
 * Bubble Sort: percorre a lista várias vezes trocando vizinhos fora de ordem; a cada passada o maior
 * elemento restante "borbulha" para o fim.
 *
 * <ul>
 *   <li>Complexidade: O(n²) no pior e no caso médio; O(n) no melhor caso (lista já ordenada),
 *       graças à parada antecipada quando uma passada não troca nada.</li>
 *   <li>Estável: sim (só troca quando o da esquerda é estritamente maior).</li>
 *   <li>Trocas contadas: cada troca entre vizinhos.</li>
 * </ul>
 */
public class BubbleSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Bubble Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        Comparator<T> contando = (a, b) -> {
            metricas.incrementaComparacoes();
            return comparador.compare(a, b);
        };

        int n = lista.size();
        for (int fim = n - 1; fim > 0; fim--) {
            boolean trocou = false;
            for (int i = 0; i < fim; i++) {
                if (contando.compare(lista.get(i), lista.get(i + 1)) > 0) {
                    trocar(lista, i, i + 1);
                    metricas.incrementaTrocas();
                    trocou = true;
                }
            }
            if (!trocou) {
                return; // nenhuma troca: já está ordenada
            }
        }
    }

    private static <T> void trocar(List<T> lista, int i, int j) {
        T aux = lista.get(i);
        lista.set(i, lista.get(j));
        lista.set(j, aux);
    }
}
