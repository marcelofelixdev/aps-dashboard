package br.unip.aps.io;

import br.unip.aps.model.FocoIncendio;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LeitorCsvTest {

    private static final String CABECALHO = "id_bdq,foco_id,lat,lon,data_pas,pais,estado,municipio,bioma";

    @Test
    void leOsArquivosReaisDoInpe() throws IOException {
        LeitorCsv leitor = new LeitorCsv();
        assertEquals(1666, leitor.ler(Path.of("data", "focos_br_sp_ref_2023.csv")).size());
        assertEquals(0, leitor.getLinhasIgnoradas());
        assertEquals(8712, leitor.ler(Path.of("data", "focos_br_sp_ref_2024.csv")).size());
        assertEquals(0, leitor.getLinhasIgnoradas());
    }

    @Test
    void converteCamposComEspacosEAcentos() throws IOException {
        LeitorCsv leitor = new LeitorCsv();
        List<FocoIncendio> focos = leitor.ler(Path.of("data", "focos_br_sp_ref_2024.csv"));
        FocoIncendio primeiro = focos.get(0);

        assertEquals(1666218606L, primeiro.idBdq());
        assertEquals(-21.931340, primeiro.latitude(), 1e-9);
        assertEquals(-47.271460, primeiro.longitude(), 1e-9);
        assertEquals(LocalDateTime.of(2024, 1, 2, 17, 4), primeiro.dataHora());
        assertEquals("SANTA CRUZ DAS PALMEIRAS", primeiro.municipio());
        assertEquals("Mata Atlântica", primeiro.bioma());
    }

    @Test
    void ignoraLinhasQuebradasEContaQuantas(@TempDir Path pasta) throws IOException {
        Path csv = pasta.resolve("teste.csv");
        Files.writeString(csv, String.join("\n",
                CABECALHO,
                " 1 ,a,  -21.9 ,  -47.2 ,2024-01-02 17:04:00,Brasil,SÃO PAULO,ORLÂNDIA,Cerrado",
                "2,b,-21.9,-47.2,2024-01-02 17:04:00,Brasil,SÃO PAULO,ORLÂNDIA",              // falta coluna
                "x,c,-21.9,-47.2,2024-01-02 17:04:00,Brasil,SÃO PAULO,ORLÂNDIA,Cerrado",      // id inválido
                "4,d,-21.9,-47.2,02/01/2024,Brasil,SÃO PAULO,ORLÂNDIA,Cerrado",               // data inválida
                "5,e,-21.9,-47.2,2024-01-02 17:04:00,Brasil,SÃO PAULO,,Cerrado",              // município vazio
                "",                                                                          // linha em branco
                "6,f,-22.0,-48.0,2024-01-03 10:00:00,Brasil,SÃO PAULO,AVARÉ,Mata Atlântica"
        ), StandardCharsets.UTF_8);

        LeitorCsv leitor = new LeitorCsv();
        List<FocoIncendio> focos = leitor.ler(csv);

        assertEquals(List.of(1L, 6L), focos.stream().map(FocoIncendio::idBdq).toList());
        assertEquals(4, leitor.getLinhasIgnoradas());
        assertTrue(leitor.getPrimeiroErro().contains("linha 3"), leitor.getPrimeiroErro());
    }

    @Test
    void arquivoInexistenteDaErroClaro() {
        IOException e = assertThrows(IOException.class,
                () -> new LeitorCsv().ler(Path.of("nao_existe.csv")));
        assertTrue(e.getMessage().contains("não encontrado"));
    }
}
