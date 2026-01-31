/**
 * Projeto: Conexão Socorro - Mestrado Profissional UFRR
 * Autor: Lucivaldo Oliveira Barroso
 * Versão: 3.0 - Suporte a Subcategorias e Geolocalização Avançada
 */

function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'true') {
     return retornarJson();
  }
  
  if (e && e.parameter && e.parameter.log === 'true') {
     return registrarAcesso(
       e.parameter.idioma, 
       e.parameter.modulo, 
       e.parameter.local, 
       e.parameter.dispositivo
     );
  }

  try {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('Conexão Socorro')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  } catch (error) {
    return retornarJson();
  }
}

function retornarJson() {
  try {
    const data = buscarConteudo();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buscarConteudo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("contApp"); 
    const dados = sheet.getDataRange().getValues();
    return dados;
  } catch (e) {
    console.log("Erro ao buscar dados: " + e.toString());
    return [["ID", "Idioma", "Categoria", "SubCategoria", "Texto", "Audio", "Visual", "YouTube"]];
  }
}

/**
 * Registra logs de uso para análise da tese
 * @param {string} idioma - Idioma selecionado
 * @param {string} modulo - Categoria e Subcategoria (ex: Engasgo/Adulto)
 * @param {string} local - Localização aproximada (Cidade/Bairro ou Coordenadas)
 * @param {string} dispositivo - Tipo de dispositivo (Computador/Celular/Tablet)
 */
function registrarAcesso(idioma, modulo, local, dispositivo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("usuario");
    
    sheet.appendRow([
      new Date(), 
      idioma || "N/A",     
      modulo || "N/A",     
      local || "Localização não autorizada",
      dispositivo || "Desconhecido"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
