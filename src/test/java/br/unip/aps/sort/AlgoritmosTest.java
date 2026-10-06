package br.unip.aps.sort;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlgoritmosTest {

    // TODO: tirar o @Disabled quando o BubbleSort estiver pronto
    @Disabled("BubbleSort ainda não implementado")
    @Test
    void bubbleSortOrdenaIgualAoJava() {
        verificaOrdenacao(new BubbleSort());
    }

    /** Compara o resultado do algoritmo com o sort pronto do Java (usado só como gabarito). */
    private void verificaOrdenacao(AlgoritmoOrdenacao algoritmo) {
        List<Integer> numeros = new Random(42).ints(500, 0, 1000).boxed().toList();

        List<Integer> esperado = new ArrayList<>(numeros);
        esperado.sort(Comparator.naturalOrder());

        List<Integer> obtido = new ArrayList<>(numeros);
        Metricas metricas = new Metricas();
        algoritmo.ordenar(obtido, Comparator.naturalOrder(), metricas);

        assertEquals(esperado, obtido);
        assertTrue(metricas.getComparacoes() > 0, "nenhuma comparação foi contada");
    }
}
