package br.unip.aps.service;

import br.unip.aps.model.FocoIncendio;
import br.unip.aps.service.OrdenacaoService.ResultadoOrdenacao;
import br.unip.aps.sort.Algoritmo;
import br.unip.aps.sort.Criterio;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrdenacaoServiceTest {

    private static FocoIncendio foco(long id, String data, String municipio, String bioma) {
        return new FocoIncendio(id, "f" + id, -22.0, -47.0, LocalDateTime.parse(data), municipio, bioma);
    }

    private final List<FocoIncendio> focos = new ArrayList<>(List.of(
            foco(1, "2024-03-10T14:00", "ZACARIAS", "Cerrado"),
            foco(2, "2023-08-01T10:00", "ÁGUAS DE LINDÓIA", "Mata Atlântica"),
            foco(3, "2024-01-05T09:00", "AVARÉ", "Cerrado"),
            foco(4, "2023-02-20T16:30", "AVARÉ", "Mata Atlântica")
    ));

    @Test
    void ordenaEDevolveMetricas() {
        OrdenacaoService service = new OrdenacaoService(focos);
        ResultadoOrdenacao r = service.ordenar(Criterio.MUNICIPIO, Algoritmo.MERGE, null);

        assertEquals("Merge Sort", r.algoritmo());
        assertEquals("MUNICIPIO", r.criterio());
        assertEquals(4, r.total());
        assertEquals(List.of("ÁGUAS DE LINDÓIA", "AVARÉ", "AVARÉ", "ZACARIAS"),
                r.dados().stream().map(OrdenacaoService.FocoDto::municipio).toList());
        assertTrue(r.comparacoes() > 0);
        assertTrue(r.tempoMs() >= 0);
    }

    @Test
    void naoAlteraAListaOriginalEntreRequisicoes() {
        OrdenacaoService service = new OrdenacaoService(focos);
        ResultadoOrdenacao primeira = service.ordenar(Criterio.DATA, Algoritmo.INSERTION, null);
        ResultadoOrdenacao segunda = service.ordenar(Criterio.DATA, Algoritmo.INSERTION, null);

        // se a lista original tivesse sido ordenada, a segunda execução faria menos trocas
        assertEquals(primeira.trocas(), segunda.trocas());
        assertEquals(primeira.comparacoes(), segunda.comparacoes());
        assertTrue(primeira.trocas() > 0);
        assertEquals(1L, focos.get(0).idBdq(), "lista recebida pelo serviço não pode mudar");
    }

    @Test
    void filtraPorAno() {
        OrdenacaoService service = new OrdenacaoService(focos);
        ResultadoOrdenacao r = service.ordenar(Criterio.DATA, Algoritmo.QUICK, 2023);

        assertEquals(2023, r.ano());
        assertEquals(2, r.total());
        assertEquals(List.of("2023-02-20T16:30:00", "2023-08-01T10:00:00"),
                r.dados().stream().map(OrdenacaoService.FocoDto::dataHora).toList());
    }

    @Test
    void anosDisponiveisEmOrdem() {
        assertEquals(List.of(2023, 2024), new OrdenacaoService(focos).anosDisponiveis());
    }


    @Test
    void comparaTodosOsAlgoritmosEValidaResultados() {
        OrdenacaoService service = new OrdenacaoService(focos);

        var resultado = service.comparar(Criterio.DATA, 3);

        assertEquals("DATA", resultado.criterio());
        assertEquals(4, resultado.totalBase());
        assertEquals(3, resultado.tamanhoAmostra());
        assertEquals(3, resultado.repeticoes());
        assertEquals(Algoritmo.values().length, resultado.resultados().size());

        resultado.resultados().forEach(r -> {
            assertTrue(r.ordenado(), r.algoritmo() + " deveria ordenar corretamente");
            assertEquals(3, r.repeticoes());
            assertTrue(r.comparacoes() >= 0);
            assertTrue(r.trocas() >= 0);
            assertTrue(r.duracaoNsMediana() >= 0);
            assertTrue(r.duracaoMsMediana() >= 0);
        });
    }

    @Test
    void amostraZeroUtilizaTodosOsRegistros() {
        OrdenacaoService service = new OrdenacaoService(focos);

        var resultado = service.comparar(Criterio.BIOMA, 0);

        assertEquals(focos.size(), resultado.tamanhoAmostra());
        assertEquals(focos.size(), resultado.totalBase());
        assertTrue(resultado.resultados().stream().allMatch(r -> r.ordenado()));
    }

    @Test
    void todosOsAlgoritmosDaoAMesmaOrdemNosCriterios() {
        OrdenacaoService service = new OrdenacaoService(focos);
        for (Criterio c : Criterio.values()) {
            List<String> referencia = null;
            for (Algoritmo a : Algoritmo.values()) {
                List<String> ordem = service.ordenar(c, a, null).dados().stream()
                        .map(d -> d.dataHora() + d.municipio()).toList();
                if (referencia == null) {
                    referencia = ordem;
                }
                assertEquals(referencia, ordem, a + " por " + c);
            }
        }
    }
}
