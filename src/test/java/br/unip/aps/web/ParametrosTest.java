package br.unip.aps.web;

import br.unip.aps.sort.Algoritmo;
import br.unip.aps.sort.Criterio;
import br.unip.aps.web.Parametros.ParametroInvalidoException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ParametrosTest {

    @Test
    void criterioAceitaVariasFormasDeEscrever() {
        assertEquals(Criterio.MUNICIPIO, Parametros.criterio("MUNICIPIO"));
        assertEquals(Criterio.MUNICIPIO, Parametros.criterio("município"));
        assertEquals(Criterio.DATA, Parametros.criterio(" data "));
        assertEquals(Criterio.BIOMA, Parametros.criterio("Bioma"));
    }

    @Test
    void algoritmoAceitaComOuSemSort() {
        assertEquals(Algoritmo.MERGE, Parametros.algoritmo("MERGE"));
        assertEquals(Algoritmo.MERGE, Parametros.algoritmo("merge sort"));
        assertEquals(Algoritmo.QUICK, Parametros.algoritmo("QuickSort"));
        assertEquals(Algoritmo.HEAP, Parametros.algoritmo("heap_sort"));
    }

    @Test
    void parametroAusenteOuInvalidoDaMensagemClara() {
        ParametroInvalidoException e = assertThrows(ParametroInvalidoException.class,
                () -> Parametros.criterio(null));
        assertTrue(e.getMessage().contains("obrigatório"), e.getMessage());
        assertTrue(e.getMessage().contains("DATA, BIOMA, MUNICIPIO"), e.getMessage());

        e = assertThrows(ParametroInvalidoException.class, () -> Parametros.algoritmo("shell"));
        assertTrue(e.getMessage().contains("'shell'"), e.getMessage());
        assertTrue(e.getMessage().contains("BUBBLE"), e.getMessage());
    }

    @Test
    void ano() {
        List<Integer> anos = List.of(2023, 2024);
        assertEquals(null, Parametros.ano(null, anos));
        assertEquals(null, Parametros.ano("", anos));
        assertEquals(null, Parametros.ano("todos", anos));
        assertEquals(2024, Parametros.ano("2024", anos));
        assertThrows(ParametroInvalidoException.class, () -> Parametros.ano("2019", anos));
        assertThrows(ParametroInvalidoException.class, () -> Parametros.ano("abc", anos));
    }

    @Test
    void inteiro() {
        assertEquals(10, Parametros.inteiro(null, "top", 10, 1, 100));
        assertEquals(5, Parametros.inteiro("5", "top", 10, 1, 100));
        assertThrows(ParametroInvalidoException.class, () -> Parametros.inteiro("0", "top", 10, 1, 100));
        assertThrows(ParametroInvalidoException.class, () -> Parametros.inteiro("x", "top", 10, 1, 100));
    }
}
