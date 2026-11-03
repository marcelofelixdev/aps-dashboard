package br.unip.aps.sort;

import java.util.function.Supplier;

/**
 * Catálogo dos algoritmos disponíveis, com as informações teóricas que o dashboard mostra.
 *
 * <p>O nome da constante é o código usado na API: {@code /api/ordenar?algoritmo=MERGE}.
 */
public enum Algoritmo {

    BUBBLE(BubbleSort::new, "O(n²)", "O(n)", true),
    INSERTION(InsertionSort::new, "O(n²)", "O(n)", true),
    SELECTION(SelectionSort::new, "O(n²)", "O(n²)", false),
    MERGE(MergeSort::new, "O(n log n)", "O(n log n)", true),
    QUICK(QuickSort::new, "O(n log n)", "O(n log n)", false),
    HEAP(HeapSort::new, "O(n log n)", "O(n log n)", false);

    private final Supplier<AlgoritmoOrdenacao> fabrica;
    private final String complexidadeMedia;
    private final String complexidadeMelhorCaso;
    private final boolean estavel;

    Algoritmo(Supplier<AlgoritmoOrdenacao> fabrica, String complexidadeMedia,
              String complexidadeMelhorCaso, boolean estavel) {
        this.fabrica = fabrica;
        this.complexidadeMedia = complexidadeMedia;
        this.complexidadeMelhorCaso = complexidadeMelhorCaso;
        this.estavel = estavel;
    }

    /** Cria uma instância nova do algoritmo. */
    public AlgoritmoOrdenacao criar() {
        return fabrica.get();
    }

    public String complexidadeMedia() {
        return complexidadeMedia;
    }

    public String complexidadeMelhorCaso() {
        return complexidadeMelhorCaso;
    }

    public boolean estavel() {
        return estavel;
    }
}
