<?php
header('Content-Type: application/json; charset=utf-8');

$destino = 'elissa.lorenzi@gmail.com';

function limpar($v) {
    return htmlspecialchars(strip_tags(trim($v ?? '')));
}

$nome            = limpar($_POST['nome'] ?? '');
$data_nasc       = limpar($_POST['data_nascimento'] ?? '');
$cpf             = limpar($_POST['cpf'] ?? '');
$email           = limpar($_POST['email'] ?? '');
$celular         = limpar($_POST['celular'] ?? '');
$whatsapp        = limpar($_POST['whatsapp'] ?? '');
$endereco        = limpar($_POST['endereco'] ?? '');
$forma_pgto      = limpar($_POST['forma_pgto'] ?? '');
$nome_resp       = limpar($_POST['nome_responsavel'] ?? '');
$cpf_resp        = limpar($_POST['cpf_responsavel'] ?? '');
$aceite          = $_POST['aceite'] ?? '';

if (!$nome || !$cpf || !$celular || $aceite !== '1') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'Campos obrigatórios não preenchidos.']);
    exit;
}

$assunto = "Novo Contrato Assinado — $nome";

$corpo  = "=== NOVO CONTRATO DE ORIENTAÇÃO PROFISSIONAL ===\n\n";
$corpo .= "Nome:             $nome\n";
$corpo .= "Data nascimento:  $data_nasc\n";
$corpo .= "CPF:              $cpf\n";
$corpo .= "E-mail:           $email\n";
$corpo .= "Celular:          $celular\n";
$corpo .= "WhatsApp:         $whatsapp\n";
$corpo .= "Endereço:         $endereco\n";
$corpo .= "Forma de pgto:    $forma_pgto\n";

if ($nome_resp) {
    $corpo .= "\n--- Responsável ---\n";
    $corpo .= "Nome:  $nome_resp\n";
    $corpo .= "CPF:   $cpf_resp\n";
}

$corpo .= "\n✅ O cliente concordou com os termos do contrato.\n";
$corpo .= "Data/hora: " . date('d/m/Y H:i') . "\n";

$cabecalhos  = "From: contrato@sgblindados.com.br\r\n";
$cabecalhos .= "Reply-To: $email\r\n";
$cabecalhos .= "Content-Type: text/plain; charset=UTF-8\r\n";

$enviou = mail($destino, $assunto, $corpo, $cabecalhos);

if ($enviou) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'erro' => 'Falha ao enviar. Tente novamente.']);
}
