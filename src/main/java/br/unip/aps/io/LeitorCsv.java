package br.unip.aps.io;

import br.unip.aps.model.FocoIncendio;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Lê os arquivos CSV do INPE e transforma cada linha em um {@link FocoIncendio}.
 *
 * <p>Formato esperado (com cabeçalho):
 * <pre>id_bdq,foco_id,lat,lon,data_pas,pais,estado,municipio,bioma</pre>
 *
 * <p>Linhas quebradas (número errado de colunas, número ou data inválidos, campo obrigatório vazio)
 * não interrompem a leitura: são ignoradas e contadas em {@link #getLinhasIgnoradas()}, e a primeira
 * delas fica guardada em {@link #getPrimeiroErro()} para ajudar a diagnosticar o problema.
 */
public class LeitorCsv {

    private static final int TOTAL_COLUNAS = 9;
    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private int linhasIgnoradas;
    private String primeiroErro;

    /**
     * Lê um arquivo CSV do INPE.
     *
     * @param arquivo caminho do CSV
     * @return focos válidos, na mesma ordem do arquivo
     * @throws IOException se o arquivo não existir ou não puder ser lido
     */
    public List<FocoIncendio> ler(Path arquivo) throws IOException {
        linhasIgnoradas = 0;
        primeiroErro = null;

        if (!Files.isRegularFile(arquivo)) {
            throw new IOException("Arquivo não encontrado: " + arquivo.toAbsolutePath());
        }

        List<String> linhas = Files.readAllLines(arquivo, StandardCharsets.UTF_8);
        List<FocoIncendio> focos = new ArrayList<>(Math.max(0, linhas.size() - 1));

        // i = 1 pula o cabeçalho
        for (int i = 1; i < linhas.size(); i++) {
            String linha = linhas.get(i);
            if (linha.isBlank()) {
                continue;
            }
            try {
                focos.add(converter(linha));
            } catch (IllegalArgumentException | DateTimeParseException e) {
                linhasIgnoradas++;
                if (primeiroErro == null) {
                    primeiroErro = arquivo.getFileName() + ", linha " + (i + 1) + ": " + e.getMessage();
                }
            }
        }
        return focos;
    }

    /** Converte uma linha do CSV. Lança IllegalArgumentException se a linha estiver quebrada. */
    FocoIncendio converter(String linha) {
        String[] campos = linha.split(",", -1);
        if (campos.length != TOTAL_COLUNAS) {
            throw new IllegalArgumentException(
                    "esperava " + TOTAL_COLUNAS + " colunas, encontrou " + campos.length);
        }
        for (int c = 0; c < campos.length; c++) {
            campos[c] = campos[c].trim(); // id, lat e lon vêm com espaços
        }

        String municipio = obrigatorio(campos[7], "municipio");
        String bioma = obrigatorio(campos[8], "bioma");

        return new FocoIncendio(
                Long.parseLong(campos[0]),
                campos[1],
                Double.parseDouble(campos[2]),
                Double.parseDouble(campos[3]),
                LocalDateTime.parse(campos[4], FORMATO_DATA),
                municipio,
                bioma
        );
    }

    private static String obrigatorio(String valor, String coluna) {
        if (valor.isEmpty()) {
            throw new IllegalArgumentException("coluna '" + coluna + "' vazia");
        }
        return valor;
    }

    /** Quantas linhas foram descartadas na última leitura. */
    public int getLinhasIgnoradas() {
        return linhasIgnoradas;
    }

    /** Descrição da primeira linha descartada na última leitura, ou {@code null} se nenhuma foi. */
    public String getPrimeiroErro() {
        return primeiroErro;
    }
}
