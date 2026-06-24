<?php
// Разрешаем запросы (на всякий случай)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

// Просто скачиваем актуальный JSON с твоего гитхаба и отдаем его
$json = file_get_contents("https://raw.githubusercontent.com/ilnursultan/olotau/main/data.json");
echo $json;
?>
