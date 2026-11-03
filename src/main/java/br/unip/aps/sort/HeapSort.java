package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

/**
 * Heap Sort: organiza a lista como um heap máximo (árvore binária guardada no próprio vetor, em que
 * cada pai é maior ou igual aos filhos) e, repetidamente, leva a raiz — o maior elemento — para o fim.
 *
 * <p>Num vetor indexado a partir de 0, os filhos do nó {@code i} ficam em {@code 2i+1} e {@code 2i+2}.
 *
 * <ul>
 *   <li>Complexidade: O(n log n) em todos os casos, sem memória extra.</li>
 *   <li>Estável: não.</li>
 *   <li>Trocas contadas: cada troca de dois elementos (na construção do heap, ao mover a raiz para o
 *       fim e ao descer um elemento na árvore).</li>
 * </ul>
 */
public class HeapSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Heap Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        Comparator<T> contando = (a, b) -> {
            metricas.incrementaComparacoes();
            return comparador.compare(a, b);
        };

        int n = lista.size();

        // 1) constrói o heap máximo, de baixo para cima, a partir do último nó que tem filhos
        for (int i = n / 2 - 1; i >= 0; i--) {
            descer(lista, i, n, contando, metricas);
        }

        // 2) leva o maior (raiz) para o fim e reorganiza o heap no que sobrou
        for (int fim = n - 1; fim > 0; fim--) {
            trocar(lista, 0, fim, metricas);
            descer(lista, 0, fim, contando, metricas);
        }
    }

    /** Desce o elemento da posição {@code i} até que ele seja maior ou igual aos filhos. */
    private <T> void descer(List<T> lista, int i, int tamanho, Comparator<T> cmp, Metricas metricas) {
        while (true) {
            int esquerdo = 2 * i + 1;
            int direito = esquerdo + 1;
            int maior = i;

            if (esquerdo < tamanho && cmp.compare(lista.get(esquerdo), lista.get(maior)) > 0) {
                maior = esquerdo;
            }
            if (direito < tamanho && cmp.compare(lista.get(direito), lista.get(maior)) > 0) {
                maior = direito;
            }
            if (maior == i) {
                return;
            }
            trocar(lista, i, maior, metricas);
            i = maior;
        }
    }

    private static <T> void trocar(List<T> lista, int i, int j, Metricas metricas) {
        T aux = lista.get(i);
        lista.set(i, lista.get(j));
        lista.set(j, aux);
        metricas.incrementaTrocas();
    }
}
