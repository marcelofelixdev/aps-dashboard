package br.unip.aps.sort;

import java.util.Comparator;
import java.util.List;

/**
 * Contrato comum de todos os algoritmos de ordenação do projeto.
 *
 * Cada implementação ordena a lista no lugar e registra em {@code metricas}
 * quantas comparações e trocas fez.
 */
public interface AlgoritmoOrdenacao {

    String nome();

    <T> void ordenar(List<T> lista, Comparator<T> comparador, Metricas metricas);
}
