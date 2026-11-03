package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

/**
 * Quick Sort: escolhe um pivô, separa a lista em "menores ou iguais" e "maiores ou iguais" a ele
 * (partição) e ordena cada parte recursivamente.
 *
 * <p>Escolhas desta implementação:
 * <ul>
 *   <li><b>Pivô pela mediana de três</b> (início, meio e fim). Os CSVs do INPE já vêm ordenados por
 *       data; com o pivô fixo no último elemento, ordenar por DATA cairia no pior caso O(n²) e a
 *       recursão estouraria a pilha.</li>
 *   <li><b>Partição de Hoare</b>, que lida bem com muitos elementos iguais.</li>
 *   <li><b>Recursão só na parte menor</b> (a maior é tratada no laço), o que limita a profundidade
 *       da pilha a O(log n).</li>
 * </ul>
 *
 * <ul>
 *   <li>Complexidade: O(n log n) no caso médio; O(n²) no pior caso (raro com mediana de três).</li>
 *   <li>Estável: não.</li>
 *   <li>Trocas contadas: cada troca de dois elementos (na partição e na mediana de três).</li>
 * </ul>
 */
public class QuickSort implements AlgoritmoOrdenacao {

    @Override
    public String nome() {
        return "Quick Sort";
    }

    @Override
    public <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas) {
        Comparator<T> contando = (a, b) -> {
            metricas.incrementaComparacoes();
            return comparador.compare(a, b);
        };
        quickSort(lista, 0, lista.size() - 1, contando, metricas);
    }

    private <T> void quickSort(List<T> lista, int inicio, int fim, Comparator<T> cmp, Metricas metricas) {
        while (inicio < fim) {
            int p = particionar(lista, inicio, fim, cmp, metricas);
            // recursão na parte menor, laço na maior
            if (p - inicio < fim - p) {
                quickSort(lista, inicio, p, cmp, metricas);
                inicio = p + 1;
            } else {
                quickSort(lista, p + 1, fim, cmp, metricas);
                fim = p;
            }
        }
    }

    /**
     * Partição de Hoare. Ao final, tudo em [inicio, j] é ≤ pivô e tudo em [j+1, fim] é ≥ pivô.
     */
    private <T> int particionar(List<T> lista, int inicio, int fim, Comparator<T> cmp, Metricas metricas) {
        int meio = inicio + (fim - inicio) / 2;

        // mediana de três: deixa inicio ≤ meio ≤ fim
        if (cmp.compare(lista.get(meio), lista.get(inicio)) < 0) trocar(lista, meio, inicio, metricas);
        if (cmp.compare(lista.get(fim), lista.get(inicio)) < 0) trocar(lista, fim, inicio, metricas);
        if (cmp.compare(lista.get(fim), lista.get(meio)) < 0) trocar(lista, fim, meio, metricas);

        T pivo = lista.get(meio);
        int i = inicio - 1;
        int j = fim + 1;
        while (true) {
            do {
                i++;
            } while (cmp.compare(lista.get(i), pivo) < 0);
            do {
                j--;
            } while (cmp.compare(lista.get(j), pivo) > 0);
            if (i >= j) {
                return j;
            }
            trocar(lista, i, j, metricas);
        }
    }

    private static <T> void trocar(List<T> lista, int i, int j, Metricas metricas) {
        T aux = lista.get(i);
        lista.set(i, lista.get(j));
        lista.set(j, aux);
        metricas.incrementaTrocas();
    }
}
